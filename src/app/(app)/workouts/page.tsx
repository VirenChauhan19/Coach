import { redirect } from "next/navigation";
import { dateHelpers } from "@/lib/date";
import { getCurrentUser, getViewerTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toAssignmentDTO } from "@/lib/dto";
import { parsePaces } from "@/lib/utils";
import { WORKOUTS_FUTURE_DAYS, WORKOUTS_PAST_DAYS } from "@/lib/query-limits";
import { WORKOUT_ORDER, ASSIGNMENT_BY_WORKOUT } from "@/lib/ordering";
import { CoachWorkouts, type CoachWorkoutRow } from "@/components/coach-workouts";
import { AthleteWorkouts } from "@/components/athlete-workouts";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { addDays, endOfDay, startOfDay, subDays } = dateHelpers(await getViewerTimeZone());

  const now = new Date();
  const nowISO = now.toISOString();

  // Workouts is the working list for phones, not the archive. Keep the useful
  // planning window here and leave full-season browsing to Calendar.
  const historyFrom = subDays(startOfDay(now), WORKOUTS_PAST_DAYS);
  const historyTo = addDays(endOfDay(now), WORKOUTS_FUTURE_DAYS);

  if (user.role === "COACH") {
    // Two independent queries, issued together instead of one after the other.
    const [workouts, athletes] = await Promise.all([
      prisma.workout.findMany({
        where: {
          teamId: user.teamId ?? undefined,
          date: { gte: historyFrom, lte: historyTo },
        },
        include: {
          assignments: {
            where: { athlete: { active: true } },
            select: { id: true, athleteId: true, status: true, customNote: true },
          },
        },
        orderBy: WORKOUT_ORDER,
      }),
      prisma.user.findMany({
        where: { teamId: user.teamId ?? undefined, role: "ATHLETE", active: true },
        select: { id: true, name: true, mileageGroup: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const rows: CoachWorkoutRow[] = workouts.map((w) => ({
      id: w.id,
      title: w.title,
      type: w.type,
      dateISO: w.date.toISOString(),
      scope: w.scope,
      distance: w.distance,
      pace: w.pace,
      warmup: w.warmup,
      mainSet: w.mainSet,
      cooldown: w.cooldown,
      notes: w.notes,
      location: w.location,
      link: w.link,
      athleteIds: w.assignments.map((a) => a.athleteId),
      assignmentNotes: w.assignments.map((a) => ({
        id: a.id,
        athleteId: a.athleteId,
        note: a.customNote,
      })),
      total: w.assignments.length,
      completed: w.assignments.filter((a) => a.status === "COMPLETED").length,
    }));

    return <CoachWorkouts workouts={rows} athletes={athletes} nowISO={nowISO} />;
  }

  // Athlete
  const [assignmentRows, profile] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        athleteId: user.id,
        workout: { date: { gte: historyFrom, lte: historyTo } },
      },
      include: { workout: true, feedback: true },
      orderBy: ASSIGNMENT_BY_WORKOUT,
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { paces: true } }),
  ]);
  const assignments = assignmentRows.map(toAssignmentDTO);

  const todayEnd = endOfDay(now);
  const viewIds = assignmentRows
    .filter((a) => a.status === "ASSIGNED" && a.workout.date <= todayEnd)
    .map((a) => a.id);

  return (
    <AthleteWorkouts
      assignments={assignments}
      viewIds={viewIds}
      nowISO={nowISO}
      liftTime={parsePaces(profile?.paces)?.liftTime}
    />
  );
}
