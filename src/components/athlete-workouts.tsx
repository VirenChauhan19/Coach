"use client";

import { useEffect, useState } from "react";
import { IconFeedback, IconProgress, IconToday, IconTraining } from "./ui/icons";
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
import { compareWorkouts, compareWorkoutsDesc } from "@/lib/ordering";

function MetricTile({
  icon: Icon,
  label,
  value,
  suffix,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  detail: string;
}) {
  return (
    <div className="card flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:block sm:p-4" title={detail}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:flex">
          <Icon size={22} strokeWidth={1.7} />
        </span>
      </div>
      <div className="shrink-0 text-xl font-semibold tracking-tight text-ink sm:mt-2 sm:text-3xl">
        <CountUp value={value} suffix={suffix} />
      </div>
      <p className="sr-only text-xs text-slate-500 sm:not-sr-only sm:mt-1">{detail}</p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 hidden items-center justify-between border-b border-slate-200 pb-2 sm:flex">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
        {count}
      </span>
    </div>
  );
}

function Card({ a, liftTime }: { a: AssignmentDTO; liftTime?: string | null }) {
  const { format, smartDayLabel } = useDates();
  const isRest = a.workout.type === "REST";
  const meta = workoutMeta(a.workout.type);

  return (
    <article className="card min-w-0 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center sm:w-16">
          <span className="block text-xs font-medium text-slate-500">
            {format(a.workout.dateISO, "MMM")}
          </span>
          <span className="block text-2xl font-semibold leading-tight text-ink">
            {format(a.workout.dateISO, "d")}
          </span>
          <span className="block text-xs text-slate-500">
            {format(a.workout.dateISO, "EEE")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
            <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-ink">
              {a.workout.title}
            </h3>
            {a.workout.scope === "INDIVIDUAL" && (
              <span className="badge bg-brand-50 text-brand-800 ring-brand-600/20">
                For you
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{smartDayLabel(a.workout.dateISO)}</span>
            <TypeBadge type={a.workout.type} />
            {!isRest && <StatusBadge status={a.status} />}
          </div>
        </div>
      </div>

      {!isRest && (
        <div className="mt-4 break-words rounded-xl bg-slate-50 p-3.5 sm:ml-20">
          <WorkoutDetail
            workout={a.workout}
            customNote={a.customNote}
            liftTime={liftTime}
            compact
          />
        </div>
      )}
      {isRest && a.workout.notes && (
        <p className="mt-4 break-words rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600 sm:ml-20">
          {a.workout.notes}
        </p>
      )}

      <div className="mt-4 border-t border-slate-200 pt-3 sm:ml-20">
        <AthleteWorkoutActions assignment={a} />
      </div>
    </article>
  );
}

export function AthleteWorkouts({
  assignments,
  viewIds,
  nowISO,
  liftTime,
}: {
  assignments: AssignmentDTO[];
  viewIds: string[];
  nowISO: string;
  liftTime?: string | null;
}) {
  const { format, smartDayLabel } = useDates();
  const [mobileTab, setMobileTab] = useState<"upcoming" | "past">("upcoming");

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
    .sort((a, b) => compareWorkouts(a.workout, b.workout));
  const past = assignments
    .filter((a) => format(a.workout.dateISO, "yyyy-MM-dd") < todayKey)
    .sort((a, b) => compareWorkoutsDesc(a.workout, b.workout));

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
  const completionPct = trackable.length ? Math.round((completed / trackable.length) * 100) : 0;
  const dueToday = upcoming.filter((a) => format(a.workout.dateISO, "yyyy-MM-dd") === todayKey).length;
  const feedbackCount = assignments.filter((a) => a.feedback).length;
  const next = upcoming[0];
  const typeCounts = WORKOUT_TYPE_ORDER.map((type) => ({
    type,
    count: assignments.filter((a) => a.workout.type === type).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="card border-brand-200 bg-brand-50 p-4 sm:p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">Your training</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          My Workouts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {format(nowISO, "EEEE, MMM d")} · {completed} of {trackable.length} complete
        </p>

        {next && (
          <div className="mt-4 hidden rounded-xl border border-brand-200/70 bg-white p-4 sm:block">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", workoutMeta(next.workout.type).dot)} />
                  <span className="text-sm font-medium text-slate-500">Up next</span>
                </div>
                <h2 className="break-words text-lg font-semibold leading-snug text-ink">{next.workout.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{smartDayLabel(next.workout.dateISO)}</span>
                  {next.workout.type === "REST" ? <TypeBadge type="REST" /> : <StatusBadge status={next.status} />}
                </div>
              </div>
              {next.workout.mainSet && (
                <p className="line-clamp-2 max-w-xl break-words text-sm leading-relaxed text-slate-600 sm:line-clamp-none">
                  {next.workout.mainSet}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <MetricTile icon={IconTraining} label="Upcoming" value={upcoming.length} detail="sessions ahead" />
        <MetricTile icon={IconToday} label="Today" value={dueToday} detail="due now" />
        <MetricTile icon={IconProgress} label="Complete" value={completionPct} suffix="%" detail={`${completed}/${trackable.length} workouts`} />
        <MetricTile icon={IconFeedback} label="Logged" value={feedbackCount} detail="feedback notes" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3 sm:space-y-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:hidden" aria-label="Workout period">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                aria-pressed={mobileTab === tab}
                className={cn("min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors", mobileTab === tab ? "bg-white text-ink shadow-card" : "text-slate-500")}
              >
                {tab === "upcoming" ? "Upcoming" : "History"}
                <span className="ml-2 text-xs text-slate-500">{tab === "upcoming" ? upcoming.length : past.length}</span>
              </button>
            ))}
          </div>
          <section className={cn(mobileTab !== "upcoming" && "hidden sm:block")}>
            <SectionHeader title="Upcoming" count={upcoming.length} />
            {upcoming.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                Nothing scheduled ahead right now.
              </p>
            ) : (
              <RevealList items={upcoming} className="space-y-3 list-long" noun="sessions">
                {(a) => <Card key={a.id} a={a} liftTime={liftTime} />}
              </RevealList>
            )}
          </section>

          {past.length > 0 ? (
            <section className={cn(mobileTab !== "past" && "hidden sm:block")}>
              <SectionHeader title="Earlier" count={past.length} />
              <RevealList items={past} className="space-y-3 list-long" noun="sessions">
                {(a) => <Card key={a.id} a={a} liftTime={liftTime} />}
              </RevealList>
            </section>
          ) : mobileTab === "past" && (
            <p className="card p-5 text-sm text-slate-500 sm:hidden">Your past sessions will appear here.</p>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-7 xl:self-start">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Training Progress</h2>
              <span className="text-xs text-slate-500">{completionPct}% complete</span>
            </div>
            <AnimatedBar value={completionPct} barClassName="bg-emerald-500" />
            <p className="mt-3 text-sm text-slate-600">
              {completed} of {trackable.length} workouts complete.
            </p>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Training Mix</h2>
              <span className="text-xs text-slate-500">{assignments.length} total</span>
            </div>
            {typeCounts.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {typeCounts.map(({ type, count }) => {
                  const meta = workoutMeta(type);
                  const pct = assignments.length ? Math.round((count / assignments.length) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                          {meta.short}
                        </span>
                        <span className="text-xs text-slate-500">{count}</span>
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
