import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ok, ApiError, requireCoach } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { emailForUsername, isValidUsername, normalizeUsername, usernameFromName } from "@/lib/username";

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

export async function POST(req: NextRequest) {
  try {
    const coach = await requireCoach();
    if (!coach.teamId) throw new ApiError(400, "No team found for this coach.");
    const b = await req.json();

    const name = String(b.name ?? "").trim();
    if (!name) throw new ApiError(400, "Name is required.");

    // The coach gives a username; nobody has to invent an email address for a
    // roster that never sends mail. A real one is still accepted if given.
    const username = normalizeUsername(b.username ?? usernameFromName(name));
    if (!isValidUsername(username)) {
      throw new ApiError(400, "Usernames are 3-30 characters: letters, numbers, dots, dashes or underscores.");
    }
    const email = String(b.email ?? "").trim().toLowerCase() || emailForUsername(username);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Please enter a valid email address.");
    }

    const taken = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true },
    });
    if (taken) {
      throw new ApiError(409, taken.username === username ? "That username is already taken." : "An athlete with that email already exists.");
    }

    const password = String(b.password ?? "").trim() || "password123";
    const passwordHash = await hashPassword(password);

    const gradYear = b.gradYear ? parseInt(String(b.gradYear), 10) : null;

    const athlete = await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        role: "ATHLETE",
        mustChangePassword: true, // they set their own password on first login
        teamId: coach.teamId,
        gradYear: gradYear && !Number.isNaN(gradYear) ? gradYear : null,
        events: clean(b.events),
        hometown: clean(b.hometown),
        phone: clean(b.phone),
        emergencyName: clean(b.emergencyName),
        emergencyPhone: clean(b.emergencyPhone),
        bio: clean(b.bio),
      },
    });

    return ok({ id: athlete.id, username: athlete.username, tempPassword: password }, 201);
  } catch (e) {
    return apiError(e);
  }
}
