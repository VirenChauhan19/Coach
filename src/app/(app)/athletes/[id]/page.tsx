import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Trophy,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { getCurrentUser, getViewerTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/avatar";
import { TypeBadge } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty";
import { PacesCard, GroupBadge } from "@/components/paces-card";
import { cn, parsePersonalBests, parsePaces, eventsList } from "@/lib/utils";
import { dateHelpers } from "@/lib/date";
import { ASSIGNMENT_BY_WORKOUT, ASSIGNMENT_BY_WORKOUT_DESC } from "@/lib/ordering";
import { statusMeta, workoutMeta } from "@/lib/constants";
import { CalendarView, type CalEvent } from "@/components/calendar-view";
import { AthleteNoteEditor } from "@/components/athlete-note-editor";

export const dynamic = "force-dynamic";

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "COACH") redirect("/dashboard");

  const { id } = await params;
  const athlete = await prisma.user.findUnique({ where: { id } });
  if (!athlete || athlete.teamId !== user.teamId || athlete.role !== "ATHLETE") {
    notFound();
  }

  const assignments = await prisma.assignment.findMany({
    where: { athleteId: id },
    include: { workout: true, feedback: true },
    orderBy: ASSIGNMENT_BY_WORKOUT_DESC,
    take: 50,
  });

  const nonRest = assignments.filter((a) => a.workout.type !== "REST");
  const completed = nonRest.filter((a) => a.status === "COMPLETED").length;
  const completionRate = nonRest.length
    ? Math.round((completed / nonRest.length) * 100)
    : 0;
  const needsDiscussion = assignments.filter(
    (a) => a.status === "NEEDS_DISCUSSION"
  ).length;

  const withFeedback = assignments.filter((a) => a.feedback);
  const pbs = parsePersonalBests(athlete.personalBests);
  const paces = parsePaces(athlete.paces);

  const { fmtDate, format, startOfDay } = dateHelpers(await getViewerTimeZone());
  const todayStart = startOfDay(new Date());
  const [upcoming, past] = await Promise.all([
    prisma.assignment.findMany({
      where: { athleteId: id, workout: { date: { gte: todayStart } } },
      include: { workout: { select: { title: true, type: true, date: true } } },
      orderBy: ASSIGNMENT_BY_WORKOUT,
      take: 30,
    }),
    prisma.assignment.findMany({
      where: { athleteId: id, workout: { date: { lt: todayStart } } },
      include: { workout: { select: { title: true, type: true, date: true } } },
      orderBy: ASSIGNMENT_BY_WORKOUT_DESC,
      take: 10,
    }),
  ]);

  // Per-athlete personal notes the coach can edit on any of this athlete's
  // upcoming or recent sessions.
  const toNote = (a: (typeof upcoming)[number]) => ({
    id: a.id,
    title: a.workout.title,
    type: a.workout.type,
    dateISO: a.workout.date.toISOString(),
    note: a.customNote,
  });
  const upcomingNotes = upcoming.map(toNote);
  const recentNotes = past.map(toNote);

  // This athlete's full schedule, for the embedded calendar.
  const nowISO = new Date().toISOString();
  const calAssignments = await prisma.assignment.findMany({
    where: { athleteId: id },
    include: {
      workout: {
        select: {
          title: true,
          type: true,
          date: true,
          scope: true,
          distance: true,
          location: true,
        },
      },
    },
    orderBy: ASSIGNMENT_BY_WORKOUT,
  });
  const athleteEvents: CalEvent[] = calAssignments.map((a) => ({
    id: a.id,
    title: a.workout.title,
    type: a.workout.type,
    dateISO: a.workout.date.toISOString(),
    scope: a.workout.scope,
    status: a.status,
    distance: a.workout.distance,
    location: a.workout.location,
  }));

  return (
    <div>
      <Link
        href="/athletes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to roster
      </Link>

      {/* header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={athlete.name} seed={athlete.id} size={64} />
            <div>
              <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink sm:text-3xl">
                {athlete.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <GroupBadge group={athlete.mileageGroup} />
                {athlete.gradYear && <span>Class of {athlete.gradYear}</span>}
                {eventsList(athlete.events).map((e) => (
                  <span
                    key={e}
                    className="rounded-md bg-paper-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link href="/messages" className="btn-outline self-start">
            <MessageSquare size={16} /> Message
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-paper-200 pt-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" />
            {athlete.email}
          </span>
          {athlete.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} className="text-slate-400" />
              {athlete.phone}
            </span>
          )}
          {athlete.hometown && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-400" />
              {athlete.hometown}
            </span>
          )}
        </div>
      </div>

      {/* stats, editorial scoreboard */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Completion", value: `${completionRate}%` },
          { label: "Completed", value: String(completed) },
          { label: "To discuss", value: String(needsDiscussion) },
        ].map((s, i) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between border-b border-paper-200 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-2.5 font-display text-3xl font-bold leading-none text-ink">
              {s.value}
            </div>
            <span className="mt-3 block h-0.5 w-10 bg-brand-500" />
          </div>
        ))}
      </div>

      {/* coach edits the private per-athlete note for each upcoming workout, 
          kept high on the page so it's the first thing the coach reaches */}
      <div className="mt-5">
        <AthleteNoteEditor
          athleteFirstName={athlete.name.split(" ")[0]}
          upcoming={upcomingNotes}
          recent={recentNotes}
        />
      </div>

      {/* training calendar */}
      <section className="mt-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
          <span className="h-3.5 w-1 rounded-full bg-brand-500" />
          Training calendar
        </h2>
        <CalendarView events={athleteEvents} isCoach={false} nowISO={nowISO} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* feedback history */}
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="h-3.5 w-1 rounded-full bg-brand-500" />
              Feedback history
            </h2>
            {withFeedback.length === 0 ? (
              <EmptyState
                title="No feedback logged yet"
                description="When this athlete logs how a workout went, it shows up here, visible only to you."
              />
            ) : (
              <ul className="divide-y divide-paper-100">
                {withFeedback.map((a) => {
                  const f = a.feedback!;
                  return (
                    <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {a.workout.title}
                          </span>
                          <TypeBadge type={a.workout.type} />
                        </div>
                        <div className="flex items-center gap-2">
                          {f.effort != null && (
                            <span className="rounded-md bg-paper-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                              RPE {f.effort}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {fmtDate(a.workout.date)}
                          </span>
                        </div>
                      </div>
                      {!f.completed && (
                        <span className="mt-1 inline-block badge bg-amber-50 text-amber-700 ring-amber-600/20">
                          Did not complete
                        </span>
                      )}
                      {f.feeling && (
                        <p className="mt-1.5 text-sm text-slate-700">“{f.feeling}”</p>
                      )}
                      {f.soreness && (
                        <p className="mt-1 text-sm text-slate-500">
                          <span className="font-medium text-slate-600">Soreness:</span>{" "}
                          {f.soreness}
                        </p>
                      )}
                      {f.notes && (
                        <p className="mt-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm text-brand-900">
                          {f.notes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* profile sidebar */}
        <div className="space-y-4">
          <PacesCard
            group={athlete.mileageGroup}
            lrTarget={athlete.lrTarget}
            ezTarget={athlete.ezTarget}
            paces={paces}
          />

          {pbs.length > 0 && (
            <section className="card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Trophy size={15} className="text-brand-600" /> Personal bests
              </div>
              <ul className="mt-2 space-y-1.5">
                {pbs.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{p.event}</span>
                    <span className="font-semibold text-ink">{p.time}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldAlert size={15} className="text-slate-400" /> Emergency contact
            </div>
            {athlete.emergencyName || athlete.emergencyPhone ? (
              <div className="mt-2 text-sm text-slate-600">
                <div>{athlete.emergencyName ?? "Not set"}</div>
                <div className="text-slate-500">{athlete.emergencyPhone ?? ""}</div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not provided.</p>
            )}
          </section>

          {athlete.bio && (
            <section className="card p-5">
              <div className="text-sm font-semibold text-ink">Notes</div>
              <p className="mt-2 text-sm text-slate-600">{athlete.bio}</p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="h-3.5 w-1 rounded-full bg-brand-500" />
              Schedule
            </h2>
            {upcoming.length === 0 && past.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions assigned yet.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Upcoming
                    </div>
                    <ul className="space-y-1.5">
                      {upcoming.slice(0, 6).map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <span className="w-11 shrink-0 font-mono text-[11px] text-slate-400">
                            {format(a.workout.date, "MMM d")}
                          </span>
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              workoutMeta(a.workout.type).dot
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                            {a.workout.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Recent
                    </div>
                    <ul className="space-y-1.5">
                      {past.slice(0, 6).map((a) => {
                        const sm = statusMeta(a.status);
                        return (
                          <li key={a.id} className="flex items-center gap-2">
                            <span className="w-11 shrink-0 font-mono text-[11px] text-slate-400">
                              {format(a.workout.date, "MMM d")}
                            </span>
                            <span
                              className={cn("h-2 w-2 shrink-0 rounded-full", sm.dot)}
                              title={sm.label}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                              {a.workout.title}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
