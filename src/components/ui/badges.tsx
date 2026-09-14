import { cn } from "@/lib/utils";
import { workoutMeta, statusMeta } from "@/lib/constants";

/**
 * Type and status used to be pastel pills: a coloured background, a ring, and a
 * dot, two or three of them stacked on every session. A row of identical pastel
 * chips is decoration pretending to be information. What an athlete needs is to
 * tell an easy day from a workout at a glance, and a single coloured dot does
 * that in less space and with less noise.
 *
 * The pill class is still there for the rare label that genuinely is a tag
 * (a group letter, "For you").
 */
function Marker({
  dot,
  label,
  className,
  withDot = true,
}: {
  dot: string;
  label: string;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500",
        className
      )}
    >
      {withDot && <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />}
      {label}
    </span>
  );
}

export function TypeBadge({
  type,
  className,
  withDot = true,
}: {
  type: string;
  className?: string;
  withDot?: boolean;
}) {
  const m = workoutMeta(type);
  return <Marker dot={m.dot} label={m.label} withDot={withDot} className={className} />;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = statusMeta(status);
  return <Marker dot={m.dot} label={m.label} className={className} />;
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", className)} />;
}
