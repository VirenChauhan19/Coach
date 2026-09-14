"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
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

/** One week of the strip. The server sends a window of these; see the dashboard page. */
export type WeekBlock = {
  startISO: string;
  days: DayCell[];
};

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AthleteDashboard({
  firstName,
  coachName,
  nowISO,
  today,
  weeks,
  currentWeekIndex,
  viewIds,
  latestAnnouncement,
  unreadCount,
  latestMessage,
  weekStats,
  group,
  lrTarget,
  ezTarget,
  paces,
}: {
  firstName: string;
  coachName: string;
  nowISO: string;
  today: AssignmentDTO[];
  weeks: WeekBlock[];
  currentWeekIndex: number;
  viewIds: string[];
  latestAnnouncement: { body: string; createdISO: string } | null;
  unreadCount: number;
  latestMessage: { body: string; createdISO: string; fromCoach: boolean } | null;
  weekStats: { completed: number; total: number };
  group: string | null;
  lrTarget: string | null;
  ezTarget: string | null;
  paces: Paces | null;
}) {
  const { fmtFullDate, fmtRelative, fmtDayMonth, format, hourOfDay } = useDates();

  // Which week of the window the strip is showing, and which of its days is
  // opened in place. Paging closes the open day: it belongs to the week you
  // just left.
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

  // Swiping the strip sideways pages it, which is how this gets used on a
  // phone. Anything mostly-vertical is the page scrolling and is left alone.
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeFrom.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goWeek(dx < 0 ? 1 : -1);
  };

  const offset = weekIndex - currentWeekIndex;
  const weekRange = `${fmtDayMonth(shown.startISO)} – ${fmtDayMonth(shown.days[6].dateISO)}`;
  const weekLabel =
    offset === 0
      ? "This week"
      : offset === 1
        ? "Next week"
        : offset === -1
          ? "Last week"
          : `Week of ${fmtDayMonth(shown.startISO)}`;

  // Mark shown assignments as "viewed" so the coach gets read receipts.
  useEffect(() => {
    if (viewIds.length === 0) return;
    fetch("/api/assignments/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: viewIds }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-xl border border-ink/10 bg-ink text-white shadow-soft">
        {/* varsity diagonal stripe motif */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #EAB308 0, #EAB308 2px, transparent 2px, transparent 13px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_-15%,rgb(234_179_8_/_0.30),transparent_46%)]" />
        <div className="relative p-5 sm:p-7">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-300">
            <span className="h-3 w-1 rounded-full bg-brand-400" />
            {greeting(hourOfDay(nowISO))}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl xl:text-6xl">
            {firstName}
          </h1>
          <p className="mt-2.5 text-sm text-slate-300">
            {fmtFullDate(nowISO)} · Coached by {coachName}
          </p>
        </div>
        {/* gold baseline rule */}
        <div className="relative h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* main column */}
        <div className="space-y-6 lg:col-span-2 stagger">
          {/* Today */}
          <section>
            <h2 className="eyebrow mb-2">Today&apos;s session</h2>
            {today.length === 0 ? (
              <div className="card p-5 text-sm text-slate-500">
                Nothing scheduled for today. Check your weekly schedule below.
              </div>
            ) : (
              <div className="space-y-4">
                {today.map((a) => (
                  <div key={a.id} className="card overflow-hidden">
                    <div className={cn("h-1.5 w-full", workoutMeta(a.workout.type).bar)} />
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-ink">
                              {a.workout.title}
                            </h3>
                            {a.workout.scope === "INDIVIDUAL" && (
                              <span className="badge bg-brand-100 text-brand-800 ring-brand-600/30">
                                For you
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <TypeBadge type={a.workout.type} />
                            <StatusBadge status={a.status} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <WorkoutDetail workout={a.workout} customNote={a.customNote} />
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

          {/* The week strip — pages across the window the server sent */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => goWeek(-1)}
                  disabled={weekIndex === 0}
                  aria-label="Previous week"
                  className="-ml-1 rounded-md p-1 text-slate-400 transition hover:bg-paper-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="eyebrow truncate">{weekLabel}</h2>
                <button
                  type="button"
                  onClick={() => goWeek(1)}
                  disabled={weekIndex === weeks.length - 1}
                  aria-label="Next week"
                  className="rounded-md p-1 text-slate-400 transition hover:bg-paper-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {offset !== 0 && (
                  <button
                    type="button"
                    onClick={() => goWeek(-offset)}
                    className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-500 transition hover:bg-paper-100 hover:text-ink"
                  >
                    Today
                  </button>
                )}
                <Link
                  href="/workouts"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  Full schedule <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              {offset === 0
                ? "Tap any day to see that session. Swipe or use the arrows for other weeks."
                : `${weekRange} · tap any day to see that session.`}
            </p>
            <div
              key={shown.startISO}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="grid grid-cols-7 gap-1.5 stagger"
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
                    onClick={() => setOpenDay(isOpen ? null : d.dateISO)}
                    aria-expanded={isOpen}
                    // Only points at the panel while it exists.
                    aria-controls={isOpen ? "week-day-detail" : undefined}
                    aria-label={`${fmtFullDate(d.dateISO)} — ${
                      d.assignments.length === 0
                        ? "nothing scheduled"
                        : d.assignments.map((a) => a.workout.title).join(", ")
                    }`}
                    className={cn(
                      "rounded-lg border p-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                      d.isToday
                        ? "border-ink bg-ink text-white"
                        : "border-paper-200 bg-white hover:border-brand-300 hover:bg-brand-50/60",
                      isOpen && "ring-2 ring-brand-400 ring-offset-1"
                    )}
                  >
                    {/* Spans, not divs: a <button> may only contain phrasing
                        content, the same reason the calendar cells use them. */}
                    <span
                      className={cn(
                        "block text-[10px] font-semibold uppercase",
                        d.isToday ? "text-slate-300" : "text-slate-400"
                      )}
                    >
                      {format(d.dateISO, "EEE")}
                    </span>
                    <span className="block font-display text-lg font-bold leading-none">
                      {format(d.dateISO, "d")}
                    </span>
                    <span className="mt-1.5 flex h-4 items-center justify-center">
                      {meta ? (
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                      ) : (
                        <span className="text-[10px] text-slate-300">·</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-[10px]",
                        d.isToday ? "text-slate-200" : "text-slate-500"
                      )}
                    >
                      {meta ? meta.short : ""}
                    </span>
                    {done && (
                      <CheckCircle2
                        size={12}
                        className={cn(
                          "mx-auto mt-0.5",
                          d.isToday ? "text-emerald-300" : "text-emerald-500"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* The tapped day, opened in place. Every assignment for the week is
                already on the client, so this needs no extra request. */}
            {selectedDay && (
              <div id="week-day-detail" className="mt-3 animate-fade-in">
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-paper-200 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                        {selectedDay.isToday ? "Today" : "Selected day"}
                      </div>
                      <div className="truncate font-display text-base font-bold text-ink">
                        {fmtFullDate(selectedDay.dateISO)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenDay(null)}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-paper-100 hover:text-ink"
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
                    <div className="divide-y divide-paper-200">
                      {selectedDay.assignments.map((a) => (
                        <div key={a.id} className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-ink">{a.workout.title}</h3>
                            {a.workout.scope === "INDIVIDUAL" && (
                              <span className="badge bg-brand-100 text-brand-800 ring-brand-600/30">
                                For you
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <TypeBadge type={a.workout.type} />
                            {a.workout.type !== "REST" && (
                              <StatusBadge status={a.status} />
                            )}
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
                                compact
                              />
                            </div>
                          )}
                          <div className="mt-4 border-t border-slate-100 pt-3">
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

        {/* sidebar */}
        <div className="space-y-6 stagger">
          <PacesCard
            group={group}
            lrTarget={lrTarget}
            ezTarget={ezTarget}
            paces={paces}
          />
          {/* week stat */}
          <div className="card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              This week
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-4xl font-bold leading-none text-ink">
                <CountUp value={weekStats.completed} />
              </span>
              <span className="pb-1 text-sm text-slate-500">
                / {weekStats.total} sessions logged
              </span>
            </div>
            <AnimatedBar
              value={
                weekStats.total
                  ? Math.round((weekStats.completed / weekStats.total) * 100)
                  : 0
              }
              className="mt-3"
            />
          </div>

          {/* announcement */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Latest announcement
              </div>
            </div>
            {latestAnnouncement ? (
              <>
                <p className="mt-2 line-clamp-4 text-sm text-slate-700">
                  {latestAnnouncement.body}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {coachName} · {fmtRelative(latestAnnouncement.createdISO)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No announcements yet.</p>
            )}
            <Link
              href="/messages"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              Open messages <ArrowRight size={14} />
            </Link>
          </div>

          {/* messages */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Coach messages
              </div>
              {unreadCount > 0 && (
                <span className="badge bg-brand-500 text-white ring-0">
                  {unreadCount} new
                </span>
              )}
            </div>
            {latestMessage ? (
              <p className="mt-2 line-clamp-3 text-sm text-slate-700">
                <span className="font-medium text-ink">
                  {latestMessage.fromCoach ? `${coachName}: ` : "You: "}
                </span>
                {latestMessage.body}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No messages yet. Say hi to your coach.
              </p>
            )}
            <Link
              href="/messages"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
            >
              Open chat <ArrowRight size={14} />
            </Link>
          </div>

          <Link
            href="/calendar"
            className="card card-link flex items-center gap-3 p-5"
          >
            <span className="font-mono text-xs font-semibold text-brand-700">
              CAL
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Calendar</div>
              <div className="text-xs text-slate-500">See your month at a glance</div>
            </div>
            <ArrowRight size={16} className="ml-auto text-slate-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
