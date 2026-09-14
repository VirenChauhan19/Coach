// One total order for workouts, shared by every query and every client-side sort.
//
// A workout's date is a calendar day, so all the sessions on a given day carry
// the identical timestamp, 99 of the 168 days on the current schedule hold two
// or three. `ORDER BY date` alone therefore leaves their relative order
// completely up to the database, which is free to return them differently
// between queries: a changed query plan, a parallel scan, or simply rows having
// been rewritten by an UPDATE can all reshuffle them. On screen that reads as
// sessions swapping places for no reason.
//
// These keys give every list one deterministic order. `id` last means the order
// is fully specified no matter what, it can never fall back to physical row
// order.

import type { Prisma } from "@prisma/client";

/** Whole-team session first, then alphabetical. "TEAM" > "INDIVIDUAL", so desc. */
const TIEBREAK = [
  { scope: "desc" },
  { title: "asc" },
  { id: "asc" },
] satisfies Prisma.WorkoutOrderByWithRelationInput[];

/** Chronological: the schedule reading forwards. */
export const WORKOUT_ORDER: Prisma.WorkoutOrderByWithRelationInput[] = [
  { date: "asc" },
  ...TIEBREAK,
];

/** Reverse-chronological: "most recent first" history lists. */
export const WORKOUT_ORDER_DESC: Prisma.WorkoutOrderByWithRelationInput[] = [
  { date: "desc" },
  ...TIEBREAK,
];

/** The same order, for assignment queries that sort by their workout. */
export const ASSIGNMENT_BY_WORKOUT: Prisma.AssignmentOrderByWithRelationInput[] = [
  { workout: { date: "asc" } },
  { workout: { scope: "desc" } },
  { workout: { title: "asc" } },
  { workoutId: "asc" },
];

export const ASSIGNMENT_BY_WORKOUT_DESC: Prisma.AssignmentOrderByWithRelationInput[] =
  [
    { workout: { date: "desc" } },
    { workout: { scope: "desc" } },
    { workout: { title: "asc" } },
    { workoutId: "asc" },
  ];

/**
 * Newest message first. `id` breaks ties: two messages can land in the same
 * millisecond, and a tied pair either side of a `take` cutoff would otherwise
 * swap between loads.
 */
export const MESSAGE_NEWEST_FIRST: Prisma.MessageOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "desc" },
];

/** The shape any client-side list needs to sort itself the same way. */
type Sortable = {
  id: string;
  dateISO: string;
  title: string;
  scope: string;
};

/** Client-side mirror of WORKOUT_ORDER, so re-sorting can't undo the query's order. */
export function compareWorkouts(a: Sortable, b: Sortable): number {
  return (
    a.dateISO.localeCompare(b.dateISO) ||
    b.scope.localeCompare(a.scope) || // TEAM before INDIVIDUAL
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

/** Same order, newest day first, the day flips, the within-day order does not. */
export function compareWorkoutsDesc(a: Sortable, b: Sortable): number {
  return (
    b.dateISO.localeCompare(a.dateISO) ||
    b.scope.localeCompare(a.scope) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}
