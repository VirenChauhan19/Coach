/* eslint-disable no-console */
// One-off: push the coach's "Training, 9-14.xlsx" workbook onto the live plan.
//
// Two things changed in it. Week 15 (9/14-9/20) was restructured — Monday went
// from a rest day to 5-7 x 5' at tempo, Wednesday's "TEMPO WO #2" placeholder
// became 8-10 x 90" at 8K/6K, and Tuesday's strides were dropped — and the pace
// chart was re-cut for all but two athletes, gaining a second tempo zone (LT-2)
// and a cross-training duration target.
//
// Deploys never run prisma/seed.ts (it resets the database), so the rows
// already in Postgres have to be edited in place. Every workout is matched to
// its replacement by the exact set of athletes assigned to it, and updated
// rather than recreated, so assignments, view state and logged feedback stay
// attached. If a day's athletes don't line up the script refuses to write
// anything — a silent create/delete would drop that history on the floor.
//
// New values come from WEEKS/ATHLETES + classify() — the same path the seed
// uses — so a future reseed produces exactly what this writes.
//
// Dry run:  npx tsx scripts/update-week15-plan.ts
// Apply:    npx tsx scripts/update-week15-plan.ts --apply
// Idempotent: re-running after a successful apply is a no-op.
import { PrismaClient } from "@prisma/client";
import { workoutInstantForDay } from "../src/lib/date";
import { ATHLETES, WEEKS } from "../prisma/scad-data";
import { classify, prNote } from "../prisma/classify";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const WEEK = 15;

const key = (ids: string[]) => [...ids].sort().join(",");
const show = (v: unknown) => (v === null || v === undefined ? "—" : JSON.stringify(v));

type Desired = {
  date: Date;
  groups: string[];
  athleteIds: string[];
  title: string;
  type: string;
  scope: string;
  distance: string | null;
  mainSet: string | null;
  pace: string | null;
  notes: string | null;
};

