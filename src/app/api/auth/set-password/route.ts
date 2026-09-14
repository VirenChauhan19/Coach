import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ok, ApiError, requireUser } from "@/lib/api";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  getSessionTimeZone,
} from "@/lib/auth";

// First-login password set for provisioned accounts. Unlike PATCH /api/me, this
// does NOT require the current password, the user has just authenticated with
// their temporary one, but it is ONLY usable while `mustChangePassword` is set,
// so it can't be abused as a no-current-password change for normal accounts.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.mustChangePassword) {
      throw new ApiError(400, "Your password is already set. Change it from Settings.");
    }

    const b = await req.json();
    const newPassword = String(b.newPassword ?? "");
    const confirmPassword = String(b.confirmPassword ?? "");

    if (newPassword.length < 8) {
      throw new ApiError(400, "New password must be at least 8 characters.");
    }
    if (newPassword !== confirmPassword) {
      throw new ApiError(400, "The two passwords don't match.");
    }

    // Don't let them simply re-use the temporary password they were handed.
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (full && (await verifyPassword(newPassword, full.passwordHash))) {
      throw new ApiError(400, "Please choose a password different from your temporary one.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 }, // revoke the temp-password session everywhere
      },
      select: { sessionVersion: true },
    });

    // Keep this device signed in under the new session version, carrying the
    // detected timezone across, so a password change doesn't reset it.
    await setSessionCookie(
      user.id,
      updated.sessionVersion,
      String(b.timeZone ?? "") || (await getSessionTimeZone()) || ""
    );
    return ok({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
