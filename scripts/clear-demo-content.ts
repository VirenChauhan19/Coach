/* eslint-disable no-console */
// Strip the invented content out of a seeded database, leaving the real plan.
//
// The seed fills the app with a lived-in demo: made-up feedback on every past
// session ("Legs were heavy early but came around"), a randomised spread of
// completed / skipped / needs-discussion statuses, announcements, coach DMs, a
// team chat, photos, and a (404) 555-0xxx phone number for everybody. That is
// the right thing for showing the app off and the wrong thing for a team about
// to start logging real training against it.
//
// What is kept: the roster, the workouts, the assignments that put each athlete
// on their sessions, and any note a coach wrote on one. What goes: everything a
// person would otherwise have had to type.
//
// Dry run:  npx tsx scripts/clear-demo-content.ts
// Apply:    npx tsx scripts/clear-demo-content.ts --apply
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const SEEDED_PHONE = "(404) 555-0";

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — pass --apply to write\n");

  const feedback = await prisma.feedback.count();
  const messages = await prisma.message.groupBy({ by: ["type"], _count: true });
  const statuses = await prisma.assignment.groupBy({ by: ["status"], _count: true });
  const logged = await prisma.assignment.count({ where: { status: { not: "ASSIGNED" } } });
  const phones = await prisma.user.count({ where: { phone: { startsWith: SEEDED_PHONE } } });
  const notes = await prisma.assignment.count({ where: { customNote: { not: null } } });

  console.log(`feedback entries:      ${feedback}  (all deleted)`);
  console.log(`messages:              ${messages.map((m) => `${m.type} ${m._count}`).join(", ") || "none"}  (all deleted)`);
  console.log(`assignment statuses:   ${statuses.map((s) => `${s.status} ${s._count}`).join(", ")}`);
  console.log(`  -> ${logged} reset to ASSIGNED, viewed/responded timestamps cleared`);
  console.log(`placeholder phones:    ${phones}  (cleared)`);
  console.log(`\nkept: ${await prisma.user.count()} accounts, ${await prisma.workout.count()} workouts, ${await prisma.assignment.count()} assignments, ${notes} coach note(s)`);

  if (!APPLY) {
    console.log("\nDry run complete — nothing written.");
    return;
  }

  const [, , assignments, cleared] = await prisma.$transaction([
    prisma.feedback.deleteMany(),
    prisma.message.deleteMany(),
    prisma.assignment.updateMany({
      data: { status: "ASSIGNED", viewedAt: null, respondedAt: null },
    }),
    prisma.user.updateMany({
      where: { phone: { startsWith: SEEDED_PHONE } },
      data: { phone: null },
    }),
    // Unread cursors for feeds that no longer have anything in them.
    prisma.user.updateMany({
      data: { lastReadAnnouncementsAt: null, lastReadTeamChatAt: null },
    }),
  ]);

  console.log(`\nDone. ${feedback} feedback entries and every message deleted, ${assignments.count} assignments back to ASSIGNED, ${cleared.count} phone number(s) cleared.`);
  console.log("Every session now reads as not yet logged, which is where a real week starts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
