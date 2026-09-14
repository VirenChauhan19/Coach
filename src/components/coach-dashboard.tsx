"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Plus, Upload } from "lucide-react";
import { WorkoutFormModal } from "./workout-form-modal";
import { Avatar } from "./ui/avatar";
import { TypeBadge } from "./ui/badges";
import { EmptyState } from "./ui/empty";
import { CountUp, AnimatedBar } from "./ui/stat";
import { statusMeta, workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";

const WorkoutImportModal = dynamic(() => import("./workout-import-modal").then((module) => module.WorkoutImportModal), { ssr: false });

type TodayWorkout = {
  id: string;
  title: string;
  type: string;
  scope: string;
  total: number;
  completed: number;
  viewed: number;
};

type RosterRow = { id: string; name: string; status: string };

type FeedbackRow = {
  athleteId: string;
  athleteName: string;
  workoutTitle: string;
  type: string;
  effort: number | null;
  feeling: string | null;
  soreness: string | null;
  completed: boolean;
  whenISO: string;
};

type UpcomingRow = {
  id: string;
  title: string;
  type: string;
  dateISO: string;
  scope: string;
  assignedCount: number;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-ink">{children}</h2>;
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="card flex flex-col-reverse gap-1.5 p-3.5 sm:p-4">
      <div className="text-[11px] font-medium text-slate-500 sm:text-sm">{label}</div>
      <div className="text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-3xl">
        <CountUp value={value} suffix={suffix} />
      </div>
    </div>
  );
}

const ROSTER_FILTERS = [
  { key: "all", label: "All" },
  { key: "done", label: "Done" },
  { key: "flag", label: "Flagged" },
] as const;
type RosterFilter = (typeof ROSTER_FILTERS)[number]["key"];

function matchesFilter(status: string, filter: RosterFilter) {
  if (filter === "all") return true;
  if (filter === "done") return status === "COMPLETED";
  return status === "NEEDS_DISCUSSION" || status === "SKIPPED";
}

