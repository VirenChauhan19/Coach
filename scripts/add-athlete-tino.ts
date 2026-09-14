/* eslint-disable no-console */
// One-off: put Tino on the roster.
//
// He is on the "Training, 9-14.xlsx" pace chart (group D, 40-50 LR, 20-30 EZ)
// but joined after the database was seeded, so he has no account and no
// sessions. prisma/scad-data.ts now carries him; this walks him into the live
// database without touching anybody else.
//
// Two steps, both idempotent:
//
//   1. Create his user from his scad-data entry, on the same demo password his
//      teammates hold. Re-running refreshes his profile fields only.
//   2. Give him the sessions his group gets. Where the row he follows is
//      already a workout in the database (the Wednesday reps, the pre-meet, the
//      race, the off day are one text for every group) he is attached to it;
//      where D differs from A/B/C and nobody was in D, the workout is created
//      for him. Nothing existing is edited or deleted.
//
// Group D only appears in week 15 onward, so that is where his plan starts.
//
// Dry run:  npx tsx scripts/add-athlete-tino.ts
// Apply:    npx tsx scripts/add-athlete-tino.ts --apply
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { workoutInstantForDay } from "../src/lib/date";
import { ATHLETES, WEEKS } from "../prisma/scad-data";
import { cellForAthlete, classify, prNote, workoutLocation } from "../prisma/classify";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const EMAIL = "tino@scadxc.com";
// The password every seeded teammate holds; the real rollout re-flags everyone
// together in scripts/provision-accounts.ts.
const DEMO_PASSWORD = "password123";

// Same deterministic phone filler the seed uses, so his profile card isn't the
// only one in the roster with a blank number.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const identity = (c: { title: string; type: string; distance: string | null; mainSet: string | null; pace: string | null }) =>
  [c.title, c.type, c.distance ?? "", c.mainSet ?? "", c.pace ?? ""].join(" ");

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — pass --apply to write\n");

  const seed = ATHLETES.find((a) => a.email === EMAIL);
  if (!seed) throw new Error(`${EMAIL} is not in prisma/scad-data.ts`);

  const team = await prisma.team.findFirst({ select: { id: true, coachId: true } });
  if (!team?.coachId) throw new Error("no team/coach found");

  /* ------------------------------------------------------- 1. account */
  const profile = {
    name: seed.name,
    role: "ATHLETE",
    teamId: team.id,
    active: true,
    mileageGroup: seed.group,
    lrTarget: seed.lrTarget,
    ezTarget: seed.ezTarget,
    paces: JSON.stringify({
      ...seed.paces,
      doubleFreq: seed.doubleFreq,
      xtFreq: seed.xtFreq,
      xtTarget: seed.xtTarget,
      liftTime: seed.liftTime,
    }),
    phone: `(404) 555-0${100 + (hash(seed.email) % 900)}`,
  };

  const existingUser = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  console.log(existingUser ? `account: ${seed.name} <${EMAIL}> already exists — refreshing profile` : `account: CREATE ${seed.name} <${EMAIL}>  group ${seed.group}, LR ${seed.lrTarget}, EZ ${seed.ezTarget}`);

  let athleteId = existingUser?.id ?? "";
  if (APPLY) {
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: profile,
      create: {
        ...profile,
        email: EMAIL,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        lastReadAnnouncementsAt: new Date(),
      },
      select: { id: true },
    });
    athleteId = user.id;
  }

  /* ----------------------------------------------------- 2. sessions */
  const workouts = await prisma.workout.findMany({
    where: { teamId: team.id },
    select: {
      id: true, title: true, type: true, date: true, distance: true, mainSet: true, pace: true,
      assignments: { select: { athleteId: true } },
    },
  });
  const byDate = new Map<string, typeof workouts>();
  for (const w of workouts) {
    const k = w.date.toISOString().slice(0, 10);
    (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(w);
  }

  const attach: { workoutId: string; title: string; date: string }[] = [];
  const creates: { id: string; date: string; title: string; row: Record<string, unknown> }[] = [];
  const problems: string[] = [];

  for (const week of WEEKS) {
    const monday = workoutInstantForDay(week.start);
    for (let d = 0; d < 7; d++) {
      const day = week.days[d];
      if (!day) continue;
      const date = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000);
      const dayKey = date.toISOString().slice(0, 10);

      const txt = cellForAthlete(day, seed.group, seed.workoutGroup);
      if (!txt) continue; // no row for his group that week
      const c = classify(txt, seed.lrTarget);
      if (!c) throw new Error(`did not classify: ${txt}`);

      const hits = (byDate.get(dayKey) ?? []).filter((w) => identity(w) === identity(c));
      if (hits.length > 1) {
        problems.push(`${dayKey}: ${hits.length} workouts share "${c.title}" — cannot tell them apart`);
        continue;
      }
      const match = hits[0];
      if (match) {
        if (athleteId && match.assignments.some((a) => a.athleteId === athleteId)) continue; // already on it
        attach.push({ workoutId: match.id, title: c.title, date: dayKey });
        continue;
      }
      creates.push({
        id: randomUUID(),
        date: dayKey,
        title: c.title,
        row: {
          title: c.title, date, type: c.type, distance: c.distance, mainSet: c.mainSet, pace: c.pace,
          notes: prNote(day.PR, day.meeting),
          location: workoutLocation(day),
          scope: "INDIVIDUAL",
          teamId: team.id, createdById: team.coachId,
        },
      });
    }
  }

  console.log(`\nsessions: attach ${attach.length}, create ${creates.length}`);
  for (const a of attach) console.log(`  ATTACH ${a.date}  "${a.title}"`);
  for (const c of creates) console.log(`  CREATE ${c.date}  "${c.title}"`);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s) — NOTHING WRITTEN:`);
    for (const p of problems) console.log(`  ! ${p}`);
    process.exitCode = 1;
    return;
  }
  if (!APPLY) {
    console.log("\nDry run complete — nothing written.");
    return;
  }

  await prisma.$transaction([
    ...creates.map((c) => prisma.workout.create({ data: { id: c.id, ...c.row } as never })),
    prisma.assignment.createMany({
      data: [
        ...creates.map((c) => ({ workoutId: c.id, athleteId, status: "ASSIGNED" })),
        ...attach.map((a) => ({ workoutId: a.workoutId, athleteId, status: "ASSIGNED" })),
      ],
    }),
  ]);

  const count = await prisma.assignment.count({ where: { athleteId } });
  console.log(`\nDone. ${seed.name} has ${count} session(s). Login: ${EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
