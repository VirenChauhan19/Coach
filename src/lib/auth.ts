import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { isValidTimeZone, safeTimeZone } from "./date";

// MUST be "__session": when the app is served through Firebase Hosting (the
// scadxctf.web.app proxy → App Hosting backend), Hosting strips every cookie
// except one named exactly `__session` before forwarding to the server. Any
// other name means the session never reaches the backend and auth silently fails.
const COOKIE_NAME = "__session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Known weak/placeholder values that must never be used to sign real sessions.
const PLACEHOLDER_SECRETS = new Set([
  "change-me-to-a-long-random-string",
  "scad-running-coach-dev-secret-change-me",
  "dev-only-insecure-secret-change-me",
]);

let cachedSecret: Uint8Array | null = null;

/**
 * Resolves the JWT signing secret lazily (so a missing secret fails at runtime,
 * not at build time). In production a strong, explicitly-set secret is REQUIRED;
 * there is no hardcoded fallback, so a leaked repo can't be used to forge sessions.
 */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!fromEnv || fromEnv.length < 32 || PLACEHOLDER_SECRETS.has(fromEnv)) {
      throw new Error(
        "JWT_SECRET is missing, too short, or a known placeholder. Set a random " +
          "secret of at least 32 characters (e.g. `openssl rand -base64 48`) before " +
          "starting in production."
      );
    }
    cachedSecret = new TextEncoder().encode(fromEnv);
  } else {
    // Development convenience only; never reached in production.
    cachedSecret = new TextEncoder().encode(
      fromEnv || "dev-only-insecure-secret-change-me"
    );
  }
  return cachedSecret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: string | null = null;

/**
 * Runs a throwaway bcrypt comparison so that a login attempt for a non-existent
 * account takes about as long as one for a real account, closing the timing
 * side-channel that would otherwise let an attacker enumerate valid emails.
 */
export async function equalizePasswordTiming(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await bcrypt.hash("not-a-real-password", 12);
  await bcrypt.compare(password, dummyHash);
}

async function createToken(
  userId: string,
  sessionVersion: number,
  timeZone?: string
): Promise<string> {
  // The viewer's timezone rides inside the session rather than in a cookie of
  // its own: Firebase Hosting drops every cookie except __session, so a
  // separate one would never reach the server (see COOKIE_NAME above).
  const payload: Record<string, unknown> = { uid: userId, sv: sessionVersion };
  if (isValidTimeZone(timeZone)) payload.tz = timeZone;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function setSessionCookie(
  userId: string,
  sessionVersion: number,
  timeZone?: string
): Promise<void> {
  const token = await createToken(userId, sessionVersion, timeZone);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

type Session = { uid: string; sv: number; tz: string | null };

const readSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const uid = payload.uid;
    if (typeof uid !== "string") return null;
    // Tokens issued before versioning are treated as v0 (still valid until a revoke).
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    // Sessions issued before timezone detection simply have no tz yet; the
    // browser fills it in on the next page load (see <TimeZoneSync/>).
    const tz = isValidTimeZone(payload.tz) ? payload.tz : null;
    return { uid, sv, tz };
  } catch {
    return null;
  }
});

/**
 * The timezone to render this request's dates in, where the viewer logged in
 * from. Falls back to the team's zone for a session that predates detection.
 * Cached per-request, like getCurrentUser.
 */
export const getViewerTimeZone = cache(async (): Promise<string> => {
  const session = await readSession();
  return safeTimeZone(session?.tz);
});

/** The raw stored value, so we can tell "not set yet" from "set to the team zone". */
export async function getSessionTimeZone(): Promise<string | null> {
  return (await readSession())?.tz ?? null;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Returns the authenticated user (fresh from the DB) or null.
 * Cached per-request so repeated calls in one render don't re-query.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      teamId: true,
      avatarColor: true,
      lastReadAnnouncementsAt: true,
      sessionVersion: true,
      mustChangePassword: true,
    },
  });
  if (!user || !user.active) return null;
  // A token from before "sign out everywhere" / a password change is now stale.
  if (user.sessionVersion !== session.sv) return null;
  return user;
});

export { COOKIE_NAME };
