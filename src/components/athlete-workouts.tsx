"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { IconStopwatch, IconCalendar, IconChat, IconTrack } from "./ui/icons";
import type { AssignmentDTO } from "@/lib/dto";
import { WorkoutDetail } from "./workout-detail";
import { AthleteWorkoutActions } from "./athlete-workout-actions";
import { TypeBadge, StatusBadge } from "./ui/badges";
import { EmptyState } from "./ui/empty";
import { AnimatedBar, CountUp } from "./ui/stat";
import { RevealList } from "./ui/reveal-list";
import { WORKOUT_TYPE_ORDER, workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";

function MetricTile({
  icon: Icon,
  label,
  value,
  suffix,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-brand-400">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 font-display text-4xl font-bold leading-none text-ink">
        <CountUp value={value} suffix={suffix} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  muted = false,
}: {
  title: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-paper-200 pb-2">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
        <span
          className={cn(
            "h-3.5 w-1 rounded-full",
            muted ? "bg-slate-300" : "bg-brand-500"
          )}
        />
        {title}
      </h2>
      <span className="font-mono text-[11px] text-slate-400">
        {String(count).padStart(2, "0")}
      </span>
    </div>
  );
}

function Card({ a }: { a: AssignmentDTO }) {
  const { format, smartDayLabel } = useDates();
  const isRest = a.workout.type === "REST";
  const meta = workoutMeta(a.workout.type);

  return (
    <article className="overflow-hidden rounded-lg border border-paper-200 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-ink/20">
      <div className="grid gap-0 sm:grid-cols-[92px_1fr]">
        <div className={cn("flex items-center gap-3 p-4 text-white sm:block", meta.bar)}>
          <div className="rounded-md bg-white/15 px-3 py-2 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)]">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
              {format(a.workout.dateISO, "MMM")}
            </span>
            <span className="block font-display text-4xl font-bold leading-none">
              {format(a.workout.dateISO, "d")}
            </span>
            <span className="block text-[11px] opacity-80">
              {format(a.workout.dateISO, "EEE")}
            </span>
          </div>
          <div className="sm:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
              {smartDayLabel(a.workout.dateISO)}
            </p>
            <p className="mt-0.5 text-sm font-semibold">{a.workout.title}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
                <span>{smartDayLabel(a.workout.dateISO)}</span>
                <span>/</span>
                <span>{format(a.workout.dateISO, "MMM d")}</span>
                {a.workout.scope === "INDIVIDUAL" && (
                  <span className="badge bg-brand-100 text-brand-800 ring-brand-600/30">
                    For you
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-lg font-bold text-ink">{a.workout.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TypeBadge type={a.workout.type} />
                {!isRest && <StatusBadge status={a.status} />}
              </div>
            </div>
          </div>

          {!isRest && (
            <div className="mt-4 rounded-lg border border-paper-200 bg-paper-50/80 p-3">
              <WorkoutDetail workout={a.workout} customNote={a.customNote} compact />
            </div>
          )}
          {isRest && a.workout.notes && (
            <p className="mt-4 rounded-lg border border-paper-200 bg-paper-50/80 p-3 text-sm text-slate-600">
              {a.workout.notes}
            </p>
          )}

          <div className="mt-4 rounded-lg border border-paper-200 bg-white p-3">
            <AthleteWorkoutActions assignment={a} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function AthleteWorkouts({
  assignments,
  viewIds,
  nowISO,
}: {
  assignments: AssignmentDTO[];
  viewIds: string[];
  nowISO: string;
}) {
  const { format, smartDayLabel } = useDates();

  useEffect(() => {
    if (viewIds.length === 0) return;
    fetch("/api/assignments/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: viewIds }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayKey = format(nowISO, "yyyy-MM-dd");
  const upcoming = assignments
    .filter((a) => format(a.workout.dateISO, "yyyy-MM-dd") >= todayKey)
    .sort((a, b) => a.workout.dateISO.localeCompare(b.workout.dateISO));
  const past = assignments
    .filter((a) => format(a.workout.dateISO, "yyyy-MM-dd") < todayKey)
    .sort((a, b) => b.workout.dateISO.localeCompare(a.workout.dateISO));

  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No workouts assigned yet"
        description="Your coach hasn't scheduled anything for you. Check back soon."
      />
    );
  }

  const trackable = assignments.filter((a) => a.workout.type !== "REST");
  const completed = trackable.filter((a) => a.status === "COMPLETED").length;
  const completionPct = trackable.length
    ? Math.round((completed / trackable.length) * 100)
    : 0;
  const dueToday = upcoming.filter(
    (a) => format(a.workout.dateISO, "yyyy-MM-dd") === todayKey
  ).length;
  const feedbackCount = assignments.filter((a) => a.feedback).length;
  const next = upcoming[0];
  const typeCounts = WORKOUT_TYPE_ORDER.map((type) => ({
    type,
    count: assignments.filter((a) => a.workout.type === type).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-ink/10 bg-ink text-white shadow-soft">
        <div className="relative grid min-h-[300px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgb(234_179_8_/_0.24),transparent_30%),linear-gradient(135deg,rgb(255_255_255_/_0.12),transparent_38%)]" />
          <div className="relative flex flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                Athlete training slate
              </p>
              <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-6xl xl:text-7xl">
                My Workouts
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                See what is next, understand the full session, and log your response
                without losing the rhythm of the training week.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {format(nowISO, "EEEE, MMM d")}
              </span>
              <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {completed}/{trackable.length} complete
              </span>
            </div>
          </div>

          <div className="relative border-t border-white/10 bg-white/[0.06] p-5 backdrop-blur lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-ink-900/45 p-5">
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Up next
                  </span>
                  <span className="h-2 w-2 rounded-full bg-brand-400" />
                </div>
                {next ? (
                  <>
                    <TypeBadge
                      type={next.workout.type}
                      className="bg-white/[0.08] text-white ring-white/15"
                    />
                    <h2 className="mt-3 font-display text-3xl font-bold uppercase leading-none text-white">
                      {next.workout.title}
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-slate-200">
                        {smartDayLabel(next.workout.dateISO)}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-slate-200">
                        {next.workout.type === "REST" ? "Recovery" : next.status}
                      </span>
                    </div>
                    {next.workout.mainSet && (
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300">
                        {next.workout.mainSet}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    No future sessions are scheduled. Your completed training stays
                    below for review.
                  </p>
                )}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-md bg-white/[0.07] p-3">
                  <div className="font-display text-2xl font-bold text-white">
                    <CountUp value={upcoming.length} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Upcoming
                  </div>
                </div>
                <div className="rounded-md bg-white/[0.07] p-3">
                  <div className="font-display text-2xl font-bold text-white">
                    <CountUp value={dueToday} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Today
                  </div>
                </div>
                <div className="rounded-md bg-white/[0.07] p-3">
                  <div className="font-display text-2xl font-bold text-white">
                    <CountUp value={completionPct} suffix="%" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Done
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={IconStopwatch}
          label="Upcoming"
          value={upcoming.length}
          detail="sessions ahead"
        />
        <MetricTile
          icon={IconCalendar}
          label="Today"
          value={dueToday}
          detail="due now"
        />
        <MetricTile
          icon={CheckCircle2}
          label="Complete"
          value={completionPct}
          suffix="%"
          detail={`${completed}/${trackable.length} workouts`}
        />
        <MetricTile
          icon={IconChat}
          label="Logged"
          value={feedbackCount}
          detail="feedback notes"
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          <section>
            <SectionHeader title="Upcoming timeline" count={upcoming.length} />
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed border-paper-200 bg-white/60 p-5 text-sm text-slate-500">
                Nothing scheduled ahead right now.
              </p>
            ) : (
              <RevealList items={upcoming} className="space-y-4 list-long" noun="sessions">
                {(a) => <Card key={a.id} a={a} />}
              </RevealList>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <SectionHeader title="Earlier" count={past.length} muted />
              <RevealList items={past} className="space-y-4 list-long" noun="sessions">
                {(a) => <Card key={a.id} a={a} />}
              </RevealList>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <section className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-soft">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em]">
                Training progress
              </h2>
              <IconTrack size={16} className="text-brand-300" />
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div
                className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#EAB308 ${completionPct * 3.6}deg, rgb(255 255 255 / 0.12) 0deg)`,
                }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-ink">
                  <span className="font-display text-3xl font-bold">
                    {completionPct}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {completed} of {trackable.length} workouts complete
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Keep your log current so your coach can adjust the week from real
                  feedback.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-paper-200 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between border-b border-paper-200 pb-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                Training mix
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {assignments.length} total
              </span>
            </div>
            {typeCounts.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {typeCounts.map(({ type, count }) => {
                  const meta = workoutMeta(type);
                  const pct = assignments.length
                    ? Math.round((count / assignments.length) * 100)
                    : 0;
                  return (
                    <div key={type}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                          {meta.short}
                        </span>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                      <AnimatedBar value={pct} barClassName={meta.bar} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
