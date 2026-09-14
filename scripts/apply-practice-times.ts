/* eslint-disable no-console */
// One-off: put the logistics rows of "Training, 9-14.xlsx" onto the live plan, 
// practice time and place, the evening team meeting, and each athlete's slot in
// the lift window.
//
// Time and place are properties of the *day*, not of a mileage group, so this
// matches on date alone and touches every workout scheduled that day. That also
// makes it independent of scripts/apply-mileage-groups.ts: the two can run in
// either order, and re-running either one is a no-op.
//
// Lift slots came from the coach by message rather than from the workbook. They
// live on the athlete because the sheet schedules one window for the whole
// squad ("10:00, 2:00, 5:00 (SEE E-MAIL)") and splits it by name separately.
//
// It refuses to overwrite a note that nobody generated, if the text in the
// database is neither the old plan note nor the new one, someone edited it by
// hand and it is reported instead.
//
// Dry run:  npx tsx scripts/apply-practice-times.ts
// Apply:    npx tsx scripts/apply-practice-times.ts --apply
import { PrismaClient } from "@prisma/client";
import { workoutInstantForDay } from "../src/lib/date";
import { ATHLETES, WEEKS } from "../prisma/scad-data";
import { prNote, workoutLocation } from "../prisma/classify";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const WEEK = 15;
const show = (v: unknown) => (v === null || v === undefined ? "—" : JSON.stringify(v));

async function main() {
  console.log(APPLY ? "APPLYING practice times + lift slots\n" : "DRY RUN — pass --apply to write\n");

  const week = WEEKS.find((w) => w.week === WEEK);
  if (!week) throw new Error(`week ${WEEK} missing from scad-data`);
  const monday = workoutInstantForDay(week.start);

  const problems: string[] = [];
  const edits: { ids: string[]; location: string | null; notes: string | null }[] = [];

  for (let d = 0; d < 7; d++) {
    const day = week.days[d];
    if (!day) continue;
    const date = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000);
    const location = workoutLocation(day);
    const notes = prNote(day.PR, day.meeting);
    const notesBefore = prNote(day.PR); // what the plan produced before the meeting row

    const rows = await prisma.workout.findMany({
      where: { date },
      select: { id: true, title: true, location: true, notes: true },
    });
    if (!rows.length) {
      problems.push(`${date.toISOString().slice(0, 10)}: no workouts on this day`);
      continue;
    }

    const stale = rows.filter((r) => r.location !== location || r.notes !== notes);
    for (const r of rows) {
      if (r.notes !== notes && r.notes !== notesBefore) {
        problems.push(
          `${date.toISOString().slice(0, 10)} "${r.title}": notes are ${show(r.notes)}, which no version of the plan wrote — edited by hand, skipping`
        );
      }
    }
    if (!stale.length) {
      console.log(`${date.toISOString().slice(0, 10)}  ${rows.length} workout(s) — already up to date`);
      continue;
    }
    console.log(`${date.toISOString().slice(0, 10)}  ${stale.length} workout(s)`);
    if (stale.some((r) => r.location !== location)) console.log(`  location ${show(stale[0].location)}  ->  ${show(location)}`);
    if (stale.some((r) => r.notes !== notes)) console.log(`  notes    ${show(stale[0].notes)}  ->  ${show(notes)}`);
    edits.push({ ids: stale.map((r) => r.id), location, notes });
  }

  /* ------------------------------------------------------- lift slots */
  const users = await prisma.user.findMany({
    where: { role: "ATHLETE" },
    select: { id: true, name: true, email: true, paces: true },
  });
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const liftEdits: { id: string; name: string; json: string; from: string | undefined; to: string | undefined }[] = [];

  for (const a of ATHLETES) {
    const u = byEmail.get(a.email);
    if (!u) continue;
    const current = JSON.parse(u.paces ?? "{}") as Record<string, string | undefined>;
    if (current.liftTime === a.liftTime) continue;
    const next = { ...current, liftTime: a.liftTime };
    if (a.liftTime === undefined) delete next.liftTime;
    liftEdits.push({ id: u.id, name: a.name, json: JSON.stringify(next), from: current.liftTime, to: a.liftTime });
  }

  console.log(`\n--- lift slots: ${liftEdits.length} athlete(s) ---`);
  for (const e of liftEdits) console.log(`  ${e.name.padEnd(10)} ${show(e.from)} -> ${show(e.to)}`);
  const noSlot = ATHLETES.filter((a) => !a.liftTime).map((a) => a.name);
  if (noSlot.length) console.log(`  (no slot on the coach's list: ${noSlot.join(", ")})`);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s) — NOTHING WRITTEN:`);
    for (const p of problems) console.log(`  ! ${p}`);
    process.exitCode = 1;
    return;
  }
  if (!APPLY) {
    console.log(`\nDry run complete — nothing written. ${edits.reduce((n, e) => n + e.ids.length, 0)} workout(s), ${liftEdits.length} athlete(s) would change.`);
    return;
  }

  await prisma.$transaction([
    ...edits.map((e) => prisma.workout.updateMany({ where: { id: { in: e.ids } }, data: { location: e.location, notes: e.notes } })),
    ...liftEdits.map((e) => prisma.user.update({ where: { id: e.id }, data: { paces: e.json } })),
  ]);

  console.log(`\nUpdated ${edits.reduce((n, e) => n + e.ids.length, 0)} workout(s) and ${liftEdits.length} athlete(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
