import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ok, ApiError, requireCoach } from "@/lib/api";
import { isWorkoutType, defaultWorkoutTitle } from "@/lib/constants";
import { dateHelpers } from "@/lib/date";
import { getViewerTimeZone } from "@/lib/auth";

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

async function parseDate(input: unknown): Promise<Date> {
  // Same anchor as the create route, so editing a workout can't quietly slide
  // it onto a different day than the one the coach picked.
  const { parseWorkoutDate } = dateHelpers(await getViewerTimeZone());
  const date = parseWorkoutDate(input);
  if (!date) throw new ApiError(400, "Please choose a valid date.");
  return date;
}

async function loadOwned(workoutId: string, teamId: string | null) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout || workout.teamId !== teamId) {
    throw new ApiError(404, "Workout not found.");
  }
  return workout;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const workout = await loadOwned(id, coach.teamId);
    const b = await req.json();

    const data: Record<string, unknown> = {};
    if (b.title !== undefined) {
      // Blank title falls back to the (new or existing) type's label.
      const nextType = isWorkoutType(b.type) ? b.type : workout.type;
      data.title = String(b.title).trim() || defaultWorkoutTitle(nextType);
    }
    if (b.type !== undefined && isWorkoutType(b.type)) data.type = b.type;
    if (b.date !== undefined) data.date = await parseDate(b.date);
    for (const f of ["distance", "pace", "warmup", "mainSet", "cooldown", "notes", "location", "link"] as const) {
      if (b[f] !== undefined) data[f] = clean(b[f]);
    }

    await prisma.workout.update({ where: { id }, data });

    // Optional re-assignment for individual workouts.
    if (Array.isArray(b.athleteIds)) {
      const teamAthletes = await prisma.user.findMany({
        where: { teamId: coach.teamId, role: "ATHLETE", active: true },
        select: { id: true },
      });
      const valid = new Set(teamAthletes.map((a) => a.id));
      const next = (b.athleteIds as unknown[]).map(String).filter((x) => valid.has(x));
      const current = await prisma.assignment.findMany({
        where: { workoutId: id },
        select: { athleteId: true },
      });
      const currentSet = new Set(current.map((c) => c.athleteId));
      const toAdd = next.filter((x) => !currentSet.has(x));
      const toRemove = [...currentSet].filter((x) => !next.includes(x));
      if (toAdd.length) {
        await prisma.assignment.createMany({
          data: toAdd.map((athleteId) => ({ workoutId: id, athleteId })),
        });
      }
      if (toRemove.length) {
        await prisma.assignment.deleteMany({
          where: { workoutId: id, athleteId: { in: toRemove } },
        });
      }
    }

    return ok({ id });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    await loadOwned(id, coach.teamId);
    await prisma.workout.delete({ where: { id } });
    return ok({ id });
  } catch (e) {
    return apiError(e);
  }
}
