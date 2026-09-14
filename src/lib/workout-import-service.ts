import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "./api";
import { workoutInstantForDay } from "./date";
import { buildWorkoutImportPlan, type WorkoutImportPlan } from "./workout-import-plan";
import { parseWeeklyWorkbook } from "./workout-import-parser";
import type { ImportMode, ImportResolutions, WeekImportResult } from "./workout-import-types";

type ImportDatabase = Pick<PrismaClient, "user" | "workout" | "assignment">;

export type WorkoutImportInput = {
  buffer: Buffer;
  weekStart: string;
  mode: ImportMode;
  resolutions: ImportResolutions;
  teamId: string;
  coachId: string;
};

export async function prepareWorkoutImport(db: ImportDatabase, input: WorkoutImportInput) {
  const roster = await db.user.findMany({
    where: { teamId: input.teamId, role: "ATHLETE", active: true },
    select: { id: true, name: true, email: true, mileageGroup: true, lrTarget: true },
    orderBy: { id: "asc" },
  });
  if (!roster.length) throw new ApiError(400, "Add athletes to your team before importing a training week.");
  if (roster.length > 250) throw new ApiError(400, "Weekly import supports up to 250 active athletes.");
  const parsed = await parseWeeklyWorkbook(input.buffer, input.weekStart, roster, input.resolutions);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.weekStart) || Number.isNaN(workoutInstantForDay(parsed.weekStart).getTime())) {
    throw new ApiError(400, parsed.errors[0] ?? "Choose a valid Monday for this week.");
  }
  const start = new Date(`${parsed.weekStart}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 86400000);
  const existing = await db.workout.findMany({
    where: { teamId: input.teamId, date: { gte: start, lt: end } },
    select: {
      id: true, date: true, title: true, type: true, distance: true, pace: true,
      warmup: true, mainSet: true, cooldown: true, notes: true, location: true, link: true,
      assignments: { select: {
        id: true, athleteId: true, status: true, customNote: true, respondedAt: true,
        feedback: { select: { id: true } },
      } },
      feedback: { select: { id: true, athleteId: true } },
    },
  });
  return buildWorkoutImportPlan(parsed, roster, existing, input.mode);
}

/** Called only in a transaction after rebuilding and validating the review. */
export async function applyWorkoutImport(
  db: Prisma.TransactionClient,
  input: WorkoutImportInput,
  plan: WorkoutImportPlan,
): Promise<WeekImportResult> {
  if (plan.preview.errors.length) throw new ApiError(400, "Resolve the import issues before publishing this week.");
  if (plan.removeAssignmentIds.length) {
    const removed = await db.assignment.deleteMany({
      where: {
        id: { in: plan.removeAssignmentIds },
        workout: { teamId: input.teamId },
        status: { in: ["ASSIGNED", "VIEWED"] }, respondedAt: null,
        feedback: null,
      },
    });
    if (removed.count !== plan.removeAssignmentIds.length) {
      throw new ApiError(409, "A session changed while you were reviewing. Preview the file again.");
    }
  }
  let workouts = 0;
  let assignments = 0;
  for (const addition of plan.additions) {
    const { workout, athleteIds } = addition;
    if (!athleteIds.length) continue;
    await db.workout.create({
      data: {
        title: workout.title, type: workout.type,
        date: workoutInstantForDay(workout.date),
        scope: athleteIds.length === plan.preview.roster.length ? "TEAM" : "INDIVIDUAL",
        distance: workout.distance, pace: workout.pace, warmup: workout.warmup,
        mainSet: workout.mainSet, cooldown: workout.cooldown, notes: workout.notes,
        location: workout.location, link: workout.link,
        teamId: input.teamId, createdById: input.coachId,
        assignments: { create: athleteIds.map((athleteId) => ({ athleteId })) },
      },
    });
    workouts++;
    assignments += athleteIds.length;
  }
  if (plan.touchedWorkoutIds.length) {
    await db.workout.deleteMany({
      where: {
        id: { in: plan.touchedWorkoutIds }, teamId: input.teamId,
        assignments: { none: {} }, feedback: { none: {} },
      },
    });
  }
  return {
    imported: true, workouts, assignments, unchanged: plan.preview.summary.unchanged,
    replaced: plan.removeAssignmentIds.length, weekStart: plan.preview.weekStart,
  };
}