export function CoachDashboard({
  coachFirstName,
  nowISO,
  teamName,
  season,
  athletes,
  stats,
  today,
  roster,
  recentFeedback,
  upcoming,
}: {
  coachFirstName: string;
  nowISO: string;
  teamName: string;
  season: string | null;
  athletes: { id: string; name: string }[];
  stats: {
    athleteCount: number;
    weekCompletionPct: number;
    needsDiscussion: number;
  };
  today: TodayWorkout[];
  roster: RosterRow[];
  recentFeedback: FeedbackRow[];
  upcoming: UpcomingRow[];
}) {
  const { fmtFullDate, fmtRelative, smartDayLabel } = useDates();
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");

  const shownRoster = roster.filter((r) => matchesFilter(r.status, rosterFilter));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] bg-ink-900 px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-80 w-64 rotate-[25deg] rounded-full border-[18px] border-brand-400/10 outline outline-[18px] outline-offset-[12px] outline-brand-400/5" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">
              {season || "SCAD Atlanta"} · Team hub
            </p>
            <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {coachFirstName ? `Welcome back, ${coachFirstName}.` : teamName}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/65">Your team. One step stronger.</p>
            <p className="mt-1 text-xs text-white/50">{fmtFullDate(nowISO)}</p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <button className="btn-primary w-full sm:w-auto" onClick={() => setWorkoutOpen(true)}>
              <Plus size={16} /> New workout
            </button>
            <button className="btn-outline min-h-12 w-full sm:w-auto" onClick={() => setImportOpen(true)}>
              <Upload size={18} strokeWidth={1.7} /> Import Excel week
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Stat label="Active athletes" value={stats.athleteCount} />
        <Stat label="Week complete" value={stats.weekCompletionPct} suffix="%" />
        <Stat label="To discuss" value={stats.needsDiscussion} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Today</SectionTitle>
              <Link href="/workouts" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-ink">
                Workouts <ArrowRight size={14} />
              </Link>
            </div>
            {today.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                No team workout scheduled today.{" "}
                <button
                  onClick={() => setWorkoutOpen(true)}
                  className="font-medium text-ink underline underline-offset-4"
                >
                  Add one
                </button>
                .
              </p>
            ) : (
              <div className="space-y-3">
                {today.map((w) => {
                  const pct = w.total ? Math.round((w.completed / w.total) * 100) : 0;
                  const untouched = Math.max(0, w.total - w.completed - w.viewed);
                  return (
                    <div key={w.id} className="rounded-2xl border border-slate-200 bg-paper-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", workoutMeta(w.type).dot)} />
                            <h3 className="break-words font-semibold text-ink">{w.title}</h3>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <TypeBadge type={w.type} />
                            <span>{w.scope === "INDIVIDUAL" ? "Individual" : "Team"}</span>
                            <span>{w.viewed} viewed</span>
                            <span>{untouched > 0 ? `${untouched} not opened` : "all opened"}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-40">
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-ink">{pct}%</span>
                            <span className="text-slate-500">{w.completed}/{w.total}</span>
                          </div>
                          <AnimatedBar value={pct} barClassName="bg-emerald-500" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-4">
              <SectionTitle>Recent Feedback</SectionTitle>
            </div>
            {recentFeedback.length === 0 ? (
              <EmptyState
                title="No feedback yet"
                description="Athlete check-ins will appear here after workouts are logged."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentFeedback.map((f, i) => (
                  <li key={i} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/athletes/${f.athleteId}`} className="flex gap-3 rounded-md transition-colors hover:bg-slate-50">
                      <Avatar name={f.athleteName} seed={f.athleteId} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-medium text-ink">{f.athleteName}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{f.workoutTitle}</span>
                          {!f.completed && (
                            <span className="badge bg-amber-50 text-amber-700 ring-amber-600/20">
                              Skipped
                            </span>
                          )}
                        </div>
                        {f.feeling && (
                          <p className="mt-1 text-sm text-slate-600">&quot;{f.feeling}&quot;</p>
                        )}
                        {f.soreness &&
                          f.soreness.toLowerCase() !== "none" &&
                          f.soreness.toLowerCase() !== "none." &&
                          f.soreness.toLowerCase() !== "none to report." && (
                            <p className="mt-1 text-xs text-rose-600">
                              Soreness: {f.soreness}
                            </p>
                          )}
                      </div>
                      <div className="shrink-0 text-right">
                        {f.effort != null && (
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                            RPE {f.effort}
                          </span>
                        )}
                        <div className="mt-1 text-xs text-slate-400">
                          {fmtRelative(f.whenISO)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Roster Today</SectionTitle>
              <Link href="/athletes" className="text-sm font-medium text-slate-600 hover:text-ink">
                Manage
              </Link>
            </div>

            <div className="mb-3 inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-sm">
              {ROSTER_FILTERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setRosterFilter(t.key)}
                  className={cn(
                    "min-h-11 rounded-xl px-3.5 py-2 transition-colors",
                    rosterFilter === t.key
                      ? "bg-white text-ink shadow-card"
                      : "text-slate-500 hover:text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {shownRoster.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No athletes in this view.
              </p>
            ) : (
              <ul className="max-h-80 space-y-0.5 overflow-y-auto scroll-thin pr-1">
                {shownRoster.map((r) => {
                  const meta = statusMeta(r.status);
                  return (
                    <li key={r.id}>
                      <Link href={`/athletes/${r.id}`} className="flex min-h-12 items-center gap-2.5 rounded-xl px-1.5 py-2 transition-colors hover:bg-slate-50">
                        <Avatar name={r.name} seed={r.id} size={28} />
                        <span className="flex-1 truncate text-sm text-slate-700">
                          {r.name}
                        </span>
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} title={meta.label} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3">
              <SectionTitle>Upcoming</SectionTitle>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing scheduled ahead.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((u) => (
                  <li key={u.id} className="flex items-start gap-3">
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", workoutMeta(u.type).dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{u.title}</div>
                      <div className="text-xs text-slate-500">
                        {smartDayLabel(u.dateISO)}
                        {u.scope === "INDIVIDUAL"
                          ? ` / ${u.assignedCount} athlete${u.assignedCount === 1 ? "" : "s"}`
                          : " / Team"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <WorkoutFormModal
        open={workoutOpen}
        onClose={() => setWorkoutOpen(false)}
        athletes={athletes}
      />
      {importOpen && <WorkoutImportModal open onClose={() => setImportOpen(false)} nowISO={nowISO} />}
    </div>
  );
}
