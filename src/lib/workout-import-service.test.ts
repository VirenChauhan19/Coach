import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { ApiError } from "./api";
import { applyWorkoutImport, prepareWorkoutImport, type WorkoutImportInput } from "./workout-import-service";

const TEAM = "import-test-team";
const COACH = "import-test-coach";
const JORDAN = "import-test-jordan";
const MAYA = "import-test-maya";
const KAI = "import-test-kai";
const FOREIGN = "import-test-foreign";
const requireForTest = createRequire(import.meta.url);
let db: PrismaClient;
let directory = "";

async function input(mode: "add" | "replace" = "add", onlyJordan = false): Promise<WorkoutImportInput> {
  const book = new ExcelJS.Workbook();
  const training = book.addWorksheet("Training");
  training.addRow(["WEEK 1: 9/14-9/20"]);
  training.addRow(["GROUP", "M", "T", "W", "R", "F", "S", "S"]);
  training.addRow(["A", "40-50' EZ", "OFF", "", "", "", "", ""]);
  training.addRow(["B", "30-40' EZ", "OFF", "", "", "", "", ""]);
  const chart = book.addWorksheet("Pace Chart");
  chart.addRow(["NAME", "MILEAGE GROUP", "LR TARGET"]);
  chart.addRow(["Jordan Lee", "A", "90-100"]);
  if (!onlyJordan) chart.addRow(["Maya Chen", "B", "80-90"]);
  return {
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
    weekStart: "2026-09-14", mode, resolutions: {}, teamId: TEAM, coachId: COACH,
  };
}

async function snapshot() {
  const orderBy = { id: "asc" as const };
  return {
    teams: await db.team.findMany({ orderBy }), users: await db.user.findMany({ orderBy }),
    workouts: await db.workout.findMany({ orderBy }), assignments: await db.assignment.findMany({ orderBy }),
    feedback: await db.feedback.findMany({ orderBy }), messages: await db.message.findMany({ orderBy }),
  };
}

async function existing(id: string, date: string, athletes: string[], teamId = TEAM) {
  return db.workout.create({
    data: {
      id, title: "Original session", mainSet: "Original prescription", type: "EASY",
      date: new Date(`${date}T12:00:00.000Z`), teamId, createdById: COACH,
      assignments: { create: athletes.map((athleteId) => ({ id: `${id}-${athleteId}`, athleteId })) },
    },
    include: { assignments: true },
  });
}

async function publish(value: WorkoutImportInput) {
  return db.$transaction(async (tx) => {
    const plan = await prepareWorkoutImport(tx, value);
    assert.deepEqual(plan.preview.errors, []);
    return applyWorkoutImport(tx, value, plan);
  });
}

