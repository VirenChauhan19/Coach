import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ExcelJS from "exceljs";
import { parseWeeklyWorkbook } from "./workout-import-parser";
import type { ImportResolutions, ImportRosterAthlete, ParsedWeekImport } from "./workout-import-types";

const MONDAY = "2026-09-14";
const athlete = (id: string, name: string, group = "A", lrTarget = "80-90"): ImportRosterAthlete => ({
  id, name, email: `${id}@example.test`, mileageGroup: group, lrTarget,
});

function workbook(people: string[][] = [["Maya Stone", "A", "80-90"]], offset = 0) {
  const book = new ExcelJS.Workbook();
  const plan = book.addWorksheet("Training");
  for (let i = 0; i < offset; i++) plan.addRow(["Coach notes"]);
  plan.addRow(["WEEK 15: 9/14-9/20"]);
  plan.mergeCells(offset + 1, 1, offset + 1, 8);
  plan.addRow(["THEME: BASE (NO DOUBLES)"]);
  plan.mergeCells(offset + 2, 1, offset + 2, 8);
  plan.addRow(["", "M", "T", "W", "R", "F", "S", "S"]);
  plan.addRow(["LOC", "TRACK", "PARK", "TRACK", "PARK", "TRACK", "MEET SITE", "N/A"]);
  plan.addRow(["STAFF", "C+M"]);
  plan.addRow(["TIME", new Date("1899-12-30T06:50:00.000Z"), new Date("1899-12-30T08:00:00.000Z")]);
  plan.addRow(["LIFT TIME", "10:00, 2:00, 5:00 (SEE E-MAIL)"]);
  plan.addRow(["TEAM MEETING", "MEN: 8PM"]);
  for (const [group, easy] of [["A", "50-60"], ["B", "40-50"], ["C", "30-40"], ["D", "20-30"]]) {
    plan.addRow([group, group === "D" ? "6-8 X 3' @ ST-MT W/ 1'" : "5-7 X 5' @ ST-MT W/ 60-90\"",
      `${easy}' EZ`, "8-10 X 90\" @ 8K/6K W/ 60/90\"", `${easy}' EZ`,
      "PRE-MEET EI: 2X5X20\"/40\"/3' EI @ GP", "CONVERSE KICK-OFF", "OFF"]);
  }
  plan.addRow(["PR", "FUEL + DAY 1 LIFT\n+ CORE & HIP + RECOVERY", "FUEL + LIGHT STRETCH", "", "", "", "", "TRAINING RECAP"]);
  const chart = book.addWorksheet("Pace Chart");
  for (let i = 0; i < offset; i++) chart.addRow(["Pace notes"]);
  chart.addRow(["NAME", "MILEAGE GROUP", "LR TARGET", "EZ PACE"]);
  people.forEach((person) => chart.addRow(person));
  return book;
}

async function bytes(book: ExcelJS.Workbook) { return Buffer.from(await book.xlsx.writeBuffer()); }
function session(result: ParsedWeekImport, id: string, date = MONDAY) {
  const found = result.workouts.find((draft) => draft.date === date && draft.athleteIds.includes(id));
  assert.ok(found, `Expected a session for ${id} on ${date}`);
  return found;
}

