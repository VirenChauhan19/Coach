// Dates are always rendered in the *viewer's* timezone, detected when they log
// in and carried in their session (see lib/auth.ts). An athlete home in
// California over break sees their schedule on California days; the coach in
// Savannah sees Savannah days.
//
// The one thing that must NOT depend on anyone's timezone is the machine doing
// the rendering. Left to the ambient clock, production (Cloud Run, UTC) rolls
// over to "tomorrow" at 8 PM Eastern — so the dashboard would show tomorrow's
// session every evening and the training week would flip on Sunday night.
//
// So nothing here reads the ambient zone. `dateHelpers(zone)` returns the whole
// toolkit bound to one explicit zone: server components get it from the
// session, client components from the TimeZoneProvider. Both sides therefore
// render identically, which is also what keeps hydration stable.

import { tz } from "@date-fns/tz";
import {
  format as dfFormat,
  formatDistanceToNowStrict,
  startOfDay as dfStartOfDay,
  endOfDay as dfEndOfDay,
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  startOfMonth as dfStartOfMonth,
  endOfMonth as dfEndOfMonth,
  addDays as dfAddDays,
  subDays as dfSubDays,
} from "date-fns";

/**
 * Fallback zone, used only until we know where the viewer actually is (the
 * very first render of a brand-new session). The team's home zone is the least
 * surprising guess. Override with NEXT_PUBLIC_TEAM_TIME_ZONE.
 */
export const TEAM_TIME_ZONE =
  process.env.NEXT_PUBLIC_TEAM_TIME_ZONE?.trim() || "America/New_York";

/** Is this a real IANA zone name this runtime understands? */
export function isValidTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Falls back to the team zone rather than throwing on junk input. */
export function safeTimeZone(zone: unknown): string {
  return isValidTimeZone(zone) ? zone : TEAM_TIME_ZONE;
}

/* ------------------------------------------------------------ storage anchor */

/**
 * The instant stored for a workout on calendar day `key` ("yyyy-MM-dd").
 *
 * Anchored at **12:00 UTC**, which is deliberate and timezone-independent:
 * the stored value is a pure function of the day the coach picked, so it can't
 * drift with where the coach happened to be. Noon UTC also maximizes agreement
 * when it's read back — every zone from UTC-11 to UTC+11 resolves it to the
 * same calendar day, which is everywhere this team could plausibly be.
 */
export function workoutInstantForDay(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

/* ----------------------------------------------------------- the zone toolkit */

type DInput = Date | string | number;

function build(zone: string) {
  const IN = { in: tz(zone) };
  const D = (d: DInput): Date => (d instanceof Date ? d : new Date(d));
  // date-fns hands back a TZDate; drop to a plain Date holding the same instant
  // so nothing zone-flavored leaks into Prisma queries, DTOs, or sorting.
  const plain = (d: Date): Date => new Date(d.getTime());

  const format = (d: DInput, fmt: string): string => dfFormat(D(d), fmt, IN);
  const dayKey = (d: DInput): string => format(d, "yyyy-MM-dd");
  const monthKey = (d: DInput): string => format(d, "yyyy-MM");

  const addDays = (d: DInput, n: number): Date => plain(dfAddDays(D(d), n, IN));
  const subDays = (d: DInput, n: number): Date => plain(dfSubDays(D(d), n, IN));

  const isToday = (d: DInput) => dayKey(d) === dayKey(new Date());
  const isTomorrow = (d: DInput) => dayKey(d) === dayKey(addDays(new Date(), 1));
  const isYesterday = (d: DInput) => dayKey(d) === dayKey(subDays(new Date(), 1));

  const fmtTime = (d: DInput) => format(d, "h:mm a");
  const fmtDate = (d: DInput) => format(d, "EEE, MMM d");

  return {
    zone,

    /* formatting */
    format,
    fmtDate,
    fmtFullDate: (d: DInput) => format(d, "EEEE, MMMM d, yyyy"),
    fmtDayMonth: (d: DInput) => format(d, "MMM d"),
    fmtTime,
    fmtWeekday: (d: DInput) => format(d, "EEEE"),
    dayKey,
    hourOfDay: (d: DInput) => Number(format(d, "H")),
    isWeekend: (d: DInput) => {
      const i = format(d, "i"); // ISO weekday, 1 = Monday
      return i === "6" || i === "7";
    },

    /* comparisons — two instants share a day exactly when they render as one */
    isSameDay: (a: DInput, b: DInput) => dayKey(a) === dayKey(b),
    isSameMonth: (a: DInput, b: DInput) => monthKey(a) === monthKey(b),
    isToday,
    isTomorrow,
    isYesterday,

    /* boundaries */
    startOfDay: (d: DInput) => plain(dfStartOfDay(D(d), IN)),
    endOfDay: (d: DInput) => plain(dfEndOfDay(D(d), IN)),
    startOfMonth: (d: DInput) => plain(dfStartOfMonth(D(d), IN)),
    endOfMonth: (d: DInput) => plain(dfEndOfMonth(D(d), IN)),
    addDays,
    subDays,
    // Monday-based week for a college training schedule.
    weekStart: (d: DInput) => plain(dfStartOfWeek(D(d), { ...IN, weekStartsOn: 1 })),
    weekEnd: (d: DInput) => plain(dfEndOfWeek(D(d), { ...IN, weekStartsOn: 1 })),

    /* the calendar's day-cell keys, back to an instant */
    dayKeyToDate: (key: string) => workoutInstantForDay(key),

    /**
     * Normalize whatever the workout form sends into the stored anchor: a
     * "yyyy-MM-dd" from the date picker, or a full ISO instant from the
     * calendar's quick-add (resolved against this zone). Null if not a date.
     */
    parseWorkoutDate: (input: unknown): Date | null => {
      const s = String(input ?? "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return workoutInstantForDay(s);
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      return workoutInstantForDay(dayKey(d));
    },

    /* labelling */
    fmtRelative: (d: DInput): string => {
      const date = D(d);
      if (isToday(date)) return fmtTime(date);
      if (isYesterday(date)) return "Yesterday";
      return formatDistanceToNowStrict(date, { addSuffix: true });
    },
    smartDayLabel: (d: DInput): string => {
      const date = D(d);
      if (isToday(date)) return "Today";
      if (isTomorrow(date)) return "Tomorrow";
      if (isYesterday(date)) return "Yesterday";
      return fmtDate(date);
    },
  };
}

export type DateHelpers = ReturnType<typeof build>;

// Building the toolkit is cheap but it happens on every render; a handful of
// zones are ever in play, so cache them.
const cache = new Map<string, DateHelpers>();

/** The full date toolkit, bound to one explicit timezone. */
export function dateHelpers(zone: unknown): DateHelpers {
  const key = safeTimeZone(zone);
  let helpers = cache.get(key);
  if (!helpers) {
    helpers = build(key);
    cache.set(key, helpers);
  }
  return helpers;
}