describe("workout import service with an isolated SQLite database", { concurrency: false }, () => {
  before(async () => {
    directory = await mkdtemp(join(tmpdir(), "scad-import-service-test-"));
    const databasePath = join(directory, "integration.db");
    const databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;
    // Prisma's Windows schema engine expects the SQLite file to exist first.
    await writeFile(databasePath, "");
    execFileSync(process.execPath, [requireForTest.resolve("prisma/build/index.js"), "db", "push", "--schema", resolve("prisma/schema.prisma"), "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
    });
    db = new PrismaClient({ datasourceUrl: databaseUrl });
    const databases = await db.$queryRawUnsafe<{ name: string; file: string }[]>("PRAGMA database_list");
    assert.equal(resolve(databases.find((entry) => entry.name === "main")!.file), resolve(databasePath));
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe("DROP TRIGGER IF EXISTS import_simulated_failure");
    await db.feedback.deleteMany();
    await db.assignment.deleteMany();
    await db.workout.deleteMany();
    await db.message.deleteMany();
    await db.team.updateMany({ data: { coachId: null } });
    await db.user.deleteMany();
    await db.team.deleteMany();
    await db.team.createMany({ data: [{ id: TEAM, name: "Integration team" }, { id: "foreign-team", name: "Other team" }] });
    await db.user.createMany({ data: [
      { id: COACH, name: "Test Coach", email: "coach@integration.invalid", passwordHash: "unused", role: "COACH", teamId: TEAM },
      { id: JORDAN, name: "Jordan Lee", email: "jordan@integration.invalid", passwordHash: "unused", teamId: TEAM, mileageGroup: "A", lrTarget: "90-100" },
      { id: MAYA, name: "Maya Chen", email: "maya@integration.invalid", passwordHash: "unused", teamId: TEAM, mileageGroup: "B", lrTarget: "80-90" },
      { id: KAI, name: "Kai Patel", email: "kai@integration.invalid", passwordHash: "unused", teamId: TEAM, mileageGroup: "C" },
      { id: FOREIGN, name: "Other Athlete", email: "other@integration.invalid", passwordHash: "unused", teamId: "foreign-team" },
    ] });
    await db.team.update({ where: { id: TEAM }, data: { coachId: COACH } });
  });

  after(async () => {
    if (db) await db.$disconnect();
    if (directory) {
      const target = resolve(directory);
      assert.equal(dirname(target), resolve(tmpdir()));
      assert.ok(basename(target).startsWith("scad-import-service-test-"));
      await rm(target, { recursive: true, force: true });
    }
  });

  test("preview writes nothing and publish groups the intended assignments at noon UTC", async () => {
    const value = await input();
    const beforePreview = await snapshot();
    const plan = await prepareWorkoutImport(db, value);
    assert.deepEqual(plan.preview.errors, []);
    assert.equal(plan.preview.summary.assignments, 4);
    assert.equal(plan.preview.summary.workouts, 3);
    assert.deepEqual(await snapshot(), beforePreview);
    const result = await publish(value);
    assert.equal(result.workouts, 3);
    assert.equal(result.assignments, 4);
    const assignments = await db.assignment.findMany({ include: { workout: true } });
    assert.deepEqual(assignments.map((row) => `${row.athleteId}:${row.workout.date.toISOString()}`).sort(), [
      `${JORDAN}:2026-09-14T12:00:00.000Z`, `${JORDAN}:2026-09-15T12:00:00.000Z`,
      `${MAYA}:2026-09-14T12:00:00.000Z`, `${MAYA}:2026-09-15T12:00:00.000Z`,
    ].sort());
    assert.ok(assignments.every((row) => row.status === "ASSIGNED" && row.workout.teamId === TEAM && row.workout.createdById === COACH));
    const rest = await db.workout.findMany({ where: { type: "REST" }, include: { assignments: true } });
    assert.equal(rest.length, 1);
    assert.equal(rest[0].assignments.length, 2);
    assert.deepEqual(await db.user.findMany({ orderBy: { id: "asc" } }), beforePreview.users);
  });

  test("an identical retry creates zero duplicate workouts or assignments", async () => {
    const value = await input();
    await publish(value);
    const beforeRetry = await snapshot();
    const retry = await publish(value);
    assert.equal(retry.workouts, 0);
    assert.equal(retry.assignments, 0);
    assert.equal(retry.unchanged, 4);
    assert.deepEqual(await snapshot(), beforeRetry);
  });

  test("replacement touches only selected athletes and written days, preserving shared workouts", async () => {
    const shared = await existing("shared-monday", "2026-09-14", [JORDAN, KAI]);
    const tuesday = await existing("jordan-tuesday", "2026-09-15", [JORDAN]);
    await db.assignment.update({ where: { id: tuesday.assignments[0].id }, data: { status: "VIEWED" } });
    await existing("maya-monday", "2026-09-14", [MAYA]);
    await existing("jordan-blank-wednesday", "2026-09-16", [JORDAN]);
    await existing("jordan-next-week", "2026-09-21", [JORDAN]);
    await existing("foreign-monday", "2026-09-14", [FOREIGN], "foreign-team");
    const kaiAssignment = shared.assignments.find((row) => row.athleteId === KAI)!;
    await db.assignment.update({ where: { id: kaiAssignment.id }, data: { customNote: "Keep this athlete's instruction" } });
    const beforeReplace = await snapshot();
    const value = await input("replace", true);
    const plan = await prepareWorkoutImport(db, value);
    assert.deepEqual(plan.preview.errors, []);
    assert.deepEqual(plan.removeAssignmentIds.sort(), [shared.assignments.find((row) => row.athleteId === JORDAN)!.id, tuesday.assignments[0].id].sort());
    const result = await publish(value);
    assert.equal(result.replaced, 2);
    assert.equal(result.assignments, 2);
    assert.equal(await db.workout.findUnique({ where: { id: tuesday.id } }), null);
    assert.deepEqual(await db.workout.findUnique({ where: { id: shared.id } }), beforeReplace.workouts.find((row) => row.id === shared.id));
    for (const id of [kaiAssignment.id, `maya-monday-${MAYA}`, `jordan-blank-wednesday-${JORDAN}`, `jordan-next-week-${JORDAN}`, `foreign-monday-${FOREIGN}`]) {
      assert.deepEqual(await db.assignment.findUnique({ where: { id } }), beforeReplace.assignments.find((row) => row.id === id));
    }
  });

  for (const protection of ["completed", "feedback", "unlinked feedback", "personal note", "responded"] as const) {
    test(`replacement blocks ${protection} history without making changes`, async () => {
      const workout = await existing("protected-monday", "2026-09-14", [JORDAN]);
      const assignment = workout.assignments[0];
      if (protection === "completed") await db.assignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED" } });
      if (protection === "personal note") await db.assignment.update({ where: { id: assignment.id }, data: { customNote: "Use the grass today" } });
      if (protection === "responded") await db.assignment.update({ where: { id: assignment.id }, data: { respondedAt: new Date("2026-09-14T15:00:00Z") } });
      if (protection === "feedback" || protection === "unlinked feedback") await db.feedback.create({ data: {
        workoutId: workout.id, athleteId: JORDAN, assignmentId: protection === "feedback" ? assignment.id : null, notes: "Athlete's history",
      } });
      const value = await input("replace", true);
      const plan = await prepareWorkoutImport(db, value);
      assert.ok(plan.preview.errors.length > 0);
      assert.equal(plan.preview.canImport, false);
      const beforeAttempt = await snapshot();
      await assert.rejects(db.$transaction((tx) => applyWorkoutImport(tx, value, plan)), (error: unknown) => error instanceof ApiError && error.status === 400);
      assert.deepEqual(await snapshot(), beforeAttempt);
    });
  }

  test("a mid-import SQL failure rolls back removals and earlier successful inserts", async () => {
    await existing("replace-me", "2026-09-14", [JORDAN, MAYA]);
    const value = await input("replace");
    const plan = await prepareWorkoutImport(db, value);
    assert.deepEqual(plan.preview.errors, []);
    assert.equal(plan.removeAssignmentIds.length, 2);
    assert.equal(plan.additions.length, 3);
    assert.equal(plan.additions[2].workout.mainSet, "OFF");
    await db.$executeRawUnsafe("CREATE TRIGGER import_simulated_failure BEFORE INSERT ON Workout WHEN NEW.mainSet = 'OFF' BEGIN SELECT RAISE(ABORT, 'simulated import failure'); END");
    const beforeAttempt = await snapshot();
    await assert.rejects(db.$transaction((tx) => applyWorkoutImport(tx, value, plan)));
    assert.deepEqual(await snapshot(), beforeAttempt);
    await db.$executeRawUnsafe("DROP TRIGGER import_simulated_failure");
  });
});
