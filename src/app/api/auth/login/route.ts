import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  setSessionCookie,
  equalizePasswordTiming,
} from "@/lib/auth";
import { apiError, ok, ApiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`login:ip:${ip}`, 10, 60_000).ok) {
      throw new ApiError(429, "Too many attempts. Please wait a minute and try again.");
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    // Per-account throttle to slow targeted brute-force.
    if (!rateLimit(`login:email:${email}`, 5, 60_000).ok) {
      throw new ApiError(429, "Too many attempts for this account. Please wait a minute.");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      // Equalize timing so a missing/inactive account isn't distinguishable.
      await equalizePasswordTiming(password);
      throw new ApiError(401, "Incorrect email or password.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Incorrect email or password.");
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
