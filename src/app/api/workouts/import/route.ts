import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, apiError, ok, requireCoach } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { readBoundedImportForm, validateXlsxFile } from "@/lib/workout-import-file";
import { applyWorkoutImport, prepareWorkoutImport, type WorkoutImportInput } from "@/lib/workout-import-service";
import type { ImportResolutions } from "@/lib/workout-import-types";

export const runtime = "nodejs";
export const maxDuration = 30;

function resolutionsFrom(value: FormDataEntryValue | null): ImportResolutions {
  if (!value) return {};
  if (typeof value !== "string" || value.length > 40000) throw new ApiError(400, "Invalid athlete matching choices.");
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new ApiError(400, "Invalid athlete matching choices."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length > 250) {
    throw new ApiError(400, "Invalid athlete matching choices.");
  }
  for (const [key, choice] of Object.entries(parsed)) {
    if (!/^row-\d+$/.test(key) || !choice || typeof choice !== "object" || Array.isArray(choice)) {
      throw new ApiError(400, "Invalid athlete matching choices.");
    }
    for (const [field, value] of Object.entries(choice)) {
      if (field === "skip" ? typeof value !== "boolean"
        : !["athleteId", "volumeGroup", "workoutGroup"].includes(field) || typeof value !== "string" || value.length > 120) {
        throw new ApiError(400, "Invalid athlete matching choices.");
      }
    }
  }
  return parsed as ImportResolutions;
}

export async function POST(req: NextRequest) {
  try {
    const coach = await requireCoach();
    if (!coach.teamId) throw new ApiError(400, "No team found for this coach.");
    const origin = req.headers.get("origin");
    if (origin) {
      const requestHost = new URL(req.url).host;
      const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
      let originHost: string;
      try { originHost = new URL(origin).host; } catch { throw new ApiError(403, "Open the import from your team app."); }
      if (originHost !== requestHost && originHost !== forwardedHost) throw new ApiError(403, "Open the import from your team app.");
    }
    if (!rateLimit(`workout-import:${coach.id}`, 30, 60_000).ok) {
      throw new ApiError(429, "Too many import requests. Wait a minute and try again.");
    }
    const form = await readBoundedImportForm(req);
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose your weekly Excel file.");
    const buffer = await validateXlsxFile(file);
    const action = form.get("action");
    if (action !== "preview" && action !== "commit") throw new ApiError(400, "Choose preview or publish.");
    const mode = form.get("mode");
    if (mode !== "add" && mode !== "replace") throw new ApiError(400, "Choose how existing sessions should be handled.");
    const weekStart = form.get("weekStart");
    if (typeof weekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      throw new ApiError(400, "Choose the Monday for this training week.");
    }
    const input: WorkoutImportInput = {
      buffer, weekStart, mode, resolutions: resolutionsFrom(form.get("resolutions")),
      teamId: coach.teamId, coachId: coach.id,
    };
    if (action === "preview") return ok((await prepareWorkoutImport(prisma, input)).preview);
    const previewToken = form.get("previewToken");
    if (typeof previewToken !== "string" || !/^[a-f0-9]{64}$/.test(previewToken)) {
      throw new ApiError(400, "Preview this file before publishing it.");
    }
    const result = await prisma.$transaction(async (tx) => {
      // Authorization and roster changes are rechecked inside the transaction.
      const currentCoach = await tx.user.findFirst({
        where: { id: coach.id, teamId: coach.teamId, role: "COACH", active: true, sessionVersion: coach.sessionVersion },
        select: { id: true },
      });
      if (!currentCoach) throw new ApiError(403, "Your coach access changed. Sign in again.");
      const plan = await prepareWorkoutImport(tx, input);
      if (plan.preview.previewToken !== previewToken) {
        // A retry after a successful publish can safely report its no-op result.
        if (!plan.preview.errors.length && !plan.preview.canImport && plan.preview.summary.unchanged > 0) {
          return applyWorkoutImport(tx, input, plan);
        }
        throw new ApiError(409, "The roster or schedule changed while you were reviewing. Preview the file again before publishing.");
      }
      return applyWorkoutImport(tx, input, plan);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000, maxWait: 5000 });
    return ok(result, result.workouts ? 201 : 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2028", "P1008"].includes(error.code)) {
      return apiError(new ApiError(409, "The schedule is being updated. Preview the file again and retry."));
    }
    return apiError(error);
  }
}
