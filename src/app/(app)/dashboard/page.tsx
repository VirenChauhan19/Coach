import { redirect } from "next/navigation";
import { getCurrentUser, getViewerTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateHelpers } from "@/lib/date";
import { WORKOUT_ORDER } from "@/lib/ordering";
import { toAssignmentDTO, type AssignmentDTO } from "@/lib/dto";
import { parsePaces } from "@/lib/utils";
import { AthleteDashboard, type DayCell } from "@/components/athlete-dashboard";
import { CoachDashboard } from "@/components/coach-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // "Today" and "this week" mean the viewer's today and week, not the server's.
  const { weekStart, weekEnd, addDays, dayKey, isSameDay, startOfDay, endOfDay } =
    dateHelpers(await getViewerTimeZone());

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const ws = weekStart(now);
  const we = weekEnd(now);

  // Started here, awaited inside each branch's Promise.all below. Awaiting it up
  // front would make it a round-trip that everything else queues behind; this
  // way it flies alongside the rest.
  const teamPromise = user.teamId
    ? prisma.team.findUnique({
        where: { id: user.teamId },
        select: { name: true, season: true, coach: { select: { name: true } } },
      })
    : Promise.resolve(null);

  // ---------------- ATHLETE ----------------
  if (user.role !== "COACH") {
    const [
      team,
      profile,
      weekAssignments,
      todayAssignments,
      latestAnnouncementRow,
      unreadCount,
      latestDm,
    ] = await Promise.all([
      teamPromise,
      prisma.user.findUnique({
        where: { id: user.id },
        select: { mileageGroup: true, lrTarget: true, ezTarget: true, paces: true },
      }),
      prisma.assignment.findMany({
        where: {
          athleteId: user.id,
          workout: { date: { gte: ws, lte: we } },
        },
        include: { workout: true, feedback: true },
      }),
      prisma.assignment.findMany({
        where: {
          athleteId: user.id,
          workout: { date: { gte: todayStart, lte: todayEnd } },
        },
        include: { workout: true, feedback: true },
      }),
      user.teamId
        ? prisma.message.findFirst({
            where: { type: "ANNOUNCEMENT", teamId: user.teamId },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      prisma.message.count({
        where: { type: "DIRECT", recipientId: user.id, readAt: null },
      }),
      prisma.message.findFirst({
        where: {
          type: "DIRECT",
          OR: [{ senderId: user.id }, { recipientId: user.id }],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Whole-team session first, then chronological. Everything after that is a
    // tiebreaker: sessions on one day share a timestamp, so without the title
    // and id the order would be left to the database and could shift between
    // loads (see lib/ordering.ts).
    type Sortable = {
      workoutId: string;
      workout: { scope: string; date: Date; title: string };
    };
    const teamFirst = (a: Sortable, b: Sortable) =>
      b.workout.scope.localeCompare(a.workout.scope) ||
      a.workout.date.getTime() - b.workout.date.getTime() ||
      a.workout.title.localeCompare(b.workout.title) ||
      a.workoutId.localeCompare(b.workoutId);

    const today = todayAssignments.sort(teamFirst).map(toAssignmentDTO);

    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const key = dayKey(d);
      const dayAssignments = weekAssignments
        .filter((a) => dayKey(a.workout.date) === key)
        .sort(teamFirst)
        .map(toAssignmentDTO);
      week.push({
        dateISO: d.toISOString(),
        isToday: isSameDay(d, now),
        assignments: dayAssignments,
      });
    }

    const viewIds = [...weekAssignments, ...todayAssignments]
      .filter((a) => a.status === "ASSIGNED" && a.workout.date <= todayEnd)
      .map((a) => a.id);

    const nonRest = weekAssignments.filter((a) => a.workout.type !== "REST");
    const weekStats = {
      completed: nonRest.filter((a) => a.status === "COMPLETED").length,
      total: nonRest.length,
    };

    return (
      <AthleteDashboard
        firstName={user.name.split(" ")[0]}
        coachName={team?.coach?.name ?? "your coach"}
        nowISO={now.toISOString()}
        today={today}
        week={week}
        viewIds={viewIds}
        latestAnnouncement={
          latestAnnouncementRow
            ? {
                body: latestAnnouncementRow.body,
                createdISO: latestAnnouncementRow.createdAt.toISOString(),
              }
            : null
        }
        unreadCount={unreadCount}
        latestMessage={
          latestDm
            ? {
                body: latestDm.body,
                createdISO: latestDm.createdAt.toISOString(),
                fromCoach: latestDm.senderId !== user.id,
              }
            : null
        }
        weekStats={weekStats}
        group={profile?.mileageGroup ?? null}
        lrTarget={profile?.lrTarget ?? null}
        ezTarget={profile?.ezTarget ?? null}
        paces={parsePaces(profile?.paces)}
      />
    );
  }

  // ---------------- COACH ----------------
  const teamId = user.teamId!;

  // Fetch everything the dashboard needs in parallel. These queries are
  // independent, so running them concurrently turns ~7 sequential round-trips
  // to the database into one — that latency was the bulk of the post-login wait.
  const [
    team,
    athleteRows,
    weekAssignments,
    needsDiscussion,
    unreadMessages,
    todayWorkouts,
    feedbackRows,
    upcomingRows,
  ] = await Promise.all([
    teamPromise,
    prisma.user.findMany({
      where: { teamId, role: "ATHLETE", active: true },
      select: { id: true, name: true, mileageGroup: true },
      orderBy: { name: "asc" },
    }),
    // Week completion (non-rest team assignments) — only count athletes still on
    // the active roster so removed athletes don't drag the numbers.
    prisma.assignment.findMany({
      where: {
        athlete: { active: true },
        workout: { teamId, date: { gte: ws, lte: we }, type: { not: "REST" } },
      },
      select: { status: true },
    }),
    prisma.assignment.count({
      where: {
        status: "NEEDS_DISCUSSION",
        athlete: { active: true },
        workout: { teamId, date: { gte: addDays(todayStart, -10) } },
      },
    }),
    prisma.message.count({
      where: { type: "DIRECT", recipientId: user.id, readAt: null },
    }),
    // Today's workouts with completion counts
    prisma.workout.findMany({
      where: { teamId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        assignments: {
          where: { athlete: { active: true } },
          select: { status: true, athleteId: true },
        },
      },
      orderBy: [{ scope: "desc" }, { date: "asc" }, { title: "asc" }, { id: "asc" }],
    }),
    prisma.feedback.findMany({
      where: { athlete: { active: true }, workout: { teamId } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        athlete: { select: { id: true, name: true } },
        workout: { select: { title: true, type: true } },
      },
    }),
    prisma.workout.findMany({
      where: { teamId, date: { gte: todayStart } },
      orderBy: WORKOUT_ORDER,
      take: 6,
      include: {
        assignments: {
          where: { athlete: { active: true } },
          select: { id: true },
        },
      },
    }),
  ]);

  const weekCompleted = weekAssignments.filter((a) => a.status === "COMPLETED").length;
  const weekCompletionPct = weekAssignments.length
    ? Math.round((weekCompleted / weekAssignments.length) * 100)
    : 0;

  const today = todayWorkouts.map((w) => {
    const total = w.assignments.length;
    const completed = w.assignments.filter((a) => a.status === "COMPLETED").length;
    const viewed = w.assignments.filter(
      (a) => a.status === "VIEWED" || a.status === "SKIPPED" || a.status === "NEEDS_DISCUSSION"
    ).length;
    return {
      id: w.id,
      title: w.title,
      type: w.type,
      scope: w.scope,
      total,
      completed,
      viewed,
    };
  });

  // Roster status on the primary team workout today
  const primaryToday = todayWorkouts.find((w) => w.scope === "TEAM") ?? todayWorkouts[0];
  const statusByAthlete = new Map<string, string>();
  if (primaryToday) {
    for (const a of primaryToday.assignments) statusByAthlete.set(a.athleteId, a.status);
  }
  const roster = athleteRows.map((a) => ({
    id: a.id,
    name: a.name,
    status: statusByAthlete.get(a.id) ?? "ASSIGNED",
  }));

  const recentFeedback = feedbackRows.map((f) => ({
    athleteId: f.athlete.id,
    athleteName: f.athlete.name,
    workoutTitle: f.workout.title,
    type: f.workout.type,
    effort: f.effort,
    feeling: f.feeling,
    soreness: f.soreness,
    completed: f.completed,
    whenISO: f.updatedAt.toISOString(),
  }));

  const upcoming = upcomingRows.map((w) => ({
    id: w.id,
    title: w.title,
    type: w.type,
    dateISO: w.date.toISOString(),
    scope: w.scope,
    assignedCount: w.assignments.length,
  }));

  return (
    <CoachDashboard
      coachFirstName={user.name.split(" ")[0]}
      nowISO={now.toISOString()}
      teamName={team?.name ?? "Team Dashboard"}
      season={team?.season ?? null}
      athletes={athleteRows}
      stats={{
        athleteCount: athleteRows.length,
        weekCompletionPct,
        needsDiscussion,
        unreadMessages,
      }}
      today={today}
      roster={roster}
      recentFeedback={recentFeedback}
      upcoming={upcoming}
    />
  );
}