test("split groups use D for quality and C for volume; plain D always follows D", async () => {
  const source = await bytes(workbook([["Meredith", "VOL: C, WO: D", "80-90"], ["Tino", "D", "40-50"], ["Maya", "C", "65-75"]]));
  const roster = [athlete("meredith", "Meredith Jones", "A"), athlete("tino", "Tino Young", "A"), athlete("maya", "Maya Stone", "A")];
  const original = structuredClone(roster);
  const result = await parseWeeklyWorkbook(source, MONDAY, roster);
  assert.deepEqual(result.errors, []);
  assert.equal(session(result, "meredith").mainSet, "6-8 X 3' @ ST-MT W/ 1'");
  assert.equal(session(result, "tino").key, session(result, "meredith").key);
  assert.equal(session(result, "meredith", "2026-09-15").mainSet, "30-40' EZ");
  assert.equal(session(result, "tino", "2026-09-15").mainSet, "20-30' EZ");
  assert.equal(session(result, "maya").mainSet, "5-7 X 5' @ ST-MT W/ 60-90\"");
  const common = session(result, "meredith", "2026-09-16");
  assert.deepEqual(common.athleteNames, ["Maya Stone", "Meredith Jones", "Tino Young"]);
  assert.deepEqual(common.athleteIds, ["maya", "meredith", "tino"]);
  assert.deepEqual(common.groups, ["C", "D"]);
  assert.equal(session(result, "meredith", "2026-09-20").mainSet, "OFF");
  assert.equal(session(result, "meredith", "2026-09-20").type, "REST");
  assert.deepEqual(roster, original, "Saved athlete profiles must not be changed");
  assert.match(result.warnings.join("\n"), /saved profile stays unchanged/);
  assert.deepEqual((await parseWeeklyWorkbook(source, MONDAY, roster)).workouts, result.workouts, "Drafts and keys must be deterministic");
});

test("1899 Excel times, raw prescriptions, lift, meeting, staffing and PR notes survive", async () => {
  const result = await parseWeeklyWorkbook(await bytes(workbook()), MONDAY, [athlete("maya", "Maya Stone")]);
  const monday = session(result, "maya");
  assert.equal(monday.location, "6:50 AM · TRACK");
  assert.equal(session(result, "maya", "2026-09-15").location, "8:00 AM · PARK");
  assert.match(monday.notes!, /Staff: C\+M/);
  assert.match(monday.notes!, /FUEL \+ DAY 1 LIFT\n\+ CORE & HIP \+ RECOVERY/);
  assert.match(monday.notes!, /Lift time: 10:00, 2:00, 5:00 \(SEE E-MAIL\)/);
  assert.match(monday.notes!, /Team meeting: MEN: 8PM/);
  assert.ok(result.workouts.every((draft) => draft.notes?.includes("Theme: BASE (NO DOUBLES)")));
  assert.equal(session(result, "maya", "2026-09-19").mainSet, "CONVERSE KICK-OFF");
  assert.equal(result.theme, "BASE (NO DOUBLES)");
});

test("split-group quality selection recognizes smart punctuation without changing the raw prescription", async () => {
  const book = workbook([["Maya", "VOL: A, WO: B", "80-90"]]);
  const plan = book.getWorksheet("Training")!;
  plan.getCell("B9").value = "40-50' EZ";
  plan.getCell("B10").value = "6–8 X 3’ @ 5K";
  const result = await parseWeeklyWorkbook(await bytes(book), MONDAY, [athlete("maya", "Maya Stone")]);
  assert.deepEqual(result.errors, []);
  const draft = session(result, "maya");
  assert.equal(draft.mainSet, "6–8 X 3’ @ 5K");
  assert.equal(draft.type, "WORKOUT");
  assert.equal(draft.pace, "5K effort on reps");
  assert.deepEqual(draft.groups, ["B"]);
  assert.equal(session(result, "maya", "2026-09-15").mainSet, "50-60' EZ");
});

test("TBD-INJ blocks without silently using the saved group; choose a group or explicitly skip", async () => {
  const source = await bytes(workbook([["Maya", "TBD-INJ", "80-90"]]));
  const roster = [athlete("maya", "Maya Stone", "A")];
  const unresolved = await parseWeeklyWorkbook(source, MONDAY, roster);
  assert.equal(unresolved.athletes[0].status, "needs_group");
  assert.match(unresolved.errors.join("\n"), /TBD-INJ/);
  assert.equal(unresolved.workouts.length, 0);
  const resolved = await parseWeeklyWorkbook(source, MONDAY, roster, { "row-2": { volumeGroup: "D" } });
  assert.deepEqual(resolved.errors, []);
  assert.equal(session(resolved, "maya", "2026-09-15").mainSet, "20-30' EZ");
  const skipped = await parseWeeklyWorkbook(source, MONDAY, roster, { "row-2": { skip: true } });
  assert.deepEqual(skipped.errors, []);
  assert.equal(skipped.athletes[0].status, "skipped");
  assert.equal(skipped.workouts.length, 0);
});

