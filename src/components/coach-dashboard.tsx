"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
} from "lucide-react";
import { WorkoutFormModal } from "./workout-form-modal";
import { AnnouncementModal } from "./announcement-modal";
import { Avatar } from "./ui/avatar";
import { TypeBadge } from "./ui/badges";
import { EmptyState } from "./ui/empty";
import { CountUp, AnimatedBar } from "./ui/stat";
import { statusMeta, workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";

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

// Small gold-ticked section heading used across the dashboard.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
      <span className="h-3.5 w-1 rounded-full bg-brand-500" />
      {children}
    </h2>
  );
}

// Editorial "scoreboard" stat: big condensed number, no pastel icon chip.
function Stat({
  index,
  label,
  value,
  suffix,
}: {
  index: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="card group p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-paper-200 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className="font-mono text-[10px] text-slate-400">{index}</span>
      </div>
      <div className="mt-2.5 font-display text-4xl font-bold leading-none text-ink sm:text-[2.75rem]">
        <CountUp value={value} suffix={suffix} />
      </div>
      <span className="mt-3 block h-0.5 w-10 bg-brand-500 transition-all duration-300 ease-out group-hover:w-16" />
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
    unreadMessages: number;
  };
  today: TodayWorkout[];
  roster: RosterRow[];
  recentFeedback: FeedbackRow[];
  upcoming: UpcomingRow[];
}) {
  const { fmtFullDate, fmtRelative, smartDayLabel } = useDates();
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");

  const shownRoster = roster.filter((r) => matchesFilter(r.status, rosterFilter));

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
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-300">
              <span className="h-3 w-1 rounded-full bg-brand-400" />
              {coachFirstName ? `Coach ${coachFirstName}` : "Coach workspace"}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl xl:text-6xl">
              {teamName}
            </h1>
            <p className="mt-2.5 text-sm text-slate-300">
              {fmtFullDate(nowISO)}
              {season ? ` · ${season}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white"
              onClick={() => setAnnounceOpen(true)}
            >
              Announce
            </button>
            <button className="btn-gold" onClick={() => setWorkoutOpen(true)}>
              <Plus size={16} /> New workout
            </button>
          </div>
        </div>
        {/* gold baseline rule */}
        <div className="relative h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-transparent" />
      </div>

      {/* scoreboard */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-4 stagger">
        <Stat
          index="01"
          label="Active athletes"
          value={stats.athleteCount}
        />
        <Stat
          index="02"
          label="Week completion"
          value={stats.weekCompletionPct}
          suffix="%"
        />
        <Stat
          index="03"
          label="Need to discuss"
          value={stats.needsDiscussion}
        />
        <Stat
          index="04"
          label="Unread messages"
          value={stats.unreadMessages}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* main */}
        <div className="space-y-6 lg:col-span-2 stagger">
          {/* Today */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Today on the team</SectionTitle>
              <Link
                href="/workouts"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                All workouts <ArrowRight size={13} />
              </Link>
            </div>
            {today.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                No team workout scheduled today.{" "}
                <button
                  onClick={() => setWorkoutOpen(true)}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Add one
                </button>
                .
              </p>
            ) : (
              <div className="space-y-4">
                {today.map((w) => {
                  const pct = w.total
                    ? Math.round((w.completed / w.total) * 100)
                    : 0;
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl border border-paper-200 p-4 transition hover:border-brand-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-8 w-1.5 rounded-full",
                              workoutMeta(w.type).bar
                            )}
                          />
                          <div>
                            <div className="font-semibold text-ink">{w.title}</div>
                            <div className="mt-0.5">
                              <TypeBadge type={w.type} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl font-bold leading-none text-ink">
                            <CountUp value={w.completed} />/{w.total}
                          </div>
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                            completed
                          </div>
                        </div>
                      </div>
                      <AnimatedBar value={pct} className="mt-3" />
                      <div className="mt-2 flex gap-4 text-xs text-slate-500">
                        <span>{w.viewed} viewed</span>
                        <span>
                          {w.total - w.completed - w.viewed > 0
                            ? `${w.total - w.completed - w.viewed} not opened`
                            : "all opened"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent feedback */}
          <section className="card p-5">
            <div className="mb-4">
              <SectionTitle>Recent athlete feedback</SectionTitle>
            </div>
            {recentFeedback.length === 0 ? (
              <EmptyState
                title="No feedback yet"
                description="Athlete check-ins will appear here after they log workouts."
              />
            ) : (
              <ul className="divide-y divide-paper-100">
                {recentFeedback.map((f, i) => (
                  <li key={i} className="first:pt-0 last:pb-0">
                    <Link
                      href={`/athletes/${f.athleteId}`}
                      className="-mx-2 flex gap-3 rounded-lg px-2 py-3 transition hover:bg-paper-50"
                    >
                      <Avatar name={f.athleteName} seed={f.athleteId} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-sm">
                          <span className="font-semibold text-ink">
                            {f.athleteName}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{f.workoutTitle}</span>
                          {!f.completed && (
                            <span className="badge bg-amber-50 text-amber-700 ring-amber-600/20">
                              Skipped
                            </span>
                          )}
                        </div>
                        {f.feeling && (
                          <p className="mt-0.5 text-sm text-slate-600">
                            “{f.feeling}”
                          </p>
                        )}
                        {f.soreness &&
                          f.soreness.toLowerCase() !== "none" &&
                          f.soreness.toLowerCase() !== "none." &&
                          f.soreness.toLowerCase() !== "none to report." && (
                            <p className="mt-0.5 text-xs text-rose-600">
                              Soreness: {f.soreness}
                            </p>
                          )}
                      </div>
                      <div className="shrink-0 text-right">
                        {f.effort != null && (
                          <span className="inline-block rounded-md bg-paper-100 px-1.5 py-0.5 font-display text-xs font-semibold text-slate-700">
                            RPE {f.effort}
                          </span>
                        )}
                        <div className="mt-1 text-[11px] text-slate-400">
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

        {/* sidebar */}
        <div className="space-y-6 stagger">
          {/* Roster today */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Roster · today</SectionTitle>
              <Link
                href="/athletes"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Manage
              </Link>
            </div>

            {/* interactive filter */}
            <div className="mb-3 inline-flex rounded-lg border border-paper-200 bg-paper-50 p-0.5 text-xs font-semibold">
              {ROSTER_FILTERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setRosterFilter(t.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition",
                    rosterFilter === t.key
                      ? "bg-ink text-white shadow-sm"
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
                      <Link
                        href={`/athletes/${r.id}`}
                        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-paper-50"
                      >
                        <Avatar name={r.name} seed={r.id} size={28} />
                        <span className="flex-1 truncate text-sm text-slate-700">
                          {r.name}
                        </span>
                        <span
                          className={cn("h-2 w-2 rounded-full", meta.dot)}
                          title={meta.label}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Upcoming */}
          <section className="card p-5">
            <div className="mb-3">
              <SectionTitle>Upcoming</SectionTitle>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing scheduled ahead.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-9 w-1.5 shrink-0 rounded-full",
                        workoutMeta(u.type).bar
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {u.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {smartDayLabel(u.dateISO)}
                        {u.scope === "INDIVIDUAL"
                          ? ` · ${u.assignedCount} athlete${u.assignedCount === 1 ? "" : "s"}`
                          : " · Team"}
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
      <AnnouncementModal open={announceOpen} onClose={() => setAnnounceOpen(false)} />
    </div>
  );
}
