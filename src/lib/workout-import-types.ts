export type ImportMode = "add" | "replace";

export type ImportRosterAthlete = {
  id: string;
  name: string;
  email: string;
  mileageGroup: string | null;
  lrTarget: string | null;
};

export type ImportResolution = {
  athleteId?: string;
  volumeGroup?: string;
  workoutGroup?: string;
  skip?: boolean;
};

export type ImportResolutions = Record<string, ImportResolution>;

export type ImportAthleteMatch = {
  key: string;
  sourceName: string;
  athleteId: string | null;
  athleteName: string | null;
  volumeGroup: string | null;
  workoutGroup: string | null;
  status: "matched" | "unmatched" | "needs_group" | "skipped";
  message: string | null;
};

export type ImportWorkoutDraft = {
  key: string;
  date: string;
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
  athleteIds: string[];
  athleteNames: string[];
  groups: string[];
};

export type ParsedWeekImport = {
  weekStart: string;
  weekEnd: string;
  sourceWeekLabel: string;
  theme: string | null;
  groups: string[];
  athletes: ImportAthleteMatch[];
  workouts: ImportWorkoutDraft[];
  warnings: string[];
  errors: string[];
};

export type ImportWorkoutPreview = ImportWorkoutDraft & {
  newAthleteNames: string[];
  unchangedAthleteNames: string[];
  existingSessionCount: number;
};

export type WeekImportPreview = Omit<ParsedWeekImport, "workouts"> & {
  workouts: ImportWorkoutPreview[];
  roster: { id: string; name: string; mileageGroup: string | null }[];
  mode: ImportMode;
  previewToken: string;
  canImport: boolean;
  summary: {
    workouts: number;
    athletes: number;
    assignments: number;
    unchanged: number;
    replacing: number;
    existing: number;
  };
};

export type WeekImportResult = {
  imported: true;
  workouts: number;
  assignments: number;
  unchanged: number;
  replaced: number;
  weekStart: string;
};