test("an explicit blank workout group removes a split override", async () => {
  const result = await parseWeeklyWorkbook(await bytes(workbook([["Maya", "VOL: C, WO: D", "80-90"]])), MONDAY,
    [athlete("maya", "Maya Stone")], { "row-2": { workoutGroup: "" } });
  assert.deepEqual(result.errors, []);
  assert.equal(result.athletes[0].workoutGroup, null);
  assert.equal(session(result, "maya").mainSet, "5-7 X 5' @ ST-MT W/ 60-90\"");
});

test("first-name and surname initials disambiguate; ambiguous names require a resolution", async () => {
  const roster = [athlete("rose", "Avery Rose"), athlete("vale", "Avery Vale"), athlete("maya", "Maya O'Brien")];
  const matched = await parseWeeklyWorkbook(await bytes(workbook([["AVERY R.", "A"], ["avery v", "B"], ["MAYA OBRIEN", "C"]])), MONDAY, roster);
  assert.deepEqual(matched.errors, []);
  assert.deepEqual(matched.athletes.map((row) => row.athleteId), ["rose", "vale", "maya"]);
  const ambiguousBytes = await bytes(workbook([["AVERY", "A"]]));
  const ambiguous = await parseWeeklyWorkbook(ambiguousBytes, MONDAY, roster);
  assert.equal(ambiguous.athletes[0].status, "unmatched");
  assert.match(ambiguous.errors.join("\n"), /more than one athlete/);
  const resolved = await parseWeeklyWorkbook(ambiguousBytes, MONDAY, roster, { "row-2": { athleteId: "vale" } });
  assert.deepEqual(resolved.errors, []);
  assert.equal(resolved.athletes[0].athleteId, "vale");
  const email = await parseWeeklyWorkbook(await bytes(workbook([["MAYA@EXAMPLE.TEST", "A"]])), MONDAY, roster);
  assert.equal(email.athletes[0].athleteId, "maya");
});

test("unmatched and absent athletes stay untouched; no arbitrary fuzzy match", async () => {
  const result = await parseWeeklyWorkbook(await bytes(workbook([["May", "A"]])), MONDAY, [athlete("maya", "Maya Stone")]);
  assert.equal(result.athletes[0].status, "unmatched");
  assert.ok(result.errors.length);
  assert.equal(result.workouts.length, 0);
  assert.match(result.warnings.join("\n"), /left untouched: Maya Stone/);
});

test("duplicate chart aliases targeting one athlete block until a duplicate is explicitly skipped", async () => {
  const source = await bytes(workbook([["Maya", "A"], ["Maya Stone", "B"]]));
  const roster = [athlete("maya", "Maya Stone")];
  const result = await parseWeeklyWorkbook(source, MONDAY, roster);
  assert.match(result.errors.join("\n"), /duplicate Pace Chart rows/);
  assert.equal(result.workouts.length, 0);
  const resolved = await parseWeeklyWorkbook(source, MONDAY, roster, { "row-3": { skip: true } });
  assert.deepEqual(resolved.errors, []);
  assert.equal(session(resolved, "maya", "2026-09-15").mainSet, "50-60' EZ");
});

test("unknown resolution keys, groups and roster IDs are rejected", async () => {
  const source = await bytes(workbook());
  const invalidResolutions: ImportResolutions[] = [{ "row-99": { skip: true } }, { "row-2": { volumeGroup: "Z" } }, { "row-2": { athleteId: "other-team" } }];
  for (const resolutions of invalidResolutions) {
    const result = await parseWeeklyWorkbook(source, MONDAY, [athlete("maya", "Maya Stone")], resolutions);
    assert.ok(result.errors.length);
  }
});

