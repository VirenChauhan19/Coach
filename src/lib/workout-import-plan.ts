import { createHash } from "node:crypto";
import type {
  ImportMode, ImportRosterAthlete, ImportWorkoutDraft,
  ParsedWeekImport, WeekImportPreview,
} from "./workout-import-types";

export type ExistingImportWorkout = {
  id: string;
  date: Date;
  title: string;
  type: string;
  distance: string | null;
  pace: string | null;
  warmup: string | null;
  mainSet: string | null;
  cooldown: string | null;
  notes: string | null;
  location: string | null;
  link: string | null;
  assignments: {
    id: string;
    athleteId: string;
    status: string;
    customNote: string | null;
    respondedAt: Date | null;
    feedback: { id: string } | null;
  }[];
  feedback: { id: string; athleteId: string }[];
};

export type WorkoutImportPlan = {
  preview: WeekImportPreview;
  additions: { workout: ImportWorkoutDraft; athleteIds: string[] }[];
  removeAssignmentIds: string[];
  touchedWorkoutIds: string[];
};

const clean = (value: string | null) => (value ?? "").trim().replace(/\s+/g, " ");

/** Exact prescription comparison, independent of grouping and whitespace. */
export function prescriptionKey(workout: Pick<ImportWorkoutDraft,
  "title" | "type" | "distance" | "pace" | "warmup" | "mainSet" | "cooldown" | "notes" | "location" | "link"
>) {
  return JSON.stringify([
    workout.title, workout.type, workout.distance, workout.pace, workout.warmup,
    workout.mainSet, workout.cooldown, workout.notes, workout.location, workout.link,
  ].map(clean));
}

export function buildWorkoutImportPlan(
  parsed: ParsedWeekImport,
  roster: ImportRosterAthlete[],
  existing: ExistingImportWorkout[],
  mode: ImportMode,
): WorkoutImportPlan {
  const warnings = [...parsed.warnings];
  const errors = [...parsed.errors];
  const additions: WorkoutImportPlan["additions"] = [];
  const removeAssignmentIds = new Set<string>();
  const touchedWorkoutIds = new Set<string>();
  const targeted = new Set<string>();
  const athletes = new Set<string>();
  const rosterById = new Map(roster.map((athlete) => [athlete.id, athlete]));
  const byAthleteDay = new Map<string, {
    workout: ExistingImportWorkout;
    assignment: ExistingImportWorkout["assignments"][number];
    protected: boolean;
  }[]>();
  for (const workout of existing) {
    for (const assignment of workout.assignments) {
      const key = `${workout.date.toISOString().slice(0, 10)}:${assignment.athleteId}`;
      const rows = byAthleteDay.get(key) ?? [];
      rows.push({
        workout, assignment,
        protected: !["ASSIGNED", "VIEWED"].includes(assignment.status)
          || assignment.respondedAt !== null || assignment.feedback !== null
          || workout.feedback.some((feedback) => feedback.athleteId === assignment.athleteId),
      });
      byAthleteDay.set(key, rows);
    }
  }

  let assignments = 0;
  let unchanged = 0;
  let existingCount = 0;
  const workouts = parsed.workouts.map((workout) => {
    const newAthleteIds: string[] = [];
    const newAthleteNames: string[] = [];
    const unchangedAthleteNames: string[] = [];
    let existingSessionCount = 0;
    const prescription = prescriptionKey(workout);
    for (const id of workout.athleteIds) {
      const athlete = rosterById.get(id);
      if (!athlete) {
        errors.push("An athlete in this import is no longer on the active team. Review the file again.");
        continue;
      }
      const key = `${workout.date}:${id}`;
      if (targeted.has(key)) {
        errors.push(`${athlete.name} has more than one prescription on ${workout.date}. Resolve duplicate Pace Chart entries.`);
        continue;
      }
      targeted.add(key);
      athletes.add(id);
      const candidates = byAthleteDay.get(key) ?? [];
      existingSessionCount += candidates.length;
      existingCount += candidates.length;
      // Prefer a logged match so replacement can never discard its history.
      const identical = candidates
        .filter((candidate) => prescriptionKey(candidate.workout) === prescription)
        .sort((a, b) => Number(b.protected) - Number(a.protected) || a.assignment.id.localeCompare(b.assignment.id))[0];
      if (identical) {
        unchanged++;
        unchangedAthleteNames.push(athlete.name);
      } else {
        if (mode === "replace" && candidates.some((candidate) => candidate.protected)) {
          errors.push(`${athlete.name} has a logged or flagged session on ${workout.date}. It cannot be replaced. Skip this athlete or choose “Add sessions” to keep their history and add a separate session.`);
        }
        newAthleteIds.push(id);
        newAthleteNames.push(athlete.name);
        assignments++;
      }
      if (mode === "replace") {
        for (const candidate of candidates) {
          // Individual coach notes are also authored history. Do not erase them.
          if (!candidate.protected && candidate.assignment.id !== identical?.assignment.id) {
            if (candidate.assignment.customNote?.trim()) {
              errors.push(`${athlete.name} has a personal coach note on ${workout.date}. Use “Add sessions” or review that workout before replacing it.`);
              continue;
            }
            removeAssignmentIds.add(candidate.assignment.id);
            touchedWorkoutIds.add(candidate.workout.id);
          }
        }
      }
    }
    if (newAthleteIds.length) additions.push({ workout, athleteIds: newAthleteIds });
    return { ...workout, newAthleteNames, unchangedAthleteNames, existingSessionCount };
  });

  if (mode === "add" && existingCount > unchanged) {
    warnings.push("Some athletes already have sessions on these days. Add sessions keeps them. Choose Replace unlogged sessions only if this file should replace their pending plan.");
  }
  if (mode === "replace" && removeAssignmentIds.size) {
    warnings.push(`${removeAssignmentIds.size} unlogged assignment${removeAssignmentIds.size === 1 ? "" : "s"} will be replaced for the athletes and days shown. Other athletes and days stay as scheduled.`);
  }

  // Bind the review to prescriptions, roster, assignments, notes and feedback.
  // Commit recomputes this inside the write transaction; the client sends no
  // trusted workout fields or assignee IDs.
  const previewToken = createHash("sha256").update(JSON.stringify({
    parsed, mode,
    roster: [...roster].sort((a, b) => a.id.localeCompare(b.id)),
    existing: [...existing].sort((a, b) => a.id.localeCompare(b.id)).map((workout) => ({
      ...workout,
      assignments: [...workout.assignments].sort((a, b) => a.id.localeCompare(b.id)),
      feedback: [...workout.feedback].sort((a, b) => a.id.localeCompare(b.id)),
    })),
  })).digest("hex");
  return {
    additions,
    removeAssignmentIds: [...removeAssignmentIds],
    touchedWorkoutIds: [...touchedWorkoutIds],
    preview: {
      ...parsed, workouts,
      errors: [...new Set(errors)], warnings: [...new Set(warnings)],
      mode, previewToken,
      roster: roster.map(({ id, name, mileageGroup }) => ({ id, name, mileageGroup })),
      canImport: errors.length === 0 && (assignments > 0 || removeAssignmentIds.size > 0),
      summary: {
        workouts: workouts.length, athletes: athletes.size, assignments, unchanged,
        replacing: removeAssignmentIds.size, existing: existingCount,
      },
    },
  };
}
