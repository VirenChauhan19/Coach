import { redirect } from "next/navigation";
import { getCurrentUser, getViewerTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateHelpers } from "@/lib/date";
import { PageHeader } from "@/components/ui/page-header";
import { AthletesManager, type RosterAthlete } from "@/components/athletes-manager";

export const dynamic = "force-dynamic";

export default async function AthletesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "COACH") redirect("/dashboard");

  const { weekStart, weekEnd, addDays, startOfDay } = dateHelpers(
    await getViewerTimeZone()
  );

  const teamId = user.teamId ?? undefined;
  const now = new Date();
  const ws = weekStart(now);
  const we = weekEnd(now);

  // All four queries are independent, so they go out together rather than one
  // after another. The three aggregates are grouped in the database instead of
  // pulling every matching row back and counting them here — the roster only
  // ever displays one number per athlete.
  const [athletes, weekRows, needsRows, feedbackRows] = await Promise.all([
    prisma.user.findMany({
      where: { teamId, role: "ATHLETE", active: true },
      // Explicit fields: an unfiltered findMany also loads passwordHash, which
      // this page has no business reading.
      select: {
        id: true,
        name: true,
        email: true,
        gradYear: true,
        events: true,
        hometown: true,
        phone: true,
        emergencyName: true,
        emergencyPhone: true,
        bio: true,
        mileageGroup: true,
        lrTarget: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.groupBy({
      by: ["athleteId", "status"],
      where: {
        workout: { teamId, date: { gte: ws, lte: we }, type: { not: "REST" } },
      },
      _count: { _all: true },
    }),
    prisma.assignment.groupBy({
      by: ["athleteId"],
      where: {
        status: "NEEDS_DISCUSSION",
        workout: { teamId, date: { gte: addDays(startOfDay(now), -10) } },
      },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({
      by: ["athleteId"],
      where: { workout: { teamId } },
      _max: { updatedAt: true },
    }),
  ]);

  const weekStat = new Map<string, { c: number; t: number }>();
  for (const row of weekRows) {
    const s = weekStat.get(row.athleteId) ?? { c: 0, t: 0 };
    s.t += row._count._all;
    if (row.status === "COMPLETED") s.c += row._count._all;
    weekStat.set(row.athleteId, s);
  }
  const needsCount = new Map(
    needsRows.map((n) => [n.athleteId, n._count._all] as const)
  );
  const lastFeedback = new Map(
    feedbackRows.map((f) => [f.athleteId, f._max.updatedAt] as const)
  );

  const roster: RosterAthlete[] = athletes.map((a) => {
    const s = weekStat.get(a.id) ?? { c: 0, t: 0 };
    const last = lastFeedback.get(a.id);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      gradYear: a.gradYear,
      events: a.events,
      hometown: a.hometown,
      phone: a.phone,
      emergencyName: a.emergencyName,
      emergencyPhone: a.emergencyPhone,
      bio: a.bio,
      mileageGroup: a.mileageGroup,
      lrTarget: a.lrTarget,
      weekCompleted: s.c,
      weekTotal: s.t,
      lastFeedbackISO: last ? last.toISOString() : null,
      needsDiscussion: needsCount.get(a.id) ?? 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Athletes"
        subtitle="Your roster. Add runners, edit profiles, and review their feedback."
      />
      <AthletesManager athletes={roster} />
    </div>
  );
}
