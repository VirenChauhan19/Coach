"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Pencil,
  UserMinus,
  Loader2,
  ArrowRight,
  ChevronRight,
  LayoutGrid,
  Rows3,
  MessageCircleQuestion,
} from "lucide-react";
import { AthleteFormModal, type AthleteEditable } from "./athlete-form-modal";
import { Modal } from "./ui/modal";
import { Avatar } from "./ui/avatar";
import { GroupBadge } from "./paces-card";
import { EmptyState } from "./ui/empty";
import { cn, eventsList } from "@/lib/utils";
import { useDates } from "./time-zone";

export type RosterAthlete = AthleteEditable & {
  mileageGroup: string | null;
  lrTarget: string | null;
  weekCompleted: number;
  weekTotal: number;
  lastFeedbackISO: string | null;
  needsDiscussion: number;
};

type SortKey = "name" | "group" | "week" | "checkin";

export function AthletesManager({ athletes }: { athletes: RosterAthlete[] }) {
  const { fmtRelative } = useDates();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<RosterAthlete | null>(null);
  const [removing, setRemoving] = useState<RosterAthlete | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });

  const pctOf = (a: RosterAthlete) =>
    a.weekTotal ? a.weekCompleted / a.weekTotal : -1;

  const sorted = useMemo(() => {
    const arr = [...athletes];
    arr.sort((a, b) => {
      let v = 0;
      if (sort.key === "name") v = a.name.localeCompare(b.name);
      else if (sort.key === "group")
        v = (a.mileageGroup ?? "Z").localeCompare(b.mileageGroup ?? "Z");
      else if (sort.key === "week") v = pctOf(a) - pctOf(b);
      else if (sort.key === "checkin")
        v = (a.lastFeedbackISO ?? "").localeCompare(b.lastFeedbackISO ?? "");
      return v * sort.dir;
    });
    return arr;
  }, [athletes, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 }
        : { key, dir: 1 }
    );
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await fetch(`/api/athletes/${removing.id}`, { method: "DELETE" });
      setRemoving(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-3 py-2.5">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors hover:text-ink",
          sort.key === k ? "text-ink" : "text-slate-400"
        )}
      >
        {label}
        <span className="text-[10px]">
          {sort.key === k ? (sort.dir === 1 ? "A-Z" : "Z-A") : ""}
        </span>
      </button>
    </th>
  );

  // Desktop-only data table.
  const tableView = (
    <div className="card hidden overflow-hidden sm:block">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs">
              <SortHead k="name" label="Athlete" />
              <SortHead k="group" label="Group" />
              <th className="px-3 py-2.5 font-medium text-slate-400">
                Events
              </th>
              <SortHead k="week" label="This week" />
              <SortHead k="checkin" label="Last check-in" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((a) => {
              const pct = a.weekTotal
                ? Math.round((a.weekCompleted / a.weekTotal) * 100)
                : 0;
              const evs = eventsList(a.events);
              return (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/athletes/${a.id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.name} seed={a.id} size={32} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">
                          {a.name}
                        </div>
                        {a.gradYear && (
                          <div className="text-[11px] text-slate-400">
                            Class of {a.gradYear}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {a.mileageGroup ? (
                      <GroupBadge group={a.mileageGroup} />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {evs.slice(0, 2).map((ev) => (
                        <span
                          key={ev}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {ev}
                        </span>
                      ))}
                      {evs.length > 2 && (
                        <span className="text-[11px] text-slate-400">
                          +{evs.length - 2}
                        </span>
                      )}
                      {evs.length === 0 && (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {a.weekCompleted}/{a.weekTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {a.needsDiscussion > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                        <MessageCircleQuestion size={13} />
                        {a.needsDiscussion} to discuss
                      </span>
                    ) : a.lastFeedbackISO ? (
                      <span className="text-xs text-slate-500">
                        {fmtRelative(a.lastFeedbackISO)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No feedback yet</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(a);
                        }}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoving(a);
                        }}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="Remove"
                      >
                        <UserMinus size={15} />
                      </button>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Cards: the default on phones, optional on desktop.
  const cardsView = (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
        view === "table" && "sm:hidden"
      )}
    >
      {sorted.map((a) => {
        const pct = a.weekTotal
          ? Math.round((a.weekCompleted / a.weekTotal) * 100)
          : 0;
        return (
          <div key={a.id} className="card flex flex-col p-4">
            <div className="flex items-start gap-3">
              <Avatar name={a.name} seed={a.id} size={44} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/athletes/${a.id}`}
                  className="truncate font-semibold text-ink hover:underline"
                >
                  {a.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {a.mileageGroup ? (
                    <GroupBadge group={a.mileageGroup} />
                  ) : (
                    <span className="text-xs text-slate-500">
                      {a.gradYear ? `Class of ${a.gradYear}` : "Athlete"}
                    </span>
                  )}
                  {a.lrTarget && (
                    <span className="text-xs text-slate-400">{a.lrTarget} mi</span>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => setEditing(a)}
                  className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setRemoving(a)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Remove"
                >
                  <UserMinus size={15} />
                </button>
              </div>
            </div>

            {eventsList(a.events).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {eventsList(a.events).map((ev) => (
                  <span
                    key={ev}
                    className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>This week</span>
                <span>
                  {a.weekCompleted}/{a.weekTotal}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {a.needsDiscussion > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                    <MessageCircleQuestion size={13} />
                    {a.needsDiscussion} to discuss
                  </span>
                ) : a.lastFeedbackISO ? (
                  <span>Last check-in {fmtRelative(a.lastFeedbackISO)}</span>
                ) : (
                  <span>No feedback yet</span>
                )}
              </div>
              <Link
                href={`/athletes/${a.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                View <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {athletes.length} athlete{athletes.length === 1 ? "" : "s"} on the roster
        </p>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 sm:inline-flex">
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                view === "table"
                  ? "bg-white text-ink shadow-card"
                  : "text-slate-500 hover:text-ink"
              )}
            >
              <Rows3 size={14} /> Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                view === "cards"
                  ? "bg-white text-ink shadow-card"
                  : "text-slate-500 hover:text-ink"
              )}
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <UserPlus size={16} /> Add athlete
          </button>
        </div>
      </div>

      {athletes.length === 0 ? (
        <EmptyState
          title="No athletes yet"
          description="Add your runners to start assigning workouts and tracking feedback."
          action={
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              <UserPlus size={16} /> Add athlete
            </button>
          }
        />
      ) : (
        <>
          {tableView}
          {cardsView}
        </>
      )}

      <AthleteFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      {editing && (
        <AthleteFormModal open onClose={() => setEditing(null)} initial={editing} />
      )}
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove athlete?"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRemoving(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmRemove}
              disabled={busy}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{removing?.name}</span> will be removed from
          the active roster. Their training history is kept and they can be re-added
          later.
        </p>
      </Modal>
    </div>
  );
}
