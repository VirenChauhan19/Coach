// Athletes sign in with a username, not an email address. The team's addresses
// are placeholders the coach made up (tino@scadxc.com), so putting one on the
// sign-in screen asks people to type something that was never really theirs.
//
// The email column stays as the account's contact field and stays unique; it is
// simply derived from the username when nobody supplies a real one.

export const TEAM_EMAIL_DOMAIN = "scadxc.com";

/** 3-30 characters, lower case, starts and ends alphanumeric. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;

/**
 * What someone typed, as a username.
 *
 * Anything after an "@" is dropped, so an athlete who still remembers the old
 * address (or whose phone helpfully autofills it) signs in with it anyway.
 */
export function normalizeUsername(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/[^a-z0-9._-]/g, "");
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

/** The username an existing account gets: the local part of its address. */
export function usernameFromEmail(email: string): string {
  return normalizeUsername(email);
}

/** A first guess at a username for a new athlete, from their name. */
export function usernameFromName(name: string): string {
  return normalizeUsername(name.replace(/\s+/g, ""));
}

/** The placeholder address an account gets when the coach gives only a username. */
export function emailForUsername(username: string): string {
  return `${username}@${TEAM_EMAIL_DOMAIN}`;
}
