"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconCalendar, IconRecovery, IconTraining } from "./ui/icons";
import type { AssignmentDTO } from "@/lib/dto";
import { WorkoutDetail } from "./workout-detail";
import { AthleteWorkoutActions } from "./athlete-workout-actions";
import { TypeBadge, StatusBadge } from "./ui/badges";
import { PacesCard } from "./paces-card";
import { CountUp, AnimatedBar } from "./ui/stat";
import { workoutMeta } from "@/lib/constants";
import { cn, type Paces } from "@/lib/utils";
import { useDates } from "./time-zone";

export type DayCell = {
  dateISO: string;
  isToday: boolean;
  assignments: AssignmentDTO[];
};

export type WeekBlock = {
  startISO: string;
  days: DayCell[];
};

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight text-ink">{children}</h2>;
}

export function AthleteDashboard({
  firstName,
  nowISO,
  today,
  weeks,
  currentWeekIndex,
  viewIds,
  weekStats,
  group,
  lrTarget,
  ezTarget,
  paces,
}: {
  firstName: string;
  nowISO: string;
  today: AssignmentDTO[];
  weeks: WeekBlock[];
  currentWeekIndex: number;
  viewIds: string[];
  weekStats: { completed: number; total: number };
  group: string | null;
  lrTarget: string | null;
  ezTarget: string | null;
  paces: Paces | null;
}) {
  const { fmtFullDate, fmtDayMonth, format, hourOfDay } = useDates();

  const [weekIndex, setWeekIndex] = useState(currentWeekIndex);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const shown = weeks[weekIndex] ?? weeks[currentWeekIndex];
  const selectedDay = shown.days.find((d) => d.dateISO === openDay) ?? null;

  const goWeek = (delta: number) => {
    const next = weekIndex + delta;
    if (next < 0 || next >= weeks.length) return;
    setWeekIndex(next);
    setOpenDay(null);
  };

  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeFrom.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    goWeek(dx < 0 ? 1 : -1);
  };

  const openDayCell = (dateISO: string) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setOpenDay((current) => (current === dateISO ? null : dateISO));
  };

  const offset = weekIndex - currentWeekIndex;
  const weekRange = `${fmtDayMonth(shown.startISO)} to ${fmtDayMonth(shown.days[6].dateISO)}`;
  const weekLabel =
    offset === 0
      ? "This week"
      : offset === 1
        ? "Next week"
        : offset === -1
          ? "Last week"
          : `Week of ${fmtDayMonth(shown.startISO)}`;

  useEffect(() => {
    if (viewIds.length === 0) return;
    fetch("/api/assignments/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: viewIds }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekPct = weekStats.total
    ? Math.round((weekStats.completed / weekStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#1c2027] px-5 py-5 text-white shadow-soft sm:px-7 sm:py-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/[0.035]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/60">{fmtFullDate(nowISO)}</p>
            <h1 className="mt-2 text-[25px] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              {greeting(hourOfDay(nowISO))}, {firstName}
            </h1>
          </div>
          <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:flex">
            <IconTraining size={22} strokeWidth={1.7} />
          </span>
        </div>
        <div className="relative mt-4 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-white/70">Your week so far</span>
            <span className="font-medium text-white">
              <CountUp value={weekStats.completed} /> <span className="text-white/60">/ {weekStats.total} sessions logged</span>
            </span>
          </div>
          <AnimatedBar value={weekPct} className="mt-2.5 !rounded-full !bg-white/10" barClassName="rounded-full bg-brand-300" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <SectionTitle>Today&apos;s focus</SectionTitle>
              <Link href="/workouts" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-ink">
                Full schedule <ArrowRight size={14} />
              </Link>
            </div>
            {today.length === 0 ? (
              <div className="card rounded-3xl p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <IconRecovery size={22} strokeWidth={1.7} />
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-ink">A little room to recharge.</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Nothing is scheduled today. Take a breath, and see what&apos;s ahead in your week.
                </p>
                <Link href="/workouts" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
                  View your plan <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {today.map((a) => (
                  <div key={a.id} className="card overflow-hidden rounded-3xl">
                    <div className="border-b border-slate-100 bg-brand-50 px-5 py-5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <span aria-hidden className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", workoutMeta(a.workout.type).dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                            <h3 className="break-words text-[22px] font-semibold leading-tight tracking-tight text-ink">
                              {a.workout.title}
                            </h3>
                            {a.workout.scope === "INDIVIDUAL" && (
                              <span className="badge bg-brand-50 text-brand-800 ring-brand-600/20">
                                For you
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <TypeBadge type={a.workout.type} />
                            {a.workout.type !== "REST" && <StatusBadge status={a.status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 sm:p-6">
                      <div className="break-words">
                        <WorkoutDetail
                          workout={a.workout}
                          customNote={a.customNote}
                          liftTime={paces?.liftTime}
                        />
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <AthleteWorkoutActions assignment={a} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card rounded-3xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <SectionTitle>{weekLabel}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500">{weekRange}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {offset !== 0 && (
                  <button
                    type="button"
                    onClick={() => goWeek(-offset)}
                    className="mr-1 min-h-11 rounded-xl px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goWeek(-1)}
                  disabled={weekIndex === 0}
                  aria-label="Previous week"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => goWeek(1)}
                  disabled={weekIndex === weeks.length - 1}
                  aria-label="Next week"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div
              key={shown.startISO}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="grid touch-pan-y grid-cols-7 gap-1 sm:gap-2"
            >
              {shown.days.map((d) => {
                const primary = d.assignments[0];
                const type = primary?.workout.type ?? null;
                const meta = type ? workoutMeta(type) : null;
                const done = d.assignments.some((a) => a.status === "COMPLETED");
                const isOpen = openDay === d.dateISO;
                return (
                  <button
                    key={d.dateISO}
                    type="button"
                    onClick={() => openDayCell(d.dateISO)}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? "week-day-detail" : undefined}
                    aria-label={`${fmtFullDate(d.dateISO)}: ${
                      d.assignments.length === 0
                        ? "nothing scheduled"
                        : d.assignments.map((a) => a.workout.title).join(", ")
                    }`}
                    className={cn(
                      "flex min-w-0 flex-col items-center rounded-2xl border px-0.5 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 sm:px-2",
                      d.isToday
                        ? "border-brand-300 bg-brand-300 text-[#1c2027]"
                        : "border-transparent bg-slate-50 hover:border-slate-300 hover:bg-slate-100",
                      isOpen && "ring-2 ring-brand-400 ring-offset-1"
                    )}
                  >
                    <span className={cn("block text-[10px] font-medium sm:text-xs", d.isToday ? "text-[#1c2027]/70" : "text-slate-500")}>
                      {format(d.dateISO, "EEE")}
                    </span>
                    <span className="mt-2 block text-xl font-semibold leading-none tracking-tight">
                      {format(d.dateISO, "d")}
                    </span>
                    <span className="mt-2 flex h-4 items-center justify-center">
                      {done ? (
                        <CheckCircle2 size={14} className={d.isToday ? "text-[#1c2027]" : "text-emerald-600"} />
                      ) : meta ? (
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <span className={cn("mt-1 block h-3 w-full truncate text-[9px] leading-3 sm:text-[10px]", d.isToday ? "text-[#1c2027]/70" : "text-slate-500")}>
                      {meta ? meta.short : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">Tap a day to explore your plan</p>

            {selectedDay && (
              <div id="week-day-detail" className="mt-3 animate-fade-in">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">
                        {selectedDay.isToday ? "Today" : "Selected day"}
                      </div>
                      <div className="truncate text-sm font-semibold text-ink">
                        {fmtFullDate(selectedDay.dateISO)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenDay(null)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"
                      aria-label="Close day details"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {selectedDay.assignments.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      Nothing scheduled this day.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {selectedDay.assignments.map((a) => (
                        <div key={a.id} className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">{a.workout.title}</h3>
                            {a.workout.scope === "INDIVIDUAL" && (
                              <span className="badge bg-brand-50 text-brand-800 ring-brand-600/20">
                                For you
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <TypeBadge type={a.workout.type} />
                            {a.workout.type !== "REST" && <StatusBadge status={a.status} />}
                          </div>
                          {a.workout.type === "REST" ? (
                            a.workout.notes && (
                              <p className="mt-3 text-sm text-slate-600">
                                {a.workout.notes}
                              </p>
                            )
                          ) : (
                            <div className="mt-3">
                              <WorkoutDetail
                                workout={a.workout}
                                customNote={a.customNote}
                                liftTime={paces?.liftTime}
                                compact
                              />
                            </div>
                          )}
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <AthleteWorkoutActions assignment={a} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <PacesCard group={group} lrTarget={lrTarget} ezTarget={ezTarget} paces={paces} className="rounded-3xl" />

          <Link href="/calendar" className="card card-link flex items-center gap-3 rounded-3xl p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <IconCalendar size={22} strokeWidth={1.7} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">The bigger picture</div>
              <div className="mt-0.5 text-xs text-slate-500">Explore your monthly calendar</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
