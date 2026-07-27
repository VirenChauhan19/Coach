import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ok, ApiError, requireUser } from "@/lib/api";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  getSessionTimeZone,
} from "@/lib/auth";

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const b = await req.json();
    const data: Record<string, unknown> = {};

    if (b.name !== undefined) {
      const n = String(b.name).trim();
      if (!n) throw new ApiError(400, "Name can't be empty.");
      data.name = n;
    }
    if (b.email !== undefined) {
      const email = String(b.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, "Please enter a valid email address.");
      }
      const dupe = await prisma.user.findFirst({
        where: { email, id: { not: user.id } },
        select: { id: true },
      });
      if (dupe) throw new ApiError(409, "That email is already in use.");
      data.email = email;
    }
    if (b.gradYear !== undefined) {
      const g = parseInt(String(b.gradYear), 10);
      data.gradYear = Number.isNaN(g) ? null : g;
    }
    for (const f of ["phone", "hometown", "events", "emergencyName", "emergencyPhone", "bio"] as const) {
      if (b[f] !== undefined) data[f] = clean(b[f]);
    }

    // Optional password change; also revokes the user's other sessions.
    let passwordChanged = false;
    if (b.newPassword) {
      const newPassword = String(b.newPassword);
      if (newPassword.length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters.");
      }
      const full = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      const okPw = full && (await verifyPassword(String(b.currentPassword ?? ""), full.passwordHash));
      if (!okPw) throw new ApiError(400, "Current password is incorrect.");
      data.passwordHash = await hashPassword(newPassword);
      data.sessionVersion = { increment: 1 };
      passwordChanged = true;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { sessionVersion: true },
    });

    // Keep the current device signed in, but invalidate every other session.
    if (passwordChanged) {
      await setSessionCookie(
        user.id,
        updated.sessionVersion,
        (await getSessionTimeZone()) || ""
      );
    }

    return ok({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
