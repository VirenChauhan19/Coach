/* eslint-disable no-console */
/**
 * Re-anchors existing workouts to the storage format the app now uses:
 * 12:00 UTC on the calendar day the session belongs to.
 *
 * Why this is needed: workouts used to be stored at ~07:00 UTC (an artifact of
 * anchoring "7:00 AM" in the *server's* timezone, which is UTC in production).
 * That reads back as the correct day in Eastern, but as 11:00 PM the *previous*
 * day for anyone on the US West Coast in winter. Now that the app renders each
 * viewer's own days, those rows would show up a day early for a travelling
 * athlete. Noon UTC leaves a 12-hour margin either side, so every zone from
 * UTC-11 to UTC+11 resolves it to the same day.
 *
 * The intended day is whatever the row currently reads as in the team's home
 * zone, that is the day the coach meant when they created it.
 *
 * Dry run (default):  npx tsx scripts/normalize-workout-dates.ts
 * Apply:              npx tsx scripts/normalize-workout-dates.ts --apply
 *
 * Safe to re-run: rows already at 12:00Z are left untouched.
 */
import { PrismaClient } from "@prisma/client";
import { dateHelpers, TEAM_TIME_ZONE, workoutInstantForDay } from "../src/lib/date";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const { dayKey, format } = dateHelpers(TEAM_TIME_ZONE);

async function main() {
  const workouts = await prisma.workout.findMany({
    select: { id: true, title: true, date: true },
    orderBy: { date: "asc" },
  });

  console.log(`Team zone: ${TEAM_TIME_ZONE}`);
  console.log(`${workouts.length} workout(s) found.\n`);

  const changes = workouts
    .map((w) => ({ ...w, target: workoutInstantForDay(dayKey(w.date)) }))
    .filter((w) => w.date.getTime() !== w.target.getTime());

  if (changes.length === 0) {
    console.log("Every workout is already anchored at 12:00 UTC. Nothing to do.");
    return;
  }

  console.log(`${changes.length} workout(s) need re-anchoring:\n`);
  for (const w of changes.slice(0, 20)) {
    console.log(
      `  ${format(w.date, "EEE MMM d yyyy")}  ${w.date.toISOString()} -> ${w.target.toISOString()}  ${w.title}`
    );
  }
  if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);

  // The day each session lands on must not move, only the time-of-day within
  // it. If any row would change days, something is wrong; stop rather than
  // silently reschedule somebody's training.
  const dayMoves = changes.filter((w) => dayKey(w.date) !== dayKey(w.target));
  if (dayMoves.length > 0) {
    console.error(
      `\nABORT: ${dayMoves.length} row(s) would land on a different calendar day.`
    );
    for (const w of dayMoves.slice(0, 10)) {
      console.error(`  ${w.id}  ${dayKey(w.date)} -> ${dayKey(w.target)}  ${w.title}`);
    }
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to commit.");
    return;
  }

  console.log("\nApplying...");
  let done = 0;
  for (const w of changes) {
    await prisma.workout.update({ where: { id: w.id }, data: { date: w.target } });
    done++;
  }
  console.log(`Updated ${done} workout(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
