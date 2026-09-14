"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import { IconProfile, IconProgress, IconTeam, IconToday, IconTraining } from "./ui/icons";
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

const WorkoutImportModal = dynamic(() => import("./workout-import-modal").then((module) => module.WorkoutImportModal), { ssr: false });

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

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 hidden items-center justify-between border-b border-slate-200 pb-2 sm:flex">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
        {count}
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
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CoachWorkoutRow | null>(null);
  const [deleting, setDeleting] = useState<CoachWorkoutRow | null>(null);
  const [notesFor, setNotesFor] = useState<CoachWorkoutRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<"upcoming" | "past">("upcoming");

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
  const todayCount = workouts.filter((w) => format(w.dateISO, "yyyy-MM-dd") === todayKey).length;
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
      <article className="card min-w-0 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-center">
          <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
              <span className="block text-xs font-medium text-slate-500">
                {format(w.dateISO, "MMM")}
              </span>
              <span className="block text-2xl font-semibold leading-tight text-ink">
                {format(w.dateISO, "d")}
              </span>
              <span className="block text-xs text-slate-500">
                {format(w.dateISO, "EEE")}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-ink">{w.title}</h3>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TypeBadge type={w.type} />
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {w.scope === "INDIVIDUAL" ? <IconProfile size={12} strokeWidth={1.7} /> : <IconTeam size={12} strokeWidth={1.7} />}
                  {w.scope === "INDIVIDUAL"
                    ? `${w.athleteIds.length} athlete${w.athleteIds.length === 1 ? "" : "s"}`
                    : "Team"}
                </span>
              </div>

              <div className="mt-2 text-sm text-slate-500">{smartDayLabel(w.dateISO)}</div>
            </div>
            <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {summary.length > 0 ? (
                  summary.map((item, index) => (
                    <span key={`${item}-${index}`} className="max-w-full break-words rounded-lg bg-slate-50 px-2.5 py-1.5">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="rounded border border-slate-200 bg-white px-2 py-1">
                    No distance set
                  </span>
                )}
              </div>

              {w.mainSet && (
                <p className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-slate-600">
                  {w.mainSet}
                </p>
              )}

              {w.scope === "INDIVIDUAL" && w.athleteIds.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex shrink-0 -space-x-1.5">
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
          </div>

          <div className="border-t border-slate-100 pt-4 lg:border-0 lg:pt-0">
            {!isRest ? (
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{pct}%</span>
                  <span className="text-slate-500">{w.completed}/{w.total} done</span>
                </div>
                <AnimatedBar value={pct} className="mt-2" barClassName="bg-emerald-500" />
              </div>
            ) : (
              <span className="inline-flex rounded bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                Recovery day
              </span>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 lg:justify-end">
              {w.assignmentNotes.length > 0 && (
                <button
                  onClick={() => setNotesFor(w)}
                  className="btn-outline min-h-11 flex-1 !px-2.5 text-xs sm:flex-none"
                  aria-label={`Personal notes for ${w.title}`}
                >
                  <StickyNote size={14} /> Notes
                  {notesCount > 0 && (
                    <span className="rounded bg-brand-400 px-1.5 text-[10px] font-semibold text-ink">
                      {notesCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setEditing(w)}
                className="btn-outline min-h-11 flex-1 !px-2.5 text-xs sm:flex-none"
                aria-label={`Edit ${w.title}`}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => setDeleting(w)}
                className="btn-outline min-h-11 flex-1 !px-2.5 text-xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:flex-none"
                aria-label={`Delete ${w.title}`}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="card border-brand-200 bg-brand-50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">Training planner</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Workouts
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {format(nowISO, "EEEE, MMM d")} · {workouts.length} sessions
            </p>
          </div>
          <button className="btn-primary shrink-0 self-start" onClick={() => setCreateOpen(true)} aria-label="New workout">
            <Plus size={16} /> <span className="sm:hidden">New</span><span className="hidden sm:inline">New workout</span>
          </button>
        </div>

        <button className="btn-outline mt-4 min-h-12 w-full sm:w-auto" onClick={() => setImportOpen(true)}>
          <Upload size={18} strokeWidth={1.7} /> Import Excel week
        </button>

        {nextWorkout && (
          <div className="mt-4 hidden rounded-xl border border-brand-200/70 bg-white p-4 sm:block">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", workoutMeta(nextWorkout.type).dot)} />
                  <span className="text-sm font-medium text-slate-500">Next session</span>
                </div>
                <h2 className="break-words text-lg font-semibold leading-snug text-ink">{nextWorkout.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {smartDayLabel(nextWorkout.dateISO)} ·{" "}
                  {nextWorkout.scope === "INDIVIDUAL"
                    ? `${nextWorkout.athleteIds.length} assigned`
                    : "Full team"}
                </p>
              </div>
              {nextWorkout.mainSet && (
                <p className="line-clamp-2 max-w-xl break-words text-sm leading-relaxed text-slate-600 sm:line-clamp-none">
                  {nextWorkout.mainSet}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <MetricTile icon={IconTraining} label="Upcoming" value={upcoming.length} detail="sessions ahead" />
        <MetricTile icon={IconToday} label="Today" value={todayCount} detail="on the calendar" />
        <MetricTile icon={IconProgress} label="Complete" value={completionPct} suffix="%" detail={`${completedTotal}/${assignedTotal} assignments`} />
        <MetricTile icon={IconTeam} label="Athletes" value={athletes.length} detail="active roster" />
      </div>

      {workouts.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          description="Create your first session and assign it to the team or specific athletes."
          action={
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> New workout
            </button>
          }
        />
      ) : (
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
                  Nothing scheduled ahead.
                </p>
              ) : (
                <RevealList items={upcoming} className="space-y-3 list-long" noun="sessions">
                  {(w) => <Row key={w.id} w={w} />}
                </RevealList>
              )}
            </section>

            {past.length > 0 ? (
              <section className={cn(mobileTab !== "past" && "hidden sm:block")}>
                <SectionHeader title="Earlier" count={past.length} />
                <RevealList items={past} className="space-y-3 list-long" noun="sessions">
                  {(w) => <Row key={w.id} w={w} />}
                </RevealList>
              </section>
            ) : mobileTab === "past" && (
              <p className="card p-5 text-sm text-slate-500 sm:hidden">Past sessions will appear here.</p>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-7 xl:self-start">
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Team Load</h2>
                <span className="text-xs text-slate-500">{completionPct}% complete</span>
              </div>
              <AnimatedBar value={completionPct} barClassName="bg-emerald-500" />
              <p className="mt-3 text-sm text-slate-600">
                {completedTotal} of {assignedTotal} assignments complete.
              </p>
            </section>

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Session Mix</h2>
                <span className="text-xs text-slate-500">{workouts.length} total</span>
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
      )}

      <WorkoutFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        athletes={athletes}
      />
      {importOpen && <WorkoutImportModal open onClose={() => setImportOpen(false)} nowISO={nowISO} />}
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

      <Portal>
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-400 text-ink-900 shadow-lift transition hover:bg-brand-300 active:scale-95 lg:hidden"
          style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
          aria-label="New workout"
        >
          <Plus size={24} />
        </button>
      </Portal>
    </div>
  );
}
