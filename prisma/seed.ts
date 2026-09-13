/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { subHours } from "date-fns";
// The same day math the app uses, resolved in the team's home zone — seeded
// workouts then land on exactly the days the written plan says they do.
import { dateHelpers, TEAM_TIME_ZONE, workoutInstantForDay } from "../src/lib/date";
import { ATHLETES, WEEKS } from "./scad-data";
import { classify, prNote } from "./classify";

const { startOfDay, isSameDay, subDays } = dateHelpers(TEAM_TIME_ZONE);

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

// ---------- deterministic helpers ----------
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length];

const FEELINGS = [
  "Felt smooth and controlled the whole way.",
  "Legs were heavy early but came around.",
  "Solid session, hit the prescribed effort.",
  "Easy and relaxed — good aerobic day.",
  "Felt strong, could've done more.",
  "A grind in the humidity, but got it done.",
  "Dead legs from yesterday, kept it honest.",
  "Best I've felt in a couple weeks.",
];
const SORENESS = [
  "None to report.",
  "Slight calf tightness, nothing concerning.",
  "Left achilles a little sore.",
  "General soreness, all normal.",
  "Right hip flexor a bit tight.",
  "Feet sore after the workout.",
  "None.",
  "Quads sore from the long run.",
];
const NOTES = [
  "",
  "",
  "Shoes getting close to 400 miles.",
  "Can we talk goal paces this week?",
  "Heat really got to me — hydrating more.",
  "All good, coach!",
  "Small shin twinge, keeping an eye on it.",
  "",
];