async function main() {
  console.log(APPLY ? "APPLYING the 9-14 workbook\n" : "DRY RUN — pass --apply to write\n");

  const week = WEEKS.find((w) => w.week === WEEK);
  if (!week) throw new Error(`week ${WEEK} missing from scad-data`);

  const roster = await prisma.user.findMany({
    where: { role: "ATHLETE", active: true },
    select: { id: true, name: true, email: true, mileageGroup: true, paces: true, lrTarget: true, ezTarget: true },
  });
  console.log(`roster: ${roster.length} active athletes\n`);

  // long-run target per group, exactly as the seed derives it
  const GROUP_LR: Record<string, string> = {};
  for (const a of ATHLETES) GROUP_LR[a.group] = a.lrTarget;

  /* ------------------------------------------------ 1. week 15 workouts */
  const monday = workoutInstantForDay(week.start);
  const desired: Desired[] = [];

  for (let d = 0; d < 7; d++) {
    const day = week.days[d];
    if (!day) continue;
    const date = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000);
    const notes = prNote(day.PR);

    const cells: Record<string, string | undefined> = { A: day.A, B: day.B, C: day.C, D: day.D };
    const byText = new Map<string, string[]>();
    for (const g of ["A", "B", "C", "D"]) {
      const txt = cells[g];
      if (!txt) continue;
      if (!byText.has(txt)) byText.set(txt, []);
      byText.get(txt)!.push(g);
    }

    for (const [txt, groups] of byText) {
      const athletes = roster.filter((a) => a.mileageGroup && groups.includes(a.mileageGroup));
      if (!athletes.length) {
        console.log(`  note: ${week.start}+${d} group ${groups.join("/")} has no athletes — ${JSON.stringify(txt)} not scheduled`);
        continue;
      }
      const c = classify(txt, GROUP_LR[groups[0]] ?? "90-100");
      if (!c) throw new Error(`did not classify: ${txt}`);
      if (c.type === "EASY" && c.mainSet === txt)
        throw new Error(`classify() fell through to the Easy Run default for ${JSON.stringify(txt)} — teach it this format first`);

      desired.push({
        date,
        groups,
        athleteIds: athletes.map((a) => a.id),
        title: c.title,
        type: c.type,
        scope: athletes.length === roster.length ? "TEAM" : "INDIVIDUAL",
        distance: c.distance,
        mainSet: c.mainSet,
        pace: c.pace,
        notes,
      });
    }
  }

  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const existing = await prisma.workout.findMany({
    where: { date: { gte: monday, lte: sunday } },
    include: { assignments: { select: { athleteId: true } }, _count: { select: { feedback: true } } },
  });

  const byAthleteSet = new Map<string, (typeof existing)[number]>();
  for (const w of existing) byAthleteSet.set(`${w.date.toISOString()}|${key(w.assignments.map((a) => a.athleteId))}`, w);

  const plan: { id: string; d: Desired; before: (typeof existing)[number] }[] = [];
  const problems: string[] = [];

  for (const d of desired) {
    const k = `${d.date.toISOString()}|${key(d.athleteIds)}`;
    const match = byAthleteSet.get(k);
    if (!match) {
      problems.push(
        `no existing workout on ${d.date.toISOString().slice(0, 10)} covers exactly groups ${d.groups.join("/")} ` +
          `(${d.athleteIds.length} athletes) — would need a create, refusing`
      );
      continue;
    }
    byAthleteSet.delete(k);
    plan.push({ id: match.id, d, before: match });
  }
  for (const leftover of byAthleteSet.values())
    problems.push(
      `existing workout ${leftover.date.toISOString().slice(0, 10)} "${leftover.title}" ` +
        `(${leftover.assignments.length} athletes) has no replacement — would need a delete, refusing`
    );

  let changed = 0;
  for (const { d, before } of plan.sort((a, b) => a.d.date.getTime() - b.d.date.getTime())) {
    const fields: [string, unknown, unknown][] = [
      ["title", before.title, d.title],
      ["type", before.type, d.type],
      ["scope", before.scope, d.scope],
      ["distance", before.distance, d.distance],
      ["pace", before.pace, d.pace],
      ["mainSet", before.mainSet, d.mainSet],
      ["notes", before.notes, d.notes],
    ];
    const diffs = fields.filter(([, a, b]) => a !== b);
    const head = `${d.date.toISOString().slice(0, 10)}  ${d.groups.join("/")}  ${d.athleteIds.length} athlete(s), ${before._count.feedback} feedback`;
    if (!diffs.length) {
      console.log(`${head}\n  already up to date ("${before.title}")`);
      continue;
    }
    changed++;
    console.log(head);
    for (const [f, a, b] of diffs) console.log(`  ${f.padEnd(8)} ${show(a)}  ->  ${show(b)}`);
  }

  /* --------------------------------------------------- 2. pace targets */
  const byEmail = new Map(roster.map((a) => [a.email, a]));
  const paceUpdates: { id: string; name: string; json: string; diffs: string[] }[] = [];

  for (const a of ATHLETES) {
    const user = byEmail.get(a.email);
    if (!user) {
      console.log(`\npace chart: ${a.name} has no active account — skipped`);
      continue;
    }
    // lrTarget / ezTarget live in their own columns and this workbook did not
    // move them; flag it rather than silently widening what we write.
    if (user.lrTarget !== a.lrTarget || user.ezTarget !== a.ezTarget)
      problems.push(`${a.name}: lr/ez target drift (db ${user.lrTarget}/${user.ezTarget} vs chart ${a.lrTarget}/${a.ezTarget})`);

    const next = { ...a.paces, doubleFreq: a.doubleFreq, xtFreq: a.xtFreq, xtTarget: a.xtTarget };
    const json = JSON.stringify(next);
    if (user.paces === json) continue;

    const prev = JSON.parse(user.paces ?? "{}") as Record<string, string>;
    const diffs = [...new Set([...Object.keys(prev), ...Object.keys(next)])]
      .filter((k2) => prev[k2] !== (next as Record<string, string | undefined>)[k2])
      .map((k2) => `${k2}: ${show(prev[k2])} -> ${show((next as Record<string, string | undefined>)[k2])}`);
    paceUpdates.push({ id: user.id, name: a.name, json, diffs });
  }

  console.log(`\n--- pace chart: ${paceUpdates.length} athlete(s) to update ---`);
  for (const u of paceUpdates) console.log(`${u.name.padEnd(10)} ${u.diffs.join("; ")}`);

  /* --------------------------------------------------------- 3. write */
  if (problems.length) {
    console.log(`\n${problems.length} problem(s) — NOTHING WRITTEN:`);
    for (const p of problems) console.log(`  ! ${p}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log(`\nDry run complete — nothing written. ${changed} workout(s) and ${paceUpdates.length} athlete(s) would change.`);
    return;
  }

  await prisma.$transaction([
    ...plan.map(({ id, d }) =>
      prisma.workout.update({
        where: { id },
        data: { title: d.title, type: d.type, scope: d.scope, distance: d.distance, pace: d.pace, mainSet: d.mainSet, notes: d.notes },
      })
    ),
    ...paceUpdates.map((u) => prisma.user.update({ where: { id: u.id }, data: { paces: u.json } })),
  ]);

  console.log(`\nUpdated ${plan.length} workout(s) (${changed} with changes) and ${paceUpdates.length} athlete(s).`);

  const stale = await prisma.workout.count({ where: { mainSet: "TEMPO WO #2", date: { gte: monday, lte: sunday } } });
  console.log(stale === 0 ? "Verified: no 'TEMPO WO #2' placeholder left in week 15." : `WARNING: ${stale} placeholder(s) still present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
