import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { apiError, ok, ApiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000).ok) {
      throw new ApiError(429, "Too many sign-up attempts. Please try again later.");
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email, and password are all required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Please enter a valid email address.");
    }
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters.");
    }

    // Role is NEVER taken from the client. The very first account to exist
    // bootstraps the coach; everyone who self-registers afterward is an athlete.
    const userCount = await prisma.user.count();
    const role: "COACH" | "ATHLETE" = userCount === 0 ? "COACH" : "ATHLETE";

    // Optional invite gate for a private team (skipped for the bootstrap account).
    const requiredInvite = process.env.TEAM_INVITE_CODE?.trim();
    if (userCount > 0 && requiredInvite) {
      const provided = String(body.inviteCode ?? "").trim();
      if (provided !== requiredInvite) {
        throw new ApiError(403, "A valid invite code is required to join this team.");
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with that email already exists.");
    }

    const passwordHash = await hashPassword(password);
    let team = await prisma.team.findFirst();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        teamId: team?.id ?? null,
      },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: "My Running Team",
          season: "Season 1",
          coachId: role === "COACH" ? user.id : null,
        },
      });
      await prisma.user.update({ where: { id: user.id }, data: { teamId: team.id } });
    } else if (role === "COACH" && !team.coachId) {
      await prisma.team.update({ where: { id: team.id }, data: { coachId: user.id } });
    }

    await setSessionCookie(user.id, user.sessionVersion, String(body.timeZone ?? ""));
    return ok({ id: user.id, role: user.role });
  } catch (e) {
    return apiError(e);
  }
}
