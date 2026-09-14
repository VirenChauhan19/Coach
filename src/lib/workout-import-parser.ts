// Server-side workbook parsing only. This module never reads or changes the database.
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { ApiError } from "./api";
import { classify, workoutLocation } from "../../prisma/classify";
import type {
  ImportAthleteMatch,
  ImportResolutions,
  ImportRosterAthlete,
  ImportWorkoutDraft,
  ParsedWeekImport,
} from "./workout-import-types";

const DAY_MS = 86_400_000;
const MAX_ROWS = 1_000;
const MAX_COLUMNS = 64;
const MAX_CELLS = 50_000;
const GROUPS = ["A", "B", "C", "D"];
const DAY_NAMES = [
  ["M", "MON", "MONDAY"], ["T", "TU", "TUE", "TUES", "TUESDAY"],
  ["W", "WED", "WEDNESDAY"], ["R", "TH", "THU", "THUR", "THURS", "THURSDAY"],
  ["F", "FRI", "FRIDAY"], ["S", "SA", "SAT", "SATURDAY"], ["S", "SU", "SUN", "SUNDAY"],
];

function words(text: string): string[] {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function normalized(text: string): string {
  return words(text).join("").toUpperCase();
}

function formula(cell: ExcelJS.Cell): boolean {
  const value = cell.value;
  return value !== null && typeof value === "object" && ("formula" in value || "sharedFormula" in value);
}

function clockTime(date: Date): string {
  const hours = date.getUTCHours();
  return `${hours % 12 || 12}:${String(date.getUTCMinutes()).padStart(2, "0")}${date.getUTCSeconds() ? `:${String(date.getUTCSeconds()).padStart(2, "0")}` : ""} ${hours < 12 ? "AM" : "PM"}`;
}

/** Excel dates are read in UTC so time-only cells never acquire a local offset. */
function text(cell: ExcelJS.Cell, time = false): string {
  const value = cell.value;
  if (value === null || value === undefined || formula(cell)) return "";
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? (time ? clockTime(value) : value.toISOString().slice(0, 10)) : "";
  if (typeof value === "number" && time && value >= 0 && value < 1) {
    return clockTime(new Date(Math.round(value * DAY_MS)));
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).replace(/\r\n?/g, "\n").trim();
  if ("richText" in value) return value.richText.map((run) => run.text).join("").replace(/\r\n?/g, "\n").trim();
  if ("text" in value) return String(value.text).trim();
  return "";
}

function present(value: string): string | undefined {
  return value && !/^(?:N\/?A|NONE|-)$/i.test(value) ? value : undefined;
}

function validDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function chartGroups(value: string): { volume: string | null; workout: string | null } {
  const clean = value.trim().toUpperCase();
  if (GROUPS.includes(clean)) return { volume: clean, workout: null };
  const split = clean.match(/^VOL(?:UME)?\s*:\s*([A-D])\s*[,;/]?\s*WO(?:RKOUT)?\s*:\s*([A-D])$/);
  return { volume: split?.[1] ?? null, workout: split?.[2] ?? null };
}

function matchAthletes(sourceName: string, roster: ImportRosterAthlete[]): ImportRosterAthlete[] {
  const email = sourceName.trim().toLowerCase();
  if (email.includes("@")) return roster.filter((athlete) => athlete.email.trim().toLowerCase() === email);
  const exact = roster.filter((athlete) => normalized(athlete.name) === normalized(sourceName));
  if (exact.length) return exact;
  const source = words(sourceName);
  return roster.filter((athlete) => {
    const name = words(athlete.name);
    if (source.length === 1) return source[0] === name[0];
    if (source.length === 2 && name.length >= 2) {
      const matches = (part: string, full: string) => part === full || (part.length === 1 && full.startsWith(part));
      return matches(source[0], name[0]) && matches(source[1], name[name.length - 1]);
    }
    return source.length === name.length && source.every((part, i) => part === name[i] || (part.length === 1 && name[i].startsWith(part)));
  });
}

function safeClassification(raw: string, lrTarget: string) {
  const input = raw.replace(/[’′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—]/g, "-");
  const result = classify(input, lrTarget);
  if (!result) return null;
  const fallback = result.type === "EASY" && result.title === "Easy Run" && result.mainSet === input;
  const rep = result.title === "Interval Workout" || result.title === "Tempo Intervals";
  const zone = input.toUpperCase().match(/@\s*([A-Z0-9]+(?:[-/][A-Z0-9]+)*)/)?.[1];
  const explicitZone = zone && (/^(?:ST|MT|ST-MT|MILE|GP)$/.test(zone) || /^\d+K(?:[-/]\d+K)*$/.test(zone));
  const uncertain = fallback || (rep && !explicitZone);
  return {
    ...result,
    ...(uncertain ? { type: "WORKOUT", title: "Training session", pace: null } : {}),
    mainSet: raw,
    uncertain,
  };
}

function iso(date: Date, day = 0): string {
  return new Date(date.getTime() + day * DAY_MS).toISOString().slice(0, 10);
}

function datePartMatches(raw: string, date: Date): boolean {
  const full = validDate(raw);
  if (full) return full.getTime() === date.getTime();
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  return Boolean(parts && +parts[1] === date.getUTCMonth() + 1 && +parts[2] === date.getUTCDate() && (!parts[3] || +parts[3] === date.getUTCFullYear()));
}

/** Parse the coach's existing Training + Pace Chart layout into reviewable drafts. */
export async function parseWeeklyWorkbook(
  buffer: Buffer,
  weekStart: string,
  roster: ImportRosterAthlete[],
  resolutions: ImportResolutions = {},
): Promise<ParsedWeekImport> {
  const output: ParsedWeekImport = { weekStart, weekEnd: weekStart, sourceWeekLabel: "", theme: null, groups: [], athletes: [], workouts: [], warnings: [], errors: [] };
  const error = (message: string) => { if (!output.errors.includes(message)) output.errors.push(message); };
  const warn = (message: string) => { if (!output.warnings.includes(message)) output.warnings.push(message); };
  const start = validDate(weekStart);
  if (!start || start.getUTCDay() !== 1) {
    error("Choose a valid Monday in YYYY-MM-DD format as the week start.");
    return output;
  }
  output.weekEnd = iso(start, 6);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new ApiError(400, "This file could not be read as an Excel workbook. Upload a valid .xlsx file.");
  }
  if (!workbook.worksheets.length || workbook.worksheets.length > 8) {
    error("The workbook must contain between 1 and 8 sheets.");
    return output;
  }
  let cells = 0;
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > MAX_ROWS || sheet.columnCount > MAX_COLUMNS) {
      error(`Sheet "${sheet.name}" exceeds the limit of ${MAX_ROWS} rows and ${MAX_COLUMNS} columns.`);
      continue;
    }
    sheet.eachRow((row) => row.eachCell((cell) => {
      cells++;
      if (text(cell).length > 8_000) error(`Cell ${sheet.name}!${cell.address} contains more than 8,000 characters.`);
    }));
  }
  if (cells > MAX_CELLS) error(`The workbook contains more than ${MAX_CELLS.toLocaleString("en-US")} populated cells.`);
  if (output.errors.length) return output;

  const training = workbook.worksheets.filter((sheet) => normalized(sheet.name) === "TRAINING");
  const charts = workbook.worksheets.filter((sheet) => normalized(sheet.name) === "PACECHART");
  if (training.length !== 1) error("Include exactly one sheet named Training.");
  if (charts.length !== 1) error("Include exactly one sheet named Pace Chart with NAME and MILEAGE GROUP headers.");
  if (output.errors.length) return output;
  const plan = training[0];
  const chart = charts[0];
  const rejectFormula = (cell: ExcelJS.Cell, sheet: ExcelJS.Worksheet) => {
    if (formula(cell)) error(`Formula in ${sheet.name}!${cell.address} cannot be verified from its cached result. Replace it with a confirmed value before importing.`);
    const value = cell.value;
    if (value && typeof value === "object" && "error" in value) error(`Excel error in ${sheet.name}!${cell.address}. Correct the cell before importing.`);
  };

  const weekLabels = new Set<string>();
  const themes = new Set<string>();
  plan.eachRow((row) => row.eachCell((cell) => {
    if (cell.isMerged && cell.master.address !== cell.address) return;
    rejectFormula(cell, plan);
    const value = text(cell);
    if (/^WEEK\b/i.test(value)) weekLabels.add(value);
    if (/^THEME\s*:/i.test(value)) themes.add(value.replace(/^THEME\s*:\s*/i, ""));
  }));
  if (weekLabels.size !== 1) error("Training must contain one unambiguous WEEK heading with its date range (for example, WEEK 15: 9/14-9/20).");
  output.sourceWeekLabel = [...weekLabels][0] ?? "";
  output.theme = [...themes][0] || null;
  if (themes.size > 1) error("Training contains more than one theme heading.");
  const range = output.sourceWeekLabel.match(/(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*[-–—]\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/);
  if (!range || !datePartMatches(range[1], start) || !datePartMatches(range[2], new Date(start.getTime() + 6 * DAY_MS))) {
    error(`The Training week heading must match ${weekStart} through ${output.weekEnd}. The selected Monday supplies the year when the file omits it.`);
  }

  const headerCandidates: { row: number; column: number; dates: (string | null)[] }[] = [];
  plan.eachRow((row) => {
    for (let column = 2; column + 6 <= plan.columnCount; column++) {
      const dates: (string | null)[] = [];
      const matches = DAY_NAMES.every((names, index) => {
        const value = text(row.getCell(column + index));
        if (/^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)$/.test(value)) { dates.push(value); return true; }
        const parts = value.toUpperCase().match(/^([A-Z]+)\.?\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)?$/);
        dates.push(parts?.[2] ?? null);
        return Boolean(parts && names.includes(parts[1]));
      });
      if (matches) headerCandidates.push({ row: row.number, column, dates });
    }
  });
  if (headerCandidates.length !== 1) error("Training must contain one Monday-to-Sunday header in seven consecutive columns (M, T, W, R, F, S, S).");
  if (output.errors.length) return output;
  const header = headerCandidates[0];
  header.dates.forEach((value, day) => {
    if (value && !datePartMatches(value, new Date(start.getTime() + day * DAY_MS))) error(`Training day header ${plan.getRow(header.row).getCell(header.column + day).address} does not match ${iso(start, day)}.`);
  });

  const rows = new Map<string, ExcelJS.Row>();
  const knownLabels = new Set([...GROUPS, "LOC", "LOCATION", "STAFF", "TIME", "LIFTTIME", "TEAMMEETING", "PR", "DATE", "DATES"]);
  plan.eachRow((row) => {
    if (row.number <= header.row) return;
    for (let column = 1; column < header.column; column++) {
      let label = normalized(text(row.getCell(column)));
      if (!knownLabels.has(label)) continue;
      if (label === "LOCATION") label = "LOC";
      if (label === "DATES") label = "DATE";
      if (rows.has(label)) error(`Training contains duplicate ${label} rows. Keep one row for each label.`);
      else rows.set(label, row);
    }
  });
  output.groups = GROUPS.filter((group) => rows.has(group));
  if (!output.groups.length) error("Training does not contain any labeled A, B, C or D group rows.");
  const datesRow = rows.get("DATE");
  if (datesRow) for (let day = 0; day < 7; day++) {
    const value = text(datesRow.getCell(header.column + day));
    if (!datePartMatches(value, new Date(start.getTime() + day * DAY_MS))) error(`Training date cell ${datesRow.getCell(header.column + day).address} does not match ${iso(start, day)}.`);
  }

  const chartHeaders: { row: number; name: number; group: number; lr: number | null }[] = [];
  chart.eachRow((row) => {
    const labels = new Map<string, number[]>();
    row.eachCell((cell) => {
      const key = normalized(text(cell));
      if (["NAME", "MILEAGEGROUP", "LRTARGET"].includes(key)) labels.set(key, [...(labels.get(key) ?? []), +cell.col]);
    });
    if (!labels.has("NAME") || !labels.has("MILEAGEGROUP")) return;
    for (const [label, columns] of labels) if (columns.length > 1) error(`Pace Chart contains duplicate ${label} header columns.`);
    chartHeaders.push({ row: row.number, name: labels.get("NAME")![0], group: labels.get("MILEAGEGROUP")![0], lr: labels.get("LRTARGET")?.[0] ?? null });
  });
  if (chartHeaders.length !== 1) error("Pace Chart must contain one header row with NAME and MILEAGE GROUP columns.");
  if (output.errors.length) return output;
  const columns = chartHeaders[0];
  if (!columns.lr) warn("Pace Chart has no LR TARGET column. No saved profile targets will be substituted for this week.");
  const chartTargets = new Map<string, string>();
  const sourceRows = new Set<string>();
  const presentAthletes = new Set<string>();
  for (let rowNumber = columns.row + 1; rowNumber <= chart.rowCount; rowNumber++) {
    const row = chart.getRow(rowNumber);
    const nameCell = row.getCell(columns.name);
    const groupCell = row.getCell(columns.group);
    const lrCell = columns.lr ? row.getCell(columns.lr) : null;
    if (!nameCell.value && !groupCell.value && !lrCell?.value) continue;
    [nameCell, groupCell, ...(lrCell ? [lrCell] : [])].forEach((cell) => rejectFormula(cell, chart));
    const sourceName = text(nameCell);
    const key = `row-${rowNumber}`;
    sourceRows.add(key);
    const resolution = Object.hasOwn(resolutions, key) ? resolutions[key] : {};
    if (resolution.athleteId !== undefined && !roster.some((athlete) => athlete.id === resolution.athleteId)) error(`Pace Chart row ${rowNumber} resolves to an athlete who is not on this roster.`);
    for (const field of ["volumeGroup", "workoutGroup"] as const) {
      const value = resolution[field];
      if (value !== undefined && !(field === "workoutGroup" && value === "") && !output.groups.includes(value)) error(`Pace Chart row ${rowNumber} has an invalid ${field} resolution. Choose an available Training group.`);
    }
    const candidates = resolution.athleteId ? roster.filter((athlete) => athlete.id === resolution.athleteId) : matchAthletes(sourceName, roster);
    const athlete = candidates.length === 1 ? candidates[0] : null;
    if (athlete) presentAthletes.add(athlete.id);
    const fromChart = chartGroups(text(groupCell));
    const volumeGroup = resolution.volumeGroup ?? fromChart.volume;
    const workoutGroup = resolution.workoutGroup === "" ? null : resolution.workoutGroup ?? fromChart.workout;
    const match: ImportAthleteMatch = {
      key, sourceName: sourceName || `(unnamed row ${rowNumber})`, athleteId: athlete?.id ?? null, athleteName: athlete?.name ?? null,
      volumeGroup, workoutGroup, status: "matched", message: null,
    };
    if (resolution.skip) { match.status = "skipped"; match.message = "Explicitly skipped for this import."; }
    else if (!athlete) {
      match.status = "unmatched";
      match.message = candidates.length > 1 ? "This name matches more than one athlete. Choose the correct athlete or skip this row." : "No exact or unique first-name/initial match. Choose an athlete or skip this row.";
    } else if (!volumeGroup || !output.groups.includes(volumeGroup) || (workoutGroup && !output.groups.includes(workoutGroup))) {
      match.status = "needs_group";
      match.message = `Mileage group "${text(groupCell) || "blank"}" needs a group selection or an explicit skip. Saved profile groups are not used as a fallback.`;
    }
    if (athlete && match.status === "matched" && athlete.mileageGroup && normalized(athlete.mileageGroup) !== normalized(text(groupCell))) {
      warn(`${athlete.name}: the file's group selection applies only to this week; the saved profile stays unchanged.`);
    }
    output.athletes.push(match);
    chartTargets.set(key, lrCell ? text(lrCell).replace(/[–—]/g, "-").replace(/\s*(?:min(?:utes)?|')\s*$/i, "").trim() : "");
  }
  for (const key of Object.keys(resolutions)) if (!sourceRows.has(key)) error(`Resolution "${key}" does not identify a Pace Chart athlete row in this file.`);
  if (!output.athletes.length) error("Pace Chart does not contain any athlete rows.");
  const duplicateBuckets = new Map<string, ImportAthleteMatch[]>();
  for (const match of output.athletes.filter((athlete) => athlete.status !== "skipped")) {
    // Two athletes can share the shorthand name in the file. Once a coach
    // identifies them, roster identity is authoritative for duplicate detection.
    const identity = match.athleteId ? `id:${match.athleteId}` : `name:${normalized(match.sourceName)}`;
    duplicateBuckets.set(identity, [...(duplicateBuckets.get(identity) ?? []), match]);
  }
  for (const matches of duplicateBuckets.values()) if (matches.length > 1) {
    for (const match of matches) { match.status = "unmatched"; match.message = "This athlete appears in duplicate Pace Chart rows. Explicitly skip the duplicate row before importing."; }
  }
  for (const match of output.athletes) if (match.status === "unmatched" || match.status === "needs_group") error(`${match.sourceName} (${match.key}): ${match.message}`);
  const absent = roster.filter((athlete) => !presentAthletes.has(athlete.id));
  if (absent.length) warn(`Roster athletes not matched from Pace Chart will be left untouched: ${absent.map((athlete) => athlete.name).sort().join(", ")}.`);

  const drafts = new Map<string, ImportWorkoutDraft>();
  for (let day = 0; day < 7; day++) {
    const get = (label: string) => { const row = rows.get(label); return row ? text(row.getCell(header.column + day), label === "TIME" || label === "LIFTTIME") : ""; };
    const dayNotes = [
      output.theme && `Theme: ${output.theme}`,
      present(get("STAFF")) && `Staff: ${get("STAFF")}`,
      present(get("PR")) && `PR: ${get("PR")}`,
      present(get("LIFTTIME")) && `Lift time: ${get("LIFTTIME")}`,
      present(get("TEAMMEETING")) && `Team meeting: ${get("TEAMMEETING")}`,
    ].filter(Boolean).join("\n") || null;
    for (const athlete of output.athletes.filter((match) => match.status === "matched")) {
      const volume = athlete.volumeGroup!;
      const quality = athlete.workoutGroup;
      const qualityRaw = quality ? get(quality) : "";
      const qualityClass = qualityRaw ? safeClassification(qualityRaw, "") : null;
      if (qualityClass?.uncertain && qualityRaw !== get(volume)) {
        error(`${athlete.sourceName}: ${iso(start, day)} has an unrecognized workout-group prescription. Clarify it in Training before choosing between groups ${volume} and ${quality}.`);
        continue;
      }
      // Match the shared group's quality/volume rule using the normalized
      // classification above; reclassifying raw smart quotes/dashes would lose it.
      const raw = qualityClass && ["WORKOUT", "RACE"].includes(qualityClass.type) ? qualityRaw : get(volume);
      if (!raw || !present(raw)) { warn(`${athlete.sourceName}: no session is written for ${iso(start, day)}; that day will be left untouched.`); continue; }
      const classified = safeClassification(raw, chartTargets.get(athlete.key) ?? "");
      if (!classified) continue;
      const selectedGroup = quality && qualityRaw === raw && qualityClass && ["WORKOUT", "RACE"].includes(qualityClass.type) ? quality : volume;
      if (classified.uncertain) warn(`Training group ${selectedGroup}, ${iso(start, day)}: "${raw}" is kept as a Training session without an inferred pace or intensity.`);
      const prescription = {
        date: iso(start, day), title: classified.title, type: classified.type, distance: classified.distance, pace: classified.pace,
        warmup: null, mainSet: raw, cooldown: null, notes: dayNotes,
        location: workoutLocation({ time: present(get("TIME")), loc: present(get("LOC")) }), link: null,
      };
      const fingerprint = JSON.stringify(prescription);
      let draft = drafts.get(fingerprint);
      if (!draft) {
        draft = { key: `workout-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 24)}`, ...prescription, athleteIds: [], athleteNames: [], groups: [] };
        drafts.set(fingerprint, draft);
      }
      draft.athleteIds.push(athlete.athleteId!);
      draft.athleteNames.push(athlete.athleteName!);
      if (!draft.groups.includes(selectedGroup)) draft.groups.push(selectedGroup);
    }
  }
  output.workouts = [...drafts.values()].map((draft) => {
    const athletes = draft.athleteIds.map((id, index) => ({ id, name: draft.athleteNames[index] })).sort((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en"));
    return { ...draft, athleteIds: athletes.map((athlete) => athlete.id), athleteNames: athletes.map((athlete) => athlete.name), groups: draft.groups.sort() };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "en") || a.key.localeCompare(b.key));
  return output;
}
