// How much history each screen pulls out of the database.
//
// These lists were all unbounded: "every message ever", "every workout ever".
// Nothing capped them, so the payload a phone downloads, parses, and hydrates
// grew forever, and the slowest screens were already the largest ones.
//
// Workouts is a day-to-day planning screen, so it keeps the upcoming schedule
// plus recent history. Full-season browsing belongs in Calendar, which renders
// a much lighter event shape.

/** Messages kept per channel in the initial page payload (newest kept). */
export const MESSAGE_HISTORY = 80;

/** How far back the Workouts screen's "Earlier" section reaches. */
export const WORKOUTS_PAST_DAYS = 14;

/** How far ahead the Workouts screen loads before sending users to Calendar. */
export const WORKOUTS_FUTURE_DAYS = 45;
