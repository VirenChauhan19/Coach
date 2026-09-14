/* eslint-disable no-console */
// One-off: push the coach's revised phase-2 Tuesday sessions ("SCAD XC 2026
// phase 2.xlsx") onto the live plan. He replaced the four "3K/5K WO #1-#4"
// placeholders in weeks 9-12 with the actual rep prescriptions.
//
// Deploys never run prisma/seed.ts (it resets the database), so the rows that
// are already in Postgres have to be edited in place. Updating rather than
// recreating keeps every assignment, view state, and logged feedback attached
// to these workouts intact.
//
// A/B/C get identical text on these days, so each one is a single TEAM workout.
// New values come from WEEKS + classify(), the same path the seed uses, so a
// future reseed produces exactly what this writes.
//
// Dry run:  npx tsx scripts/update-phase2-workouts.ts
// Apply:    npx tsx scripts/update-phase2-workouts.ts --apply
// Idempotent: re-running after a successful apply is a no-op.
import { PrismaClient } from "@prisma/client";
import { WEEKS } from "../prisma/scad-data";
import { classify } from "../prisma/classify";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// The placeholder each week's Tuesday used to carry, and still does in any
// database seeded before this change.
const PLACEHOLDERS: Record<number, string> = {
  9: "3K/5K WO #1",
  10: "3K/5K WO #2",
  11: "3K/5K WO #3",
  12: "3K/5K WO #4",
};

const GROUP_A_LR = "90-100"; // what the seed passes for these team-wide days

async function main() {
  console.log(APPLY ? "APPLYING phase-2 updates\n" : "DRY RUN — pass --apply to write\n");

  let updated = 0;
  let alreadyDone = 0;
  let missing = 0;

  for (const [wk, placeholder] of Object.entries(PLACEHOLDERS)) {
    const week = WEEKS.find((w) => w.week === Number(wk));
    if (!week) throw new Error(`week ${wk} missing from scad-data`);

    const tue = week.days[1];
    if (tue.A !== tue.B || tue.A !== tue.C)
      throw new Error(`week ${wk} Tuesday is no longer one team workout: ${JSON.stringify(tue)}`);

    const next = classify(tue.A, GROUP_A_LR);
    if (!next) throw new Error(`week ${wk} Tuesday did not classify: ${tue.A}`);
    if (next.type !== "WORKOUT")
      throw new Error(`week ${wk} Tuesday classified as ${next.type}, expected WORKOUT — check classify()`);

    const stale = await prisma.workout.findMany({
      where: { mainSet: placeholder },
      select: { id: true, date: true, title: true, _count: { select: { assignments: true, feedback: true } } },
    });

    if (stale.length === 0) {
      const done = await prisma.workout.count({ where: { mainSet: next.mainSet } });
      if (done > 0) {
        alreadyDone++;
        console.log(`week ${wk}: already updated (${done} row(s) carry the new text) — skipping`);
      } else {
        missing++;
        console.log(`week ${wk}: NOT FOUND — no workout with mainSet ${JSON.stringify(placeholder)}`);
      }
      continue;
    }

    for (const w of stale) {
      console.log(
        `week ${wk}  ${w.date.toISOString().slice(0, 10)}  ${w._count.assignments} assignment(s), ${w._count.feedback} feedback\n` +
          `  title:   ${JSON.stringify(w.title)}  ->  ${JSON.stringify(next.title)}\n` +
          `  mainSet: ${JSON.stringify(placeholder)}  ->  ${JSON.stringify(next.mainSet)}\n` +
          `  pace:    -> ${JSON.stringify(next.pace)}`
      );
    }

    if (APPLY) {
      const res = await prisma.workout.updateMany({
        where: { mainSet: placeholder },
        data: {
          title: next.title,
          mainSet: next.mainSet,
          type: next.type,
          pace: next.pace,
          distance: next.distance,
        },
      });
      updated += res.count;
    }
  }

  console.log(
    `\n${APPLY ? `Updated ${updated} workout(s).` : "Dry run complete — nothing written."}` +
      (alreadyDone ? ` ${alreadyDone} week(s) already up to date.` : "") +
      (missing ? ` ${missing} week(s) NOT FOUND — investigate before assuming success.` : "")
  );

  if (APPLY && missing === 0) {
    const left = await prisma.workout.count({ where: { mainSet: { in: Object.values(PLACEHOLDERS) } } });
    console.log(left === 0 ? "Verified: no placeholder sessions remain." : `WARNING: ${left} placeholder(s) still present.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
