import { redirect } from "next/navigation";
import { dateHelpers } from "@/lib/date";
import { getCurrentUser, getViewerTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toAssignmentDTO } from "@/lib/dto";
import { WORKOUTS_PAST_DAYS } from "@/lib/query-limits";
import { WORKOUT_ORDER, ASSIGNMENT_BY_WORKOUT } from "@/lib/ordering";
import { CoachWorkouts, type CoachWorkoutRow } from "@/components/coach-workouts";
import { AthleteWorkouts } from "@/components/athlete-workouts";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { endOfDay, startOfDay, subDays } = dateHelpers(await getViewerTimeZone());

  const now = new Date();
  const nowISO = now.toISOString();

  // This screen shows every upcoming session plus an "Earlier" section. Earlier
  // reaches back WORKOUTS_PAST_DAYS rather than to the beginning of time, so the
  // list can't grow without bound as seasons pile up. Nothing in the current
  // history is older than this cutoff.
  const historyFrom = subDays(startOfDay(now), WORKOUTS_PAST_DAYS);

  if (user.role === "COACH") {
    // Two independent queries, issued together instead of one after the other.
    const [workouts, athletes] = await Promise.all([
      prisma.workout.findMany({
        where: { teamId: user.teamId ?? undefined, date: { gte: historyFrom } },
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
  const assignmentRows = await prisma.assignment.findMany({
    where: { athleteId: user.id, workout: { date: { gte: historyFrom } } },
    include: { workout: true, feedback: true },
    orderBy: ASSIGNMENT_BY_WORKOUT,
  });
  const assignments = assignmentRows.map(toAssignmentDTO);

  const todayEnd = endOfDay(now);
  const viewIds = assignmentRows
    .filter((a) => a.status === "ASSIGNED" && a.workout.date <= todayEnd)
    .map((a) => a.id);

  return <AthleteWorkouts assignments={assignments} viewIds={viewIds} nowISO={nowISO} />;
}
