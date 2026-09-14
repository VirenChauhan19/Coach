import { ExternalLink } from "lucide-react";
import type { WorkoutDTO } from "@/lib/dto";
import { workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The body of a session.
 *
 * Everything here used to sit in its own bordered, white, rounded box, stacked
 * inside whatever card was already holding it. Boxes inside boxes flatten the
 * hierarchy instead of creating it: nothing reads as more important than
 * anything else. So the structure is carried by type weight, a hairline rule,
 * and one accent stripe on the prescription itself, which is the part an
 * athlete is actually looking for.
 */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </div>
  );
}

export function WorkoutDetail({
  workout,
  customNote,
  liftTime,
  compact = false,
}: {
  workout: WorkoutDTO;
  customNote?: string | null;
  /** The viewer's own lift slot; shown only on days the plan actually lifts. */
  liftTime?: string | null;
  compact?: boolean;
}) {
  // The coach schedules one lift window for the squad and splits it by name
  // over e-mail, so the day says "DAY 1 LIFT" and the slot lives on the athlete.
  const liftsToday = Boolean(liftTime) && /\bLIFT\b/i.test(workout.notes ?? "");
  const meta = workoutMeta(workout.type);

  // Duration, effort and where to be are facts, not features. One line.
  const facts = [workout.distance, workout.pace, workout.location].filter(Boolean);

  const segments = [
    { label: "Warm-up", value: workout.warmup },
    { label: "Main set", value: workout.mainSet },
    { label: "Cool-down", value: workout.cooldown },
  ].filter((s) => s.value);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {facts.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          {facts.map((f, i) => (
            <span key={f} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-slate-300">·</span>}
              <span className={i === 0 ? "font-semibold text-ink" : undefined}>{f}</span>
            </span>
          ))}
        </p>
      )}

      {segments.length > 0 && (
        <div className="space-y-3">
          {segments.map((s) => (
            <div key={s.label} className="flex gap-3">
              <span aria-hidden className={cn("mt-0.5 w-0.5 shrink-0 rounded-full", meta.bar)} />
              <div className="min-w-0">
                <Label>{s.label}</Label>
                <div className="mt-1 whitespace-pre-line text-[15px] font-medium leading-relaxed text-ink">
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {customNote && (
        <div className="flex gap-3">
          <span aria-hidden className="mt-0.5 w-0.5 shrink-0 rounded-full bg-brand-400" />
          <div className="min-w-0">
            <Label>Just for you</Label>
            <p className="mt-1 text-sm leading-relaxed text-ink">{customNote}</p>
          </div>
        </div>
      )}

      {(workout.notes || liftsToday) && (
        <div className="border-t border-ink/[0.07] pt-3">
          {workout.notes && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {workout.notes}
            </p>
          )}
          {liftsToday && (
            <p className={cn("text-sm text-slate-600", workout.notes && "mt-1.5")}>
              Your lift <span className="font-semibold text-ink">{liftTime}</span>
            </p>
          )}
        </div>
      )}

      {workout.link && (
        <a
          href={workout.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          <ExternalLink size={14} />
          Attachment
        </a>
      )}
    </div>
  );
}
