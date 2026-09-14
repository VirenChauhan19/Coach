import { Dumbbell, ExternalLink, Gauge, MapPin, Ruler, StickyNote } from "lucide-react";
import type { WorkoutDTO } from "@/lib/dto";
import { workoutMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  const segments = [
    { label: "Warm-up", value: workout.warmup },
    { label: "Main set", value: workout.mainSet },
    { label: "Cool-down", value: workout.cooldown },
  ].filter((s) => s.value);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {(workout.distance || workout.pace) && (
        <div className="flex flex-wrap gap-2">
          {workout.distance && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-paper-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700">
              <Ruler size={14} className="text-slate-400" />
              {workout.distance}
            </span>
          )}
          {workout.pace && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-paper-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700">
              <Gauge size={14} className="text-slate-400" />
              {workout.pace}
            </span>
          )}
        </div>
      )}

      {customNote && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <StickyNote size={13} />
            Note just for you
          </div>
          <p className="mt-1 text-sm leading-relaxed text-brand-900">{customNote}</p>
        </div>
      )}

      {segments.length > 0 && (
        <div className="space-y-2.5">
          {segments.map((s) => (
            <div
              key={s.label}
              className="grid grid-cols-[4px_1fr] gap-3 rounded-lg border border-paper-200 bg-white p-3"
            >
              <div className={cn("rounded-full", meta.bar)} />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {s.label}
                </div>
                <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {workout.notes && (
        <div className="rounded-lg border border-paper-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coach notes
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {workout.notes}
          </p>
        </div>
      )}

      {liftsToday && (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-paper-100 px-2.5 py-1.5 text-sm text-slate-600">
          <Dumbbell size={15} className="text-slate-400" />
          Your lift <span className="font-semibold text-ink">{liftTime}</span>
        </div>
      )}

      {(workout.location || workout.link) && (
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
          {workout.location && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-paper-100 px-2.5 py-1.5 text-slate-600">
              <MapPin size={15} className="text-slate-400" />
              {workout.location}
            </span>
          )}
          {workout.link && (
            <a
              href={workout.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 font-medium text-brand-700 transition hover:bg-brand-100"
            >
              <ExternalLink size={15} />
              Attachment / link
            </a>
          )}
        </div>
      )}
    </div>
  );
}
