import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  setSessionCookie,
  equalizePasswordTiming,
} from "@/lib/auth";
import { apiError, ok, ApiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { normalizeUsername } from "@/lib/username";

export async function POST(req: NextRequest) {
  try {
    // A team signs in from one network, and clientIp() falls back to a single
    // "unknown" bucket when there is no proxy header at all, so a tight per-IP
    // limit locks out the eleventh athlete at practice rather than an attacker.
    // The per-account limit below is what actually slows a brute-force attempt.
    const ip = clientIp(req);
    if (!rateLimit(`login:ip:${ip}`, 60, 60_000).ok) {
      throw new ApiError(429, "Too many attempts. Please wait a minute and try again.");
    }

    const body = await req.json();
    // People sign in with a username. `email` is still read so an older client
    // (or someone typing the address they were first given) still works, and
    // normalizeUsername() drops anything after an "@" for the same reason.
    const typed = String(body.username ?? body.email ?? "").trim().toLowerCase();
    const username = normalizeUsername(typed);
    const password = String(body.password ?? "");

    if (!username || !password) {
      throw new ApiError(400, "Username and password are required.");
    }

    // Per-account throttle to slow targeted brute-force.
    if (!rateLimit(`login:user:${username}`, 5, 60_000).ok) {
      throw new ApiError(429, "Too many attempts for this account. Please wait a minute.");
    }

    // The username column, then the address it was derived from, so an account
    // that predates usernames still signs in.
    const user =
      (await prisma.user.findUnique({ where: { username } })) ??
      (await prisma.user.findUnique({ where: { email: typed } }));
    if (!user || !user.active) {
      // Equalize timing so a missing/inactive account isn't distinguishable.
      await equalizePasswordTiming(password);
      throw new ApiError(401, "Incorrect username or password.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Incorrect username or password.");
    }

    // Remember the timezone this login came from, so the schedule renders in
    // the viewer's own days rather than the server's (UTC).
    await setSessionCookie(user.id, user.sessionVersion, String(body.timeZone ?? ""));
    return ok({
      id: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (e) {
    return apiError(e);
  }
}
