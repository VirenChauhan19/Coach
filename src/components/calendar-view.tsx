"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  User,
  Users,
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
  const [mobileDay, setMobileDay] = useState(() => dayKey(now));
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
  const agendaDay = isSameMonth(keyToDate(mobileDay), cursor) ? mobileDay : dayKey(cursor);
  const agendaEvents = eventsByDay.get(agendaDay) ?? [];

  return (
    <div className="min-w-0">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 sm:flex sm:flex-wrap sm:justify-between">
        <h2 className="text-xl font-semibold leading-tight tracking-tight text-ink">{periodLabel}</h2>
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white sm:order-last">
          <button
            className="flex h-11 w-11 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50"
            onClick={() => go(-1)}
            aria-label={`Previous ${view}`}
          >
            <ChevronLeft size={19} />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center border-l border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
            onClick={() => go(1)}
            aria-label={`Next ${view}`}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="col-span-2 flex items-center gap-3 sm:ml-auto">
          <div className="inline-flex flex-1 rounded-xl bg-slate-100 p-1 text-sm sm:flex-none">
            {(["month", "week"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-4 font-semibold capitalize transition-colors",
                  view === v
                    ? "bg-white text-ink shadow-card"
                    : "text-slate-500 hover:text-ink"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn-outline min-h-11 px-4" onClick={() => { setCursor(now); setMobileDay(dayKey(now)); }}>
            Today
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-x-2 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-4">
        {WORKOUT_TYPE_ORDER.map((t) => {
          const m = workoutMeta(t);
          return (
            <span key={t} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", m.dot)} />
              <span className="sm:hidden">{m.short}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </span>
          );
        })}
      </div>

      <div key={view + periodKey} className="animate-fade-in">
        {view === "month" ? (
          <>
            <div className="space-y-5 sm:hidden">
              <div className="card overflow-hidden p-2">
                <div className="grid grid-cols-7">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{weekday}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {days.map((date) => {
                    const key = dayKey(date);
                    const dayEvents = eventsByDay.get(key) ?? [];
                    const active = key === agendaDay;
                    const today = isSameDay(date, now);
                    const inMonth = isSameMonth(date, cursor);
                    const types = Array.from(new Set(dayEvents.map((event) => event.type)));
                    return (
                      <button
                        key={key}
                        onClick={() => { setMobileDay(key); if (!inMonth) setCursor(date); }}
                        aria-label={`${format(date, "EEEE, MMMM d")}, ${dayEvents.length} session${dayEvents.length === 1 ? "" : "s"}`}
                        aria-pressed={active}
                        aria-current={today ? "date" : undefined}
                        className={cn(
                          "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                          active ? "bg-ink text-white shadow-card" : today ? "bg-brand-50 text-brand-800" : inMonth ? "text-slate-700 hover:bg-slate-50" : "text-slate-300"
                        )}
                      >
                        <span>{format(date, "d")}</span>
                        <span className="flex h-1.5 items-center justify-center gap-0.5" aria-hidden="true">
                          {types.slice(0, 3).map((type) => <span key={type} className={cn("h-1 w-1 rounded-full", workoutMeta(type).dot)} />)}
                          {types.length > 3 && <span className="text-[8px] leading-none">+</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <section aria-label="Selected day sessions">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div aria-live="polite">
                    <h3 className="text-base font-semibold text-ink">
                      {isSameDay(keyToDate(agendaDay), now) ? "Today’s sessions" : format(keyToDate(agendaDay), "EEEE, MMM d")}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">{agendaEvents.length} session{agendaEvents.length === 1 ? "" : "s"} scheduled</p>
                  </div>
                  {isCoach && (
                    <button onClick={() => openAdd(agendaDay)} className="btn-outline min-h-11 shrink-0" aria-label={`Add workout on ${format(keyToDate(agendaDay), "MMMM d")}`}>
                      <Plus size={16} /> Add
                    </button>
                  )}
                </div>
                {agendaEvents.length === 0 ? (
                  <div className="card flex items-center gap-3 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><CalendarDays size={21} /></span>
                    <div><p className="text-sm font-medium text-ink">A little breathing room</p><p className="mt-1 text-xs text-slate-500">Nothing scheduled for this day.</p></div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {agendaEvents.map((event) => (
                      <button key={event.id} onClick={() => setSelectedDay(agendaDay)} className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50">
                        <span className={cn("h-11 w-1 shrink-0 rounded-full", workoutMeta(event.type).bar)} />
                        <span className="min-w-0 flex-1">
                          <span className="mb-1.5 flex flex-wrap items-center gap-2"><TypeBadge type={event.type} />{event.status === "COMPLETED" && <CheckCircle2 size={15} className="text-emerald-600" />}</span>
                          <span className="block break-words text-[15px] font-semibold leading-snug text-ink">{event.title}</span>
                          {(event.distance || event.location) && <span className="mt-1 block break-words text-xs leading-relaxed text-slate-500">{[event.distance, event.location].filter(Boolean).join(" · ")}</span>}
                        </span>
                        <ChevronRight size={17} className="shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className="card hidden overflow-hidden sm:block">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
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
                  const shown = Array.from(new Map(dayEvents.map((e) => [e.title, e])).values());
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
                        "group relative min-h-[84px] cursor-pointer border-b border-r border-slate-200 p-1.5 text-left align-top transition-colors last:border-r-0 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/15 sm:min-h-[112px]",
                        inMonth ? (isWeekend(d) ? "bg-slate-50/50" : "bg-white") : "bg-paper",
                        today && "ring-2 ring-inset ring-ink"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            today ? "bg-ink text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                          )}
                        >
                          {format(d, "d")}
                        </span>
                        {isCoach && inMonth && (
                          <button
                            onClick={(e) => openAdd(k, e)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors hover:bg-white hover:text-ink focus:opacity-100 group-hover:opacity-100"
                            aria-label={`Add workout on ${format(d, "MMMM d")}`}
                            title="Add workout"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="hidden space-y-1 sm:block">
                          {shown.slice(0, 3).map((e) => {
                            const m = workoutMeta(e.type);
                            const done = e.status === "COMPLETED";
                            return (
                              <div
                                key={e.id}
                                className="flex items-center gap-1 truncate rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                              >
                                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", m.dot)} />
                                <span className="truncate">{e.title}</span>
                                {done && <CheckCircle2 size={11} className="ml-auto shrink-0 text-emerald-500" />}
                              </div>
                            );
                          })}
                          {shown.length > 3 && (
                            <div className="px-1 text-[10px] font-medium text-slate-400">
                              +{shown.length - 3} more
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-0.5 sm:hidden">
                          {dayEvents.slice(0, 4).map((e) => (
                            <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", workoutMeta(e.type).dot)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            {days.map((d) => {
              const k = dayKey(d);
              const dayEvents = eventsByDay.get(k) ?? [];
              const today = isSameDay(d, now);
              return (
                <div key={k} className={cn("card flex min-w-0 flex-col overflow-hidden xl:min-h-[440px]", today && "ring-2 ring-brand-400")}>
                  <div className={cn("flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2", today ? "bg-ink text-white" : isWeekend(d) ? "bg-slate-50" : "bg-white")}>
                    <div className="flex items-baseline gap-2 xl:block">
                      <div className={cn("text-xs font-medium", today ? "text-slate-300" : "text-slate-500")}>
                        {format(d, "EEE")}
                      </div>
                      <div className="text-lg font-semibold leading-none">{format(d, "d")}</div>
                    </div>
                    {isCoach && (
                      <button
                        onClick={() => openAdd(k)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                          today ? "text-slate-300 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100 hover:text-ink"
                        )}
                        aria-label={`Add workout on ${format(d, "MMMM d")}`}
                        title="Add workout"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 p-3 xl:p-2">
                    {dayEvents.length === 0 ? (
                      isCoach ? (
                        <button
                          onClick={() => openAdd(k)}
                          className="flex h-full min-h-[60px] w-full items-center justify-center rounded-md text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                        >
                          Add session
                        </button>
                      ) : (
                        <div className="flex h-full min-h-[60px] items-center justify-center text-xs text-slate-400">
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
                            className="flex min-h-14 w-full items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 xl:rounded-md xl:p-2"
                          >
                            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", m.dot)} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1">
                                <span className="break-words text-sm font-semibold text-ink xl:text-xs">{e.title}</span>
                                {done && <CheckCircle2 size={12} className="shrink-0 text-emerald-500" />}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 break-words text-xs text-slate-500 xl:text-[11px]">
                                <span>{m.short}</span>
                                {e.distance && <span>{e.distance}</span>}
                                {e.location && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin size={10} /> {e.location}
                                  </span>
                                )}
                                {isCoach && (
                                  <span className="inline-flex items-center gap-0.5">
                                    {e.scope === "INDIVIDUAL" ? <User size={10} /> : <Users size={10} />}
                                    {e.scope === "INDIVIDUAL" ? e.assignedCount ?? 0 : "Team"}
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

      <Modal
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(keyToDate(selectedDay), "EEEE, MMMM d") : ""}
        size="md"
        footer={
          isCoach && selectedDay ? (
            <button className="btn-primary" onClick={() => openAdd(selectedDay)}>
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
              <li key={e.id} className="min-w-0 break-words rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 font-semibold text-ink">{e.title}</div>
                  <span className="shrink-0">{e.status ? <StatusBadge status={e.status} /> : <TypeBadge type={e.type} />}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {e.status && <TypeBadge type={e.type} />}
                  {e.distance && <span>{e.distance}</span>}
                  {e.location && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin size={12} className="shrink-0" /> <span className="min-w-0">{e.location}</span>
                    </span>
                  )}
                  {isCoach && e.scope !== "INDIVIDUAL" && <span>Whole team</span>}
                </div>
                {isCoach && e.scope === "INDIVIDUAL" && e.assigneeIds && e.assigneeIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex shrink-0 -space-x-1.5">
                      {e.assigneeIds.slice(0, 6).map((id) => (
                        <span key={id} className="rounded-full ring-2 ring-white">
                          <Avatar name={nameById.get(id) ?? "?"} seed={id} size={22} />
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{assigneeNames(e.assigneeIds)}</span>
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
