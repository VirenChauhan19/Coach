import { IconStopwatch } from "./ui/icons";
import { cn, type Paces } from "@/lib/utils";

export function GroupBadge({ group, className }: { group: string | null; className?: string }) {
  if (!group) return null;
  const tone: Record<string, string> = {
    A: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    B: "bg-sky-50 text-sky-700 ring-sky-600/20",
    C: "bg-teal-50 text-teal-700 ring-teal-600/20",
  };
  return (
    <span className={cn("badge", tone[group] ?? "bg-slate-100 text-slate-600 ring-slate-500/20", className)}>
      Group {group}
    </span>
  );
}

export function PacesCard({
  group,
  lrTarget,
  ezTarget,
  paces,
  className,
}: {
  group: string | null;
  lrTarget: string | null;
  ezTarget: string | null;
  paces: Paces | null;
  className?: string;
}) {
  if (!paces) return null;
  const rows: [string, string | undefined][] = [
    ["Easy", paces.ez],
    ["Tempo (ST)", paces.tempo],
    ["Tempo (MT)", paces.tempoMed],
    ["10K", paces.k10],
    ["8K", paces.k8],
    ["6K", paces.k6],
    ["5K", paces.k5],
    ["3K", paces.k3],
    ["Mile", paces.mile],
  ];
  const visible = rows.filter(([, v]) => v);

  return (
    <section className={cn("card p-5", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <IconStopwatch size={16} strokeWidth={2} className="text-brand-600" /> Pace targets
        </div>
        <GroupBadge group={group} />
      </div>

      {(lrTarget || ezTarget) && (
        <div className="mb-3 flex gap-2 text-xs">
          {lrTarget && (
            <span className="rounded-md bg-paper-100 px-2 py-1 text-slate-600">
              Long run <span className="font-semibold text-ink">{lrTarget} min</span>
            </span>
          )}
          {ezTarget && (
            <span className="rounded-md bg-paper-100 px-2 py-1 text-slate-600">
              Easy <span className="font-semibold text-ink">{ezTarget} min</span>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {visible.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-paper-200 py-1 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="font-mono text-sm font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>

      {(paces.doubleFreq || paces.xtFreq || paces.liftTime) && (
        <div className="mt-3 flex gap-3 border-t border-paper-200 pt-3 text-xs text-slate-500">
          {paces.doubleFreq && <span>Doubles: <span className="font-medium text-slate-700">{paces.doubleFreq}</span></span>}
          {paces.liftTime && (
            <span>
              Lift: <span className="font-medium text-slate-700">{paces.liftTime}</span>
            </span>
          )}
          {paces.xtFreq && (
            <span>
              Cross-train: <span className="font-medium text-slate-700">{paces.xtFreq}</span>
              {paces.xtTarget && <span className="text-slate-400"> · {paces.xtTarget} min</span>}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