async function main() {
  console.log("Resetting database...");
  await prisma.feedback.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.team.updateMany({ data: { coachId: null } });
  await prisma.user.updateMany({ data: { teamId: null } });
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating coach + team...");
  const coach = await prisma.user.create({
    data: {
      name: "Coach",
      email: "coach@scadxc.com",
      passwordHash,
      role: "COACH",
      bio: "Head distance coach, SCAD Atlanta Cross Country.",
    },
  });
  const team = await prisma.team.create({
    data: { name: "SCAD Atlanta Cross Country", season: "XC 2026", coachId: coach.id },
  });
  await prisma.user.update({
    where: { id: coach.id },
    data: { teamId: team.id, lastReadAnnouncementsAt: new Date() },
  });

  console.log(`Creating ${ATHLETES.length} athletes...`);
  const athletes: { id: string; name: string; email: string; group: string }[] = [];
  for (const a of ATHLETES) {
    const seed = hash(a.email);
    const athlete = await prisma.user.create({
      data: {
        name: a.name,
        email: a.email,
        passwordHash,
        role: "ATHLETE",
        teamId: team.id,
        mileageGroup: a.group,
        lrTarget: a.lrTarget,
        ezTarget: a.ezTarget,
        paces: JSON.stringify({ ...a.paces, doubleFreq: a.doubleFreq, xtFreq: a.xtFreq, xtTarget: a.xtTarget }),
        phone: `(404) 555-0${100 + (seed % 900)}`,
        lastReadAnnouncementsAt: subDays(new Date(), 2),
      },
    });
    athletes.push({ ...athlete, group: a.group });
  }

  // long-run target per group (uniform within a group on the chart)
  const GROUP_LR: Record<string, string> = {};
  for (const a of ATHLETES) GROUP_LR[a.group] = a.lrTarget;

  const today = startOfDay(new Date());

  console.log("Building the full 4-phase plan...");
  type WRow = {
    id: string;
    title: string;
    date: Date;
    type: string;
    scope: string;
    distance: string | null;
    mainSet: string | null;
    pace: string | null;
    notes: string | null;
    teamId: string;
    createdById: string;
  };
  type ARow = {
    id: string;
    workoutId: string;
    athleteId: string;
    status: string;
    viewedAt: Date | null;
    respondedAt: Date | null;
    date: Date;
    type: string;
  };
  const workoutRows: WRow[] = [];
  const assignmentRows: ARow[] = [];

  for (const wk of WEEKS) {
    const monday = workoutInstantForDay(wk.start);
    for (let d = 0; d < 7; d++) {
      const day = wk.days[d];
      if (!day) continue;
      // Noon UTC, the same anchor the API uses when a coach adds a workout.
      // Stepping in whole UTC days (rather than zoned ones) keeps every session
      // at exactly 12:00Z — a zoned step would drift an hour across a DST edge.
      const date = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000);

      // PR (prehab/recovery/fuel) note for the day
      const notes = prNote(day.PR);

      // group the per-group cells by identical text
      const cells: Record<string, string | undefined> = { A: day.A, B: day.B, C: day.C, D: day.D };
      const byText = new Map<string, string[]>();
      for (const g of ["A", "B", "C", "D"]) {
        const txt = cells[g];
        if (!txt) continue;
        if (!byText.has(txt)) byText.set(txt, []);
        byText.get(txt)!.push(g);
      }

      for (const [txt, groups] of byText) {
        // The coach writes a row for every group he plans for, which can run
        // ahead of the roster — D exists on paper before anyone is in it. A
        // workout nobody is assigned to is just an orphan row, so skip it.
        const groupAthletes = athletes.filter((a) => groups.includes(a.group));
        if (!groupAthletes.length) continue;

        const c = classify(txt, GROUP_LR[groups[0]] ?? "90-100");
        if (!c) continue;
        const wid = randomUUID();
        workoutRows.push({
          id: wid,
          title: c.title,
          date,
          type: c.type,
          scope: groupAthletes.length === athletes.length ? "TEAM" : "INDIVIDUAL",
          distance: c.distance,
          mainSet: c.mainSet,
          pace: c.pace,
          notes,
          teamId: team.id,
          createdById: coach.id,
        });

        for (const a of groupAthletes) {
          const seed = hash(a.id + wid);
          const isPast = date < today;
          const isToday = isSameDay(date, today);
          let status = "ASSIGNED";
          let viewedAt: Date | null = null;
          let respondedAt: Date | null = null;

          if (c.type === "REST") {
            status = isPast || isToday ? "VIEWED" : "ASSIGNED";
            viewedAt = isPast || isToday ? subHours(date, -10) : null;
          } else if (isPast) {
            const roll = seed % 100;
            if (roll < 80) status = "COMPLETED";
            else if (roll < 89) status = "SKIPPED";
            else if (roll < 95) status = "NEEDS_DISCUSSION";
            else status = "VIEWED";
            viewedAt = subHours(date, -9);
            if (status !== "VIEWED") respondedAt = subHours(date, -11);
          } else if (isToday) {
            status = seed % 3 === 0 ? "VIEWED" : "ASSIGNED";
            viewedAt = status === "VIEWED" ? subHours(new Date(), 2) : null;
          }

          assignmentRows.push({
            id: randomUUID(),
            workoutId: wid,
            athleteId: a.id,
            status,
            viewedAt,
            respondedAt,
            date,
            type: c.type,
          });
        }
      }
    }
  }

  console.log(`Inserting ${workoutRows.length} workouts, ${assignmentRows.length} assignments...`);
  await prisma.workout.createMany({
    data: workoutRows.map(({ id, title, date, type, scope, distance, mainSet, pace, notes, teamId, createdById }) => ({
      id,
      title,
      date,
      type,
      scope,
      distance,
      mainSet,
      pace,
      notes,
      teamId,
      createdById,
    })),
  });
  await prisma.assignment.createMany({
    data: assignmentRows.map(({ id, workoutId, athleteId, status, viewedAt, respondedAt }) => ({
      id,
      workoutId,
      athleteId,
      status,
      viewedAt,
      respondedAt,
    })),
  });

  // feedback for completed/skipped/needs-discussion in the past
  const feedbackRows = assignmentRows
    .filter((a) => ["COMPLETED", "SKIPPED", "NEEDS_DISCUSSION"].includes(a.status))
    .map((a) => {
      const seed = hash(a.id);
      const completed = a.status !== "SKIPPED";
      let effort: number | null = null;
      if (completed) {
        if (a.type === "WORKOUT") effort = 7 + (seed % 3);
        else if (a.type === "LONG_RUN") effort = 6 + (seed % 3);
        else if (a.type === "RACE") effort = 9 + (seed % 2);
        else effort = 3 + (seed % 3);
      }
      return {
        workoutId: a.workoutId,
        athleteId: a.athleteId,
        assignmentId: a.id,
        completed,
        effort,
        feeling: completed ? pick(FEELINGS, seed) : "Skipped — fatigue / time. Will adjust.",
        soreness: pick(SORENESS, seed >> 2),
        notes:
          a.status === "NEEDS_DISCUSSION"
            ? "Want to talk this one through, coach."
            : pick(NOTES, seed >> 3) || null,
      };
    });
  console.log(`Inserting ${feedbackRows.length} feedback entries...`);
  if (feedbackRows.length) await prisma.feedback.createMany({ data: feedbackRows });

  // ---------- messages ----------
  console.log("Creating messages...");
  const byEmail = (e: string) => athletes.find((a) => a.email === e)!;
  await prisma.message.createMany({
    data: [
      {
        type: "ANNOUNCEMENT",
        body: "Welcome to Phase 1 — base, no doubles. The goal is consistent, healthy aerobic mileage. Run your easy days truly easy and trust the build. Big season ahead.",
        teamId: team.id,
        senderId: coach.id,
        createdAt: subDays(new Date(), 9),
      },
      {
        type: "ANNOUNCEMENT",
        body: "Atlanta heat is here. Move easy runs to early AM, carry fluids on anything over 40 minutes, and get your electrolytes in. Listen to your body in the humidity.",
        teamId: team.id,
        senderId: coach.id,
        createdAt: subDays(new Date(), 6),
      },
      {
        type: "ANNOUNCEMENT",
        body: "Reminder: strides Tuesday/Saturday are smooth and fast, not sprints. Hit your lifts (Day 1 Wed, Day 2 Fri) and core & hip work — that's what keeps you healthy.",
        teamId: team.id,
        senderId: coach.id,
        createdAt: subDays(new Date(), 3),
      },
      {
        type: "ANNOUNCEMENT",
        body: "Log your feedback after every session — effort, how you felt, any soreness. That's how I fine-tune your group and your paces. Training recap due Sunday.",
        teamId: team.id,
        senderId: coach.id,
        createdAt: subDays(new Date(), 1),
      },
    ],
  });

  async function dm(fromCoach: boolean, athleteId: string, body: string, when: Date, read: boolean) {
    await prisma.message.create({
      data: {
        type: "DIRECT",
        body,
        senderId: fromCoach ? coach.id : athleteId,
        recipientId: fromCoach ? athleteId : coach.id,
        createdAt: when,
        readAt: read ? when : null,
      },
    });
  }

  const viren = byEmail("viren@scadxc.com");
  const ryan = byEmail("ryan@scadxc.com");
  const corinne = byEmail("corinne@scadxc.com");
  const gray = byEmail("gray@scadxc.com");
  const paige = byEmail("paige@scadxc.com");

  // Viren (the demo athlete) — last coach message unread
  await dm(true, viren.id, "Viren, your easy paces looked controlled this week — exactly what I want in Group B. How are the legs feeling?", subDays(new Date(), 4), true);
  await dm(false, viren.id, "Thanks coach! Feeling good, the 40-50 min runs are settling in.", subHours(subDays(new Date(), 4), -1), true);
  await dm(true, viren.id, "Good. Keep the easy days easy and we'll sharpen later. Nice work logging your feedback.", subHours(new Date(), 3), false);

  // Ryan (Group A) — unread coach message
  await dm(true, ryan.id, "Ryan, you're in Group A this block — 90-100 long run, 50-60 easy. Build gradually, no hero days early.", subDays(new Date(), 2), false);

  // Corinne reaching out — unread for the coach
  await dm(false, corinne.id, "Coach, I felt a twinge in my left shin on today's run. Should I cross-train tomorrow?", subHours(new Date(), 5), false);

  // Gray — read exchange about XT
  await dm(true, gray.id, "Gray, let's add 1-2 cross-training sessions a week to manage load. I'll note it on your plan.", subDays(new Date(), 3), true);
  await dm(false, gray.id, "Sounds good, will do. Thanks coach.", subHours(subDays(new Date(), 3), -2), true);

  // Paige — unread for coach
  await dm(false, paige.id, "Coach, can we go over my 5K goal pace before the first meet?", subHours(new Date(), 8), false);

  // ---------- team chat (GROUP): makes the app feel lived-in ----------
  console.log("Creating team chat + photos...");
  const base = new Date();
  const ago = (d: number, h = 0) => new Date(base.getTime() - (d * 24 + h) * 3600 * 1000);

  const teamChat: [string, string, Date][] = [
    [coach.id, "Team chat is live. Use it for rides, logistics, and hyping each other up. Keep it positive, big season ahead.", ago(9)],
    [viren.id, "Driving to the park trail tomorrow at 6:15am, got 2 spots if anyone needs a ride.", ago(7)],
    [ryan.id, "I'm in, meet you by the dorms.", ago(6, 22)],
    [corinne.id, "That tempo this morning hurt in the best way 😅 legs are absolutely toast", ago(5)],
    [gray.id, "XT crew, pool at 4? keeping it easy like coach said", ago(4, 20)],
    [coach.id, "Yes, easy aqua jog for the cross-training group today. Save the legs for Saturday's long run.", ago(4, 19)],
    [paige.id, "New racing flats came in, breaking them in on the easy days 👟", ago(4)],
    [viren.id, "Splits were way more even this week, the pacing talk helped a ton", ago(3)],
    [coach.id, "Love to see it. Reminder: training recap due Sunday night. Two sentences minimum, be honest about how the body feels.", ago(2, 5)],
    [ryan.id, "anyone else's calves wrecked from the hill repeats? rolling them out tonight", ago(2, 3)],
    [corinne.id, "10/10 recommend the massage gun lol", ago(2, 1)],
    [gray.id, "Carpool for Saturday's meet? trying to sort logistics", ago(1, 2)],
    [coach.id, "Meet plan goes out tonight. Vans leave 7am sharp, be early. Pin your numbers the night before.", ago(0, 6)],
    [viren.id, "Let's go 🔥 ready to compete", ago(0, 4)],
    [paige.id, "so ready. thanks for the goal-pace chat coach, feeling confident", ago(0, 3)],
  ];
  for (const [senderId, body, when] of teamChat) {
    await prisma.message.create({
      data: { type: "GROUP", body, senderId, teamId: team.id, createdAt: when },
    });
  }

  // ---------- team photos (PHOTOS) ----------
  function photo(label: string, sub: string, c1: string, c2: string): string {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
      `<rect width='900' height='900' fill='url(#g)'/>` +
      `<text x='50%' y='46%' font-family='Arial, sans-serif' font-size='66' font-weight='bold' fill='white' text-anchor='middle'>${label}</text>` +
      `<text x='50%' y='55%' font-family='Arial, sans-serif' font-size='30' fill='rgba(255,255,255,0.85)' text-anchor='middle'>${sub}</text></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
  const teamPhotos: [string, string, string, Date][] = [
    [coach.id, "Sunrise long run at the park 🌅", photo("LONG RUN", "Sunrise at the park", "#C8920C", "#13171F"), ago(6)],
    [viren.id, "Track Tuesday, 6x800 in the books", photo("TRACK TUESDAY", "6 x 800m", "#13171F", "#C8920C"), ago(4)],
    [corinne.id, "Whole squad before the tempo", photo("THE SQUAD", "Piedmont Park", "#86600C", "#EAB308"), ago(3)],
    [ryan.id, "Pre-meet shakeout 💪", photo("MEET DAY", "Shakeout + strides", "#0E1117", "#D49A06"), ago(0, 5)],
  ];
  for (const [senderId, body, imageUrl, when] of teamPhotos) {
    await prisma.message.create({
      data: { type: "PHOTOS", body, imageUrl, senderId, teamId: team.id, createdAt: when },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    workouts: await prisma.workout.count(),
    assignments: await prisma.assignment.count(),
    feedback: await prisma.feedback.count(),
    messages: await prisma.message.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  console.log("  Coach:   coach@scadxc.com");
  console.log("  Athlete: viren@scadxc.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
