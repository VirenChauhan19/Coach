import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkoutImportPlan, type ExistingImportWorkout } from "./workout-import-plan";
import type { ImportRosterAthlete, ImportWorkoutDraft, ParsedWeekImport } from "./workout-import-types";

const roster: ImportRosterAthlete[] = [
  { id: "a", name: "Alex Runner", email: "alex@example.test", mileageGroup: "A", lrTarget: null },
  { id: "b", name: "Blair Runner", email: "blair@example.test", mileageGroup: "B", lrTarget: null },
];
const draft: ImportWorkoutDraft = {
  key: "monday-a", date: "2026-09-14", title: "Easy Run", type: "EASY", distance: "40 min",
  pace: "Easy", warmup: null, mainSet: "40' EZ", cooldown: null, notes: "Meet at 7 AM",
  location: "Track", link: null, athleteIds: ["a"], athleteNames: ["Alex Runner"], groups: ["A"],
};
function parsed(workouts = [draft]): ParsedWeekImport {
  return { weekStart: "2026-09-14", weekEnd: "2026-09-20", sourceWeekLabel: "WEEK 15: 9/14-9/20",
    theme: "Base", groups: ["A", "B"], athletes: [], workouts, warnings: [], errors: [] };
}
function existing(overrides: Partial<ExistingImportWorkout> = {}): ExistingImportWorkout {
  return { ...draft, id: "old", date: new Date("2026-09-14T12:00:00Z"),
    assignments: [{ id: "assignment-a", athleteId: "a", status: "ASSIGNED", customNote: null, respondedAt: null, feedback: null }],
    feedback: [], ...overrides };
}

test("new assignments use only the resolved athletes", () => {
  const plan = buildWorkoutImportPlan(parsed(), roster, [], "add");
  assert.deepEqual(plan.additions.map((item) => item.athleteIds), [["a"]]);
  assert.equal(plan.preview.summary.athletes, 1);
  assert.equal(plan.preview.canImport, true);
  assert.deepEqual(plan.removeAssignmentIds, []);
});

test("matching prescriptions are idempotent across whitespace and assignment grouping", () => {
  const old = existing({ mainSet: " 40'  EZ  ", assignments: [
    ...existing().assignments,
    { ...existing().assignments[0], id: "assignment-b", athleteId: "b" },
  ] });
  for (const mode of ["add", "replace"] as const) {
    const plan = buildWorkoutImportPlan(parsed(), roster, [old], mode);
    assert.equal(plan.preview.summary.unchanged, 1);
    assert.equal(plan.preview.canImport, false);
    assert.deepEqual(plan.additions, []);
    assert.deepEqual(plan.removeAssignmentIds, []);
  }
});

test("add retains existing sessions while replace targets only matching athlete and day", () => {
  const old = existing({ mainSet: "50' EZ", assignments: [
    ...existing().assignments,
    { ...existing().assignments[0], id: "assignment-b", athleteId: "b" },
  ] });
  const tuesday = existing({ id: "tuesday", date: new Date("2026-09-15T12:00:00Z"),
    assignments: [{ ...existing().assignments[0], id: "tuesday-a" }] });
  const add = buildWorkoutImportPlan(parsed(), roster, [old, tuesday], "add");
  assert.deepEqual(add.removeAssignmentIds, []);
  assert.equal(add.preview.summary.assignments, 1);
  assert.match(add.preview.warnings.join(" "), /already have sessions/);
  const replace = buildWorkoutImportPlan(parsed(), roster, [old, tuesday], "replace");
  assert.deepEqual(replace.removeAssignmentIds, ["assignment-a"]);
  assert.deepEqual(replace.touchedWorkoutIds, ["old"]);
  assert.equal(replace.preview.summary.replacing, 1);
});

