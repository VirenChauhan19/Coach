"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  MapPin,
  Users,
  User,
} from "lucide-react";
import { workoutInstantForDay } from "@/lib/date";
import { compareWorkouts } from "@/lib/ordering";
import { useDates } from "./time-zone";
import { WORKOUT_TYPE_ORDER, workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Modal } from "./ui/modal";
import { Avatar } from "./ui/avatar";
import { TypeBadge, StatusBadge } from "./ui/badges";
import { WorkoutFormModal } from "./workout-form-modal";

export type CalEvent = {
  id: string;
  title: string;
  type: string;
  dateISO: string;
  scope: string;
  status?: string | null;
  assignedCount?: number;
  assigneeIds?: string[];
  distance?: string | null;
  location?: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type View = "month" | "week";

// A bare "yyyy-MM-dd" key reparses as UTC midnight, which shifts a day in
// negative timezones. This is the same noon-UTC anchor a workout is stored at.
const keyToDate = (k: string) => workoutInstantForDay(k).toISOString();

export function CalendarView({
  events,
  isCoach,
  athletes = [],
  nowISO,
}: {
  events: CalEvent[];
  isCoach: boolean;
  athletes?: { id: string; name: string }[];
  nowISO: string;
}) {
  const {
    startOfMonth,
    endOfMonth,
    addDays,
    isSameDay,
    isSameMonth,
    format,
    weekStart,
    weekEnd,
    dayKey,
    isWeekend,
  } = useDates();
  const now = useMemo(() => new Date(nowISO), [nowISO]);
  const nameById = useMemo(
    () => new Map(athletes.map((a) => [a.id, a.name])),
    [athletes]
  );
  const firstName = (id: string) => (nameById.get(id) ?? "?").split(" ")[0];
  const assigneeNames = (ids: string[]) =>
    ids.length <= 3
      ? ids.map(firstName).join(", ")
      : `${ids.slice(0, 3).map(firstName).join(", ")} +${ids.length - 3}`;
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => now);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = dayKey(e.dateISO);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort(compareWorkouts);
    }
    return map;
  }, [events]);

  // Days rendered for the active view.
  const days = useMemo(() => {
    if (view === "week") {
      const s = weekStart(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const gridStart = weekStart(startOfMonth(cursor));
    const gridEnd = weekEnd(endOfMonth(cursor));
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [view, cursor]);

  function go(dir: number) {
    if (view === "week") {
      setCursor((c) => addDays(c, dir * 7));
    } else {
      setCursor((c) =>
        dir < 0
          ? startOfMonth(addDays(startOfMonth(c), -1))
          : startOfMonth(addDays(endOfMonth(c), 1))
      );
    }
  }

  // Arrow keys flip the month/week (ignored while a dialog or field is focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedDay || addOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDay, addOpen]);

  function openAdd(k: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setAddDate(k);
    setSelectedDay(null);
    setAddOpen(true);
  }

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];
  const wkStart = weekStart(cursor);
  const wkEnd = weekEnd(cursor);
  const periodLabel =
    view === "week"
      ? isSameMonth(wkStart, wkEnd)
        ? `${format(wkStart, "MMM d")} to ${format(wkEnd, "d, yyyy")}`
        : `${format(wkStart, "MMM d")} to ${format(wkEnd, "MMM d, yyyy")}`
      : format(cursor, "MMMM yyyy");
  const periodKey = view === "week" ? dayKey(wkStart) : format(cursor, "yyyy-MM");

  return (
    <div>
      {/* controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
          {periodLabel}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-paper-200 bg-paper-50 p-0.5 text-xs font-semibold">
            {(["month", "week"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 capitalize transition",
                  view === v
                    ? "bg-ink text-white shadow-sm"
                    : "text-slate-500 hover:text-ink"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn-outline px-2.5 py-1.5" onClick={() => setCursor(now)}>
            Today
          </button>
          <div className="flex overflow-hidden rounded-lg border border-paper-200">
            <button
              className="px-2 py-1.5 text-slate-600 transition hover:bg-paper-100 active:scale-95"
              onClick={() => go(-1)}
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="border-l border-paper-200 px-2 py-1.5 text-slate-600 transition hover:bg-paper-100 active:scale-95"
              onClick={() => go(1)}
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {WORKOUT_TYPE_ORDER.map((t) => {
          const m = workoutMeta(t);
          return (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500"
            >
              <span className={cn("h-2 w-2 rounded-full", m.dot)} />
              {m.label}
            </span>
          );
        })}
      </div>

      {/* the grid re-mounts (and crossfades) whenever the period or view changes */}
      <div key={view + periodKey} className="animate-fade-in">
        {view === "month" ? (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-paper-200 bg-paper-100">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  <span className="hidden sm:inline">{w}</span>
                  <span className="sm:hidden">{w[0]}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const k = dayKey(d);
                const dayEvents = eventsByDay.get(k) ?? [];
                const inMonth = isSameMonth(d, cursor);
                const today = isSameDay(d, now);
                // Collapse same-title sessions (e.g. all groups on an easy day)
                // into one chip so the coach month view stays readable.
                const shown = Array.from(
                  new Map(dayEvents.map((e) => [e.title, e])).values()
                );
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDay(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDay(k);
                      }
                    }}
                    className={cn(
                      "group relative min-h-[84px] cursor-pointer border-b border-r border-paper-200 p-1.5 text-left align-top transition last:border-r-0 hover:bg-brand-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 sm:min-h-[112px]",
                      inMonth
                        ? isWeekend(d)
                          ? "bg-paper-50"
                          : "bg-white"
                        : "bg-paper-100/40",
                      today && "ring-2 ring-inset ring-brand-400"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                          today
                            ? "bg-ink text-white"
                            : inMonth
                              ? "text-slate-600"
                              : "text-slate-300"
                        )}
                      >
                        {format(d, "d")}
                      </span>
                      {isCoach && inMonth && (
                        <button
                          onClick={(e) => openAdd(k, e)}
                          className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-brand-100 hover:text-brand-700 focus:opacity-100 group-hover:opacity-100"
                          aria-label={`Add workout on ${format(d, "MMMM d")}`}
                          title="Add workout"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {/* desktop chips */}
                      <div className="hidden space-y-1 sm:block">
                        {shown.slice(0, 3).map((e) => {
                          const m = workoutMeta(e.type);
                          const done = e.status === "COMPLETED";
                          return (
                            <div
                              key={e.id}
                              className={cn(
                                "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                                m.chip
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  m.dot
                                )}
                              />
                              <span className="truncate">{e.title}</span>
                              {done && (
                                <CheckCircle2 size={11} className="ml-auto shrink-0" />
                              )}
                            </div>
                          );
                        })}
                        {shown.length > 3 && (
                          <div className="px-1 text-[10px] font-medium text-slate-400">
                            +{shown.length - 3} more
                          </div>
                        )}
                      </div>
                      {/* mobile dots */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 4).map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              workoutMeta(e.type).dot
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="stagger grid grid-cols-1 gap-2 sm:grid-cols-7">
            {days.map((d) => {
              const k = dayKey(d);
              const dayEvents = eventsByDay.get(k) ?? [];
              const today = isSameDay(d, now);
              return (
                <div
                  key={k}
                  className={cn(
                    "card flex flex-col overflow-hidden sm:min-h-[440px]",
                    today && "ring-2 ring-brand-400"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 border-b border-paper-200 px-3 py-2",
                      today
                        ? "bg-ink text-white"
                        : isWeekend(d)
                          ? "bg-paper-50"
                          : "bg-white"
                    )}
                  >
                    <div>
                      <div
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide",
                          today ? "text-brand-300" : "text-slate-400"
                        )}
                      >
                        {format(d, "EEE")}
                      </div>
                      <div className="font-display text-lg font-bold leading-none">
                        {format(d, "d")}
                      </div>
                    </div>
                    {isCoach && (
                      <button
                        onClick={() => openAdd(k)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90",
                          today
                            ? "text-brand-300 hover:bg-white/10"
                            : "text-slate-400 hover:bg-brand-100 hover:text-brand-700"
                        )}
                        aria-label={`Add workout on ${format(d, "MMMM d")}`}
                        title="Add workout"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5 p-2">
                    {dayEvents.length === 0 ? (
                      isCoach ? (
                        <button
                          onClick={() => openAdd(k)}
                          className="flex h-full min-h-[60px] w-full items-center justify-center rounded-lg text-xs text-slate-300 transition hover:bg-paper-50 hover:text-slate-500"
                        >
                          + Add session
                        </button>
                      ) : (
                        <div className="flex h-full min-h-[60px] items-center justify-center text-xs text-slate-300">
                          Rest day
                        </div>
                      )
                    ) : (
                      dayEvents.map((e) => {
                        const m = workoutMeta(e.type);
                        const done = e.status === "COMPLETED";
                        return (
                          <button
                            key={e.id}
                            onClick={() => setSelectedDay(k)}
                            className="flex w-full items-stretch gap-2 overflow-hidden rounded-lg border border-paper-200 bg-white p-2 text-left transition-colors hover:border-brand-200 hover:bg-paper-50"
                          >
                            <span className={cn("w-1 shrink-0 rounded-full", m.bar)} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1">
                                <span className="truncate text-xs font-semibold text-ink">
                                  {e.title}
                                </span>
                                {done && (
                                  <CheckCircle2
                                    size={12}
                                    className="shrink-0 text-emerald-500"
                                  />
                                )}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium ring-1 ring-inset",
                                    m.chip
                                  )}
                                >
                                  <span
                                    className={cn("h-1.5 w-1.5 rounded-full", m.dot)}
                                  />
                                  {m.short}
                                </span>
                                {e.distance && <span>{e.distance}</span>}
                                {e.location && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin size={10} /> {e.location}
                                  </span>
                                )}
                                {isCoach && (
                                  <span className="inline-flex items-center gap-0.5">
                                    {e.scope === "INDIVIDUAL" ? (
                                      <User size={10} />
                                    ) : (
                                      <Users size={10} />
                                    )}
                                    {e.scope === "INDIVIDUAL"
                                      ? e.assignedCount ?? 0
                                      : "Team"}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* day detail modal */}
      <Modal
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(keyToDate(selectedDay), "EEEE, MMMM d") : ""}
        size="md"
        footer={
          isCoach && selectedDay ? (
            <button className="btn-gold" onClick={() => openAdd(selectedDay)}>
              <Plus size={16} /> Add workout
            </button>
          ) : undefined
        }
      >
        {selectedEvents.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">Nothing scheduled this day.</p>
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-paper-200 p-3 transition hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-ink">{e.title}</div>
                  {e.status ? (
                    <StatusBadge status={e.status} />
                  ) : (
                    <TypeBadge type={e.type} />
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {e.status && <TypeBadge type={e.type} />}
                  {e.distance && <span>{e.distance}</span>}
                  {e.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {e.location}
                    </span>
                  )}
                  {isCoach && e.scope !== "INDIVIDUAL" && <span>Whole team</span>}
                </div>
                {isCoach &&
                  e.scope === "INDIVIDUAL" &&
                  e.assigneeIds &&
                  e.assigneeIds.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {e.assigneeIds.slice(0, 6).map((id) => (
                          <span key={id} className="rounded-full ring-2 ring-white">
                            <Avatar name={nameById.get(id) ?? "?"} seed={id} size={22} />
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">
                        {assigneeNames(e.assigneeIds)}
                      </span>
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {isCoach && (
        <WorkoutFormModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          athletes={athletes}
          defaultDateISO={addDate ? keyToDate(addDate) : undefined}
        />
      )}
    </div>
  );
}
