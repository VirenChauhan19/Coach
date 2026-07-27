"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { IconStopwatch, IconCalendar, IconRunner } from "./ui/icons";
import { WorkoutFormModal, type WorkoutInitial } from "./workout-form-modal";
import { WorkoutNotesModal } from "./workout-notes-modal";
import { Portal } from "./ui/portal";
import { Modal } from "./ui/modal";
import { Avatar } from "./ui/avatar";
import { TypeBadge } from "./ui/badges";
import { EmptyState } from "./ui/empty";
import { AnimatedBar, CountUp } from "./ui/stat";
import { RevealList } from "./ui/reveal-list";
import { WORKOUT_TYPE_ORDER, workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";
import { compareWorkouts, compareWorkoutsDesc } from "@/lib/ordering";

export type CoachWorkoutRow = WorkoutInitial & {
  total: number;
  completed: number;
  assignmentNotes: { id: string; athleteId: string; note: string | null }[];
};

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

export function CoachWorkouts({
  workouts,
  athletes,
  nowISO,
}: {
  workouts: CoachWorkoutRow[];
  athletes: { id: string; name: string }[];
  nowISO: string;
}) {
  const { format, smartDayLabel } = useDates();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CoachWorkoutRow | null>(null);
  const [deleting, setDeleting] = useState<CoachWorkoutRow | null>(null);
  const [notesFor, setNotesFor] = useState<CoachWorkoutRow | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(athletes.map((a) => [a.id, a.name])),
    [athletes]
  );
  const firstName = (id: string) => (nameById.get(id) ?? "?").split(" ")[0];
  const assigneeLabel = (ids: string[]) =>
    ids.length <= 2
      ? ids.map(firstName).join(", ")
      : `${ids.slice(0, 2).map(firstName).join(", ")} +${ids.length - 2} more`;

  const todayKey = format(nowISO, "yyyy-MM-dd");
  const upcoming = workouts
    .filter((w) => format(w.dateISO, "yyyy-MM-dd") >= todayKey)
    .sort(compareWorkouts);
  const past = workouts
    .filter((w) => format(w.dateISO, "yyyy-MM-dd") < todayKey)
    .sort(compareWorkoutsDesc);
  const trackable = workouts.filter((w) => w.type !== "REST");
  const assignedTotal = trackable.reduce((sum, w) => sum + w.total, 0);
  const completedTotal = trackable.reduce((sum, w) => sum + w.completed, 0);
  const completionPct = assignedTotal
    ? Math.round((completedTotal / assignedTotal) * 100)
    : 0;
  const todayCount = workouts.filter(
    (w) => format(w.dateISO, "yyyy-MM-dd") === todayKey
  ).length;
  const nextWorkout = upcoming[0];
  const typeCounts = WORKOUT_TYPE_ORDER.map((type) => ({
    type,
    count: workouts.filter((w) => w.type === type).length,
  })).filter((item) => item.count > 0);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await fetch(`/api/workouts/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const Row = ({ w }: { w: CoachWorkoutRow }) => {
    const pct = w.total ? Math.round((w.completed / w.total) * 100) : 0;
    const isRest = w.type === "REST";
    const meta = workoutMeta(w.type);
    const notesCount = w.assignmentNotes.filter((n) => n.note).length;
    const summary = [w.distance, w.pace, w.location].filter(
      (item): item is string => Boolean(item)
    );

    return (
      <article className="group overflow-hidden rounded-lg border border-paper-200 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-ink/20">
        <div className="grid gap-0 sm:grid-cols-[92px_1fr]">
          <div className={cn("flex items-center gap-3 p-4 text-white sm:block", meta.bar)}>
            <div className="rounded-md bg-white/15 px-3 py-2 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.22)]">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                {format(w.dateISO, "MMM")}
              </span>
              <span className="block font-display text-4xl font-bold leading-none">
                {format(w.dateISO, "d")}
              </span>
              <span className="block text-[11px] opacity-80">
                {format(w.dateISO, "EEE")}
              </span>
            </div>
            <div className="sm:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                {smartDayLabel(w.dateISO)}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{w.title}</p>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_180px] lg:items-center lg:p-5">
            <div className="min-w-0">
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                <h3 className="truncate text-lg font-bold text-ink">{w.title}</h3>
                <TypeBadge type={w.type} />
                <span className="inline-flex items-center gap-1 rounded bg-paper-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {w.scope === "INDIVIDUAL" ? <User size={12} /> : <Users size={12} />}
                  {w.scope === "INDIVIDUAL"
                    ? `${w.athleteIds.length} athlete${w.athleteIds.length === 1 ? "" : "s"}`
                    : "Team"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:mt-2 sm:hidden">
                <TypeBadge type={w.type} />
                <span className="inline-flex items-center gap-1 rounded bg-paper-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {w.scope === "INDIVIDUAL" ? <User size={12} /> : <Users size={12} />}
                  {w.scope === "INDIVIDUAL"
                    ? `${w.athleteIds.length} athlete${w.athleteIds.length === 1 ? "" : "s"}`
                    : "Team"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {summary.length > 0 ? (
                  summary.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-md border border-paper-200 bg-paper-50 px-2 py-1"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="rounded-md border border-paper-200 bg-paper-50 px-2 py-1">
                    No distance set
                  </span>
                )}
              </div>

              {w.mainSet && (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {w.mainSet}
                </p>
              )}

              {w.scope === "INDIVIDUAL" && w.athleteIds.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {w.athleteIds.slice(0, 5).map((id) => (
                      <span key={id} className="rounded-full ring-2 ring-white">
                        <Avatar name={nameById.get(id) ?? "?"} seed={id} size={22} />
                      </span>
                    ))}
                  </div>
                  <span className="truncate text-xs text-slate-500">
                    {assigneeLabel(w.athleteIds)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 lg:block">
              {!isRest ? (
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <span className="font-display text-3xl font-bold leading-none text-ink">
                      {pct}%
                    </span>
                    <span className="pb-1 text-xs text-slate-500">
                      {w.completed}/{w.total} done
                    </span>
                  </div>
                  <AnimatedBar value={pct} className="mt-2" barClassName="bg-brand-500" />
                </div>
              ) : (
                <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                  Recovery day
                </span>
              )}

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:mt-4">
                {w.assignmentNotes.length > 0 && (
                  <button
                    onClick={() => setNotesFor(w)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100"
                    aria-label={`Personal notes for ${w.title}`}
                  >
                    <StickyNote size={15} /> Notes
                    {notesCount > 0 && (
                      <span className="ml-0.5 rounded bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                        {notesCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setEditing(w)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-paper-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-ink/20 hover:text-ink"
                  aria-label={`Edit ${w.title}`}
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  onClick={() => setDeleting(w)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-paper-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Delete ${w.title}`}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-ink/10 bg-ink text-white shadow-soft">
        <div className="relative grid min-h-[300px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgb(234_179_8_/_0.24),transparent_30%),linear-gradient(135deg,rgb(255_255_255_/_0.12),transparent_38%)]" />
          <div className="relative flex flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                Workout command center
              </p>
              <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-6xl xl:text-7xl">
                Workouts
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Build the week, assign the right athletes, and keep completion visible
                without digging through individual sessions.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button className="btn-gold" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> New workout
              </button>
              <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {format(nowISO, "EEEE, MMM d")}
              </span>
            </div>
          </div>

          <div className="relative border-t border-white/10 bg-white/[0.06] p-5 backdrop-blur lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-ink-900/45 p-5">
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Next session
                  </span>
                  <span className="h-2 w-2 rounded-full bg-brand-400" />
                </div>
                {nextWorkout ? (
                  <>
                    <TypeBadge
                      type={nextWorkout.type}
                      className="bg-white/[0.08] text-white ring-white/15"
                    />
                    <h2 className="mt-3 font-display text-3xl font-bold uppercase leading-none text-white">
                      {nextWorkout.title}
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-slate-200">
                        {smartDayLabel(nextWorkout.dateISO)}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.07] px-3 py-2 text-slate-200">
                        {nextWorkout.scope === "INDIVIDUAL"
                          ? `${nextWorkout.athleteIds.length} assigned`
                          : "Full team"}
                      </span>
                    </div>
                    {nextWorkout.mainSet && (
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300">
                        {nextWorkout.mainSet}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    No future workout is scheduled. Create the next session to start
                    filling this board.
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
                    <CountUp value={todayCount} />
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
          value={todayCount}
          detail="on the calendar"
        />
        <MetricTile
          icon={CheckCircle2}
          label="Complete"
          value={completionPct}
          suffix="%"
          detail={`${completedTotal}/${assignedTotal} assignments`}
        />
        <MetricTile
          icon={IconRunner}
          label="Athletes"
          value={athletes.length}
          detail="active roster"
        />
      </div>

      {workouts.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          description="Create your first session and assign it to the team or specific athletes."
          action={
            <button className="btn-gold" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New workout
            </button>
          }
        />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-7">
            <section>
              <SectionHeader title="Upcoming timeline" count={upcoming.length} />
              {upcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-paper-200 bg-white/60 p-5 text-sm text-slate-500">
                  Nothing scheduled ahead.
                </p>
              ) : (
                <RevealList items={upcoming} className="space-y-4 list-long" noun="sessions">
                  {(w) => <Row key={w.id} w={w} />}
                </RevealList>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <SectionHeader title="Earlier" count={past.length} muted />
                <RevealList
                  items={past}
                  className="space-y-4 opacity-90 list-long"
                  noun="sessions"
                >
                  {(w) => <Row key={w.id} w={w} />}
                </RevealList>
              </section>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
            <section className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-soft">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em]">
                  Team load
                </h2>
                <span className="text-[10px] uppercase tracking-[0.16em] text-brand-300">
                  Live
                </span>
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
                    {completedTotal} of {assignedTotal} assignments complete
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Rest days are excluded so the completion signal stays focused on
                    workouts athletes need to log.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-paper-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between border-b border-paper-200 pb-3">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                  Session mix
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  {workouts.length} total
                </span>
              </div>
              {typeCounts.length === 0 ? (
                <p className="text-sm text-slate-500">No sessions yet.</p>
              ) : (
                <div className="space-y-3">
                  {typeCounts.map(({ type, count }) => {
                    const meta = workoutMeta(type);
                    const pct = workouts.length ? Math.round((count / workouts.length) * 100) : 0;
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
      )}

      <WorkoutFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        athletes={athletes}
      />
      {editing && (
        <WorkoutFormModal
          open
          onClose={() => setEditing(null)}
          athletes={athletes}
          initial={editing}
        />
      )}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete workout?"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This will remove <span className="font-semibold">{deleting?.title}</span>{" "}
          ({deleting ? smartDayLabel(deleting.dateISO) : ""}) and all athlete responses
          for it. This can&apos;t be undone.
        </p>
      </Modal>

      {notesFor && (
        <WorkoutNotesModal
          open
          onClose={() => setNotesFor(null)}
          workoutTitle={notesFor.title}
          rows={notesFor.assignmentNotes.map((n) => ({
            id: n.id,
            athleteId: n.athleteId,
            name: nameById.get(n.athleteId) ?? "Athlete",
            note: n.note,
          }))}
        />
      )}

      {/* Mobile quick-add: a New workout button reachable from anywhere in the
          list. Portalled to <body> so it stays pinned to the viewport (the page
          wrapper's transform would otherwise anchor it mid-page). */}
      <Portal>
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed right-5 z-40 flex items-center gap-2 rounded-full bg-brand-400 px-5 py-3.5 font-semibold text-ink shadow-[0_12px_30px_-8px_rgb(19_23_31_/_0.55)] transition active:scale-95 lg:hidden"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
          aria-label="New workout"
        >
          <Plus size={20} /> Workout
        </button>
      </Portal>
    </div>
  );
}
