import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarView, type CalEvent } from "@/components/calendar-view";
import { WORKOUT_ORDER, ASSIGNMENT_BY_WORKOUT } from "@/lib/ordering";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isCoach = user.role === "COACH";
  let events: CalEvent[] = [];
  let athletes: { id: string; name: string }[] = [];

  // The calendar grid only ever renders these fields. Selecting them explicitly
  // (rather than pulling whole rows) leaves the long prose columns, warmup,
  // mainSet, cooldown, notes, pace, link, out of the payload entirely. Those
  // are the bulkiest part of a workout and the calendar never shows them.
  const calendarFields = {
    id: true,
    title: true,
    type: true,
    date: true,
    scope: true,
    distance: true,
    location: true,
  } as const;

  if (isCoach && user.teamId) {
    const teamId = user.teamId;
    const activeAssignee = { athlete: { active: true } } as const;

    const [workouts, individualAssignees, athleteRows] = await Promise.all([
      prisma.workout.findMany({
        where: { teamId },
        select: {
          ...calendarFields,
          _count: { select: { assignments: { where: activeAssignee } } },
        },
        orderBy: WORKOUT_ORDER,
      }),
      // Names are listed per athlete only on INDIVIDUAL sessions; team sessions
      // just read "Whole team". So only individual sessions need their roster of
      // ids shipped to the browser, which drops well over a thousand ids from
      // the payload.
      prisma.assignment.findMany({
        where: { ...activeAssignee, workout: { teamId, scope: "INDIVIDUAL" } },
        select: { workoutId: true, athleteId: true },
      }),
      prisma.user.findMany({
        where: { teamId, role: "ATHLETE", active: true },
        select: { id: true, name: true, mileageGroup: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const assigneesByWorkout = new Map<string, string[]>();
    for (const a of individualAssignees) {
      const list = assigneesByWorkout.get(a.workoutId);
      if (list) list.push(a.athleteId);
      else assigneesByWorkout.set(a.workoutId, [a.athleteId]);
    }

    events = workouts.map((w) => ({
      id: w.id,
      title: w.title,
      type: w.type,
      dateISO: w.date.toISOString(),
      scope: w.scope,
      assignedCount: w._count.assignments,
      assigneeIds: assigneesByWorkout.get(w.id) ?? [],
      distance: w.distance,
      location: w.location,
    }));
    athletes = athleteRows;
  } else {
    const assignments = await prisma.assignment.findMany({
      where: { athleteId: user.id },
      select: {
        id: true,
        status: true,
        workout: { select: calendarFields },
      },
      orderBy: ASSIGNMENT_BY_WORKOUT,
    });
    events = assignments.map((a) => ({
      id: a.id,
      title: a.workout.title,
      type: a.workout.type,
      dateISO: a.workout.date.toISOString(),
      scope: a.workout.scope,
      status: a.status,
      distance: a.workout.distance,
      location: a.workout.location,
    }));
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={
          isCoach
            ? "Every session on the team schedule, color-coded by type."
            : "Your training schedule at a glance."
        }
      />
      <CalendarView
        events={events}
        isCoach={isCoach}
        athletes={athletes}
        nowISO={new Date().toISOString()}
      />
    </div>
  );
}
