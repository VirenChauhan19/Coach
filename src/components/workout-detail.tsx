import { ExternalLink, MapPin, Route, Gauge } from "lucide-react";
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
    <div className="text-xs font-medium text-slate-500">
      {children}
    </div>
  );
}

/**
 * The day's note, with the team meeting picked out of it.
 *
 * prNote() joins the spreadsheet's prehab/fuel column and the meeting row into
 * one line ("FUEL + DAY 1 LIFT ... - Team meeting, Men: 8PM"). A meeting is a
 * time and a place to be, the same kind of fact as the lift slot below it, so
 * it gets the same weight instead of trailing off the end of a sentence.
 */
function Notes({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
      {parts.map((part, i) => {
        const meeting = part.match(/^Team meeting,\s*(.+)$/i);
        return (
          <span key={i}>
            {i > 0 && " · "}
            {meeting ? (
              <>
                Team meeting <span className="font-semibold text-ink">{meeting[1]}</span>
              </>
            ) : (
              part
            )}
          </span>
        );
      })}
    </p>
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

  // Two of these are things you have to act on — how far, and where to be when.
  // Pace is a target you read once you are out there, so it stays quiet.
  const facts = [
    { value: workout.distance, Icon: Route, strong: true },
    { value: workout.pace, Icon: Gauge, strong: false },
    { value: workout.location, Icon: MapPin, strong: true },
  ].filter((fact) => fact.value);

  const segments = [
    { label: "Warm-up", value: workout.warmup },
    { label: "Main set", value: workout.mainSet },
    { label: "Cool-down", value: workout.cooldown },
  ].filter((s) => s.value);

  return (
    <div className={cn("min-w-0 space-y-4 break-words", compact && "space-y-3")}>
      {facts.length > 0 && (
        <div className="flex flex-col gap-2.5 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {facts.map(({ value, Icon, strong }, i) => (
            <span key={i} className="flex min-w-0 items-start gap-2.5">
              <Icon aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <span className={cn("min-w-0", strong && "font-semibold text-ink")}>{value}</span>
            </span>
          ))}
        </div>
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
          {workout.notes && <Notes text={workout.notes} />}
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
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          <ExternalLink size={14} />
          Attachment
        </a>
      )}
    </div>
  );
}