test("identical chart shorthand names can be resolved to distinct roster athletes", async () => {
  const source = await bytes(workbook([["Alex", "A"], ["Alex", "B"]]));
  const roster = [athlete("alex-runner", "Alex Runner"), athlete("alex-smith", "Alex Smith")];
  const unresolved = await parseWeeklyWorkbook(source, MONDAY, roster);
  assert.ok(unresolved.errors.length);
  const resolved = await parseWeeklyWorkbook(source, MONDAY, roster, {
    "row-2": { athleteId: "alex-runner" }, "row-3": { athleteId: "alex-smith" },
  });
  assert.deepEqual(resolved.errors, []);
  assert.deepEqual(resolved.athletes.map((row) => row.status), ["matched", "matched"]);
  assert.equal(session(resolved, "alex-runner", "2026-09-15").mainSet, "50-60' EZ");
  assert.equal(session(resolved, "alex-smith", "2026-09-15").mainSet, "40-50' EZ");
  const sameId = await parseWeeklyWorkbook(source, MONDAY, roster, {
    "row-2": { athleteId: "alex-runner" }, "row-3": { athleteId: "alex-runner" },
  });
  assert.match(sameId.errors.join("\n"), /duplicate Pace Chart rows/);
  assert.equal(sameId.workouts.length, 0);
});

test("long-run classification uses each chart target, never the saved profile target", async () => {
  const book = workbook([["Maya", "A", "70-80"], ["Sam", "A", "65-75"]]);
  book.getWorksheet("Training")!.getCell("C9").value = "70-80' EZ";
  const result = await parseWeeklyWorkbook(await bytes(book), MONDAY, [athlete("maya", "Maya Stone", "A", "65-75"), athlete("sam", "Sam Lane", "A", "70-80")]);
  assert.equal(session(result, "maya", "2026-09-15").type, "LONG_RUN");
  assert.equal(session(result, "sam", "2026-09-15").type, "EASY");
  assert.equal(session(result, "maya", "2026-09-15").mainSet, "70-80' EZ");
});

test("unknown text and reps without a stated effort never gain a guessed easy or interval pace", async () => {
  for (const raw of ["CHECK IN WITH COACH", "8 X 400 W/ JOG RECOVERY"]) {
    const book = workbook();
    book.getWorksheet("Training")!.getCell("B9").value = raw;
    const result = await parseWeeklyWorkbook(await bytes(book), MONDAY, [athlete("maya", "Maya Stone")]);
    const draft = session(result, "maya");
    assert.equal(draft.title, "Training session");
    assert.equal(draft.type, "WORKOUT");
    assert.equal(draft.pace, null);
    assert.equal(draft.mainSet, raw);
    assert.match(result.warnings.join("\n"), /without an inferred pace or intensity/);
  }
});

test("row labels and headers are discovered even when rows move", async () => {
  const result = await parseWeeklyWorkbook(await bytes(workbook([["Maya", "A", "80-90"]], 3)), MONDAY, [athlete("maya", "Maya Stone")]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.athletes[0].key, "row-5");
  assert.equal(session(result, "maya").location, "6:50 AM · TRACK");
});

test("strict Monday dates reject malformed, impossible and non-Monday values", async () => {
  const source = await bytes(workbook());
  for (const date of ["2026-9-14", "2026-02-30", "2026-09-15", "2026-09-14T00:00:00Z", "not-a-date"]) {
    const result = await parseWeeklyWorkbook(source, date, []);
    assert.match(result.errors.join("\n"), /valid Monday/);
    assert.equal(result.workouts.length, 0);
  }
});

test("week headings and dated day headers must agree with the selected week", async () => {
  for (const [cell, value] of [["A1", "WEEK 15: 9/14/2025-9/20/2025"], ["A1", "WEEK 15: 9/7-9/13"], ["B3", "MON 9/15"]]) {
    const book = workbook();
    book.getWorksheet("Training")!.getCell(cell).value = value;
    const result = await parseWeeklyWorkbook(await bytes(book), MONDAY, []);
    assert.match(result.errors.join("\n"), /must match|does not match/);
  }
  const crossing = workbook();
  crossing.getWorksheet("Training")!.getCell("A1").value = "WEEK 30: 12/28-1/3";
  const result = await parseWeeklyWorkbook(await bytes(crossing), "2026-12-28", [athlete("maya", "Maya Stone")]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.weekEnd, "2027-01-03");
});