test("replacement protects completed, flagged, responded and feedback records", () => {
  const base = existing({ mainSet: "50' EZ" });
  const variants = [
    ...["COMPLETED", "SKIPPED", "NEEDS_DISCUSSION"].map((status) => ({ ...base, assignments: [{ ...base.assignments[0], status }] })),
    { ...base, assignments: [{ ...base.assignments[0], respondedAt: new Date() }] },
    { ...base, assignments: [{ ...base.assignments[0], feedback: { id: "feedback" } }] },
    { ...base, feedback: [{ id: "unlinked-feedback", athleteId: "a" }] },
  ];
  for (const old of variants) {
    const plan = buildWorkoutImportPlan(parsed(), roster, [old], "replace");
    assert.equal(plan.preview.canImport, false);
    assert.match(plan.preview.errors.join(" "), /logged or flagged/);
    assert.deepEqual(plan.removeAssignmentIds, []);
    assert.equal(buildWorkoutImportPlan(parsed(), roster, [old], "add").preview.canImport, true);
  }
});

test("replacement preserves personal coach notes and prefers a logged identical match", () => {
  const old = existing({ mainSet: "50' EZ", assignments: [{ ...existing().assignments[0], customNote: "Return gradually" }] });
  const blocked = buildWorkoutImportPlan(parsed(), roster, [old], "replace");
  assert.equal(blocked.preview.canImport, false);
  assert.match(blocked.preview.errors.join(" "), /personal coach note/);
  assert.deepEqual(blocked.removeAssignmentIds, []);
  const logged = existing({ id: "logged", assignments: [{ ...existing().assignments[0], id: "logged-a", status: "COMPLETED" }] });
  const plan = buildWorkoutImportPlan(parsed(), roster, [existing(), logged], "replace");
  assert.equal(plan.preview.summary.unchanged, 1);
  assert.deepEqual(plan.removeAssignmentIds, ["assignment-a"]);
  assert.deepEqual(plan.preview.errors, []);
});

test("a completed match with another protected session retains both histories", () => {
  const logged = existing({ assignments: [{ ...existing().assignments[0], status: "COMPLETED" }] });
  const other = existing({ id: "other", mainSet: "Other session", assignments: [{ ...existing().assignments[0], id: "other-a", status: "SKIPPED" }] });
  const plan = buildWorkoutImportPlan(parsed(), roster, [logged, other], "replace");
  assert.deepEqual(plan.removeAssignmentIds, []);
  assert.deepEqual(plan.preview.errors, []);
  assert.equal(plan.preview.summary.unchanged, 1);
});

test("duplicate prescriptions or removed athletes block all writes", () => {
  const duplicate = buildWorkoutImportPlan(parsed([draft, { ...draft, key: "second" }]), roster, [], "add");
  assert.equal(duplicate.preview.canImport, false);
  assert.match(duplicate.preview.errors.join(" "), /more than one prescription/);
  const removed = buildWorkoutImportPlan(parsed(), [], [], "add");
  assert.equal(removed.preview.canImport, false);
  assert.equal(removed.additions.length, 0);
});

test("preview token is stable across database ordering but changes with roster, choice, status or prescription", () => {
  const a = existing();
  const b = existing({ id: "b", assignments: [{ ...a.assignments[0], id: "b-assignment", athleteId: "b" }] });
  const original = buildWorkoutImportPlan(parsed(), roster, [a, b], "add").preview.previewToken;
  assert.equal(buildWorkoutImportPlan(parsed(), [...roster].reverse(), [b, a], "add").preview.previewToken, original);
  assert.notEqual(buildWorkoutImportPlan(parsed(), roster, [a, b], "replace").preview.previewToken, original);
  assert.notEqual(buildWorkoutImportPlan(parsed([{ ...draft, notes: "Meet at 8 AM" }]), roster, [a, b], "add").preview.previewToken, original);
  assert.notEqual(buildWorkoutImportPlan(parsed(), [{ ...roster[0], name: "New Name" }, roster[1]], [a, b], "add").preview.previewToken, original);
  assert.notEqual(buildWorkoutImportPlan(parsed(), roster, [{ ...a, assignments: [{ ...a.assignments[0], status: "VIEWED" }] }, b], "add").preview.previewToken, original);
  assert.notEqual(buildWorkoutImportPlan(parsed(), roster, [{ ...a, feedback: [{ id: "feedback", athleteId: "a" }] }, b], "add").preview.previewToken, original);
});