test("missing required sheets or group/header rows produce preview errors", async () => {
  for (const sheet of ["Pace Chart", "Training"]) {
    const book = workbook();
    book.removeWorksheet(book.getWorksheet(sheet)!.id);
    const result = await parseWeeklyWorkbook(await bytes(book), MONDAY, []);
    assert.match(result.errors.join("\n"), /Include exactly one sheet/);
  }
  const duplicate = workbook();
  duplicate.getWorksheet("Training")!.addRow(["A", "OFF"]);
  assert.match((await parseWeeklyWorkbook(await bytes(duplicate), MONDAY, [])).errors.join("\n"), /duplicate A rows/);
  const missingHeader = workbook();
  missingHeader.getWorksheet("Pace Chart")!.getCell("B1").value = "Other";
  assert.match((await parseWeeklyWorkbook(await bytes(missingHeader), MONDAY, [])).errors.join("\n"), /header row/);
});

test("formulas in critical cells are refused even with plausible cached results", async () => {
  for (const [sheet, address, result] of [["Training", "B9", "OFF"], ["Training", "A1", "WEEK 15: 9/14-9/20"], ["Pace Chart", "A2", "Maya Stone"], ["Pace Chart", "B2", "A"], ["Pace Chart", "C2", "80-90"]]) {
    const book = workbook();
    book.getWorksheet(sheet)!.getCell(address).value = { formula: '"stale"', result };
    const parsed = await parseWeeklyWorkbook(await bytes(book), MONDAY, [athlete("maya", "Maya Stone")]);
    assert.match(parsed.errors.join("\n"), /Formula.*cached result/);
  }
  const irrelevantPace = workbook();
  irrelevantPace.getWorksheet("Pace Chart")!.getCell("D2").value = { formula: "1+1", result: 2 };
  assert.deepEqual((await parseWeeklyWorkbook(await bytes(irrelevantPace), MONDAY, [athlete("maya", "Maya Stone")])).errors, []);
});

test("oversized dimensions are rejected; unreadable files raise a 400 error", async () => {
  const book = workbook();
  book.getWorksheet("Training")!.getCell("A1001").value = "too far";
  assert.match((await parseWeeklyWorkbook(await bytes(book), MONDAY, [])).errors.join("\n"), /exceeds the limit/);
  await assert.rejects(() => parseWeeklyWorkbook(Buffer.from("not an xlsx"), MONDAY, []), (error: unknown) => error instanceof Error && "status" in error && error.status === 400);
});

test("optional real workbook fixture preserves the September split groups and time cells", { skip: !process.env.WORKOUT_IMPORT_FIXTURE }, async () => {
  const source = await readFile(process.env.WORKOUT_IMPORT_FIXTURE!);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(source as unknown as Parameters<typeof book.xlsx.load>[0]);
  const chart = book.getWorksheet("Pace Chart")!;
  const roster: ImportRosterAthlete[] = [];
  const resolutions: Record<string, { skip: true }> = {};
  chart.eachRow((row, number) => {
    if (number === 1 || !row.getCell(1).text) return;
    roster.push(athlete(`fixture-${number}`, row.getCell(1).text));
    if (row.getCell(2).text === "TBD-INJ") resolutions[`row-${number}`] = { skip: true };
  });
  const result = await parseWeeklyWorkbook(source, MONDAY, roster, resolutions);
  assert.deepEqual(result.errors, []);
  assert.equal(result.athletes.length, 17);
  assert.equal(result.athletes.filter((row) => row.status === "matched").length, 16);
  assert.equal(result.workouts.reduce((sum, draft) => sum + draft.athleteIds.length, 0), 112);
  assert.equal(session(result, "fixture-9").mainSet, "6-8 X 3' @ ST-MT W/ 1'");
  assert.equal(session(result, "fixture-9", "2026-09-15").mainSet, "30-40' EZ");
  assert.equal(session(result, "fixture-17", "2026-09-15").mainSet, "20-30' EZ");
  assert.match(session(result, "fixture-9").location!, /^6:50 AM/);
});
