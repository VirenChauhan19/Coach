import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, ok, ApiError, requireCoach } from "@/lib/api";
import { isWorkoutType, defaultWorkoutTitle } from "@/lib/constants";
import { dateHelpers } from "@/lib/date";
import { getViewerTimeZone } from "@/lib/auth";

async function parseDate(input: unknown): Promise<Date> {
  // The day the coach picked, stored at noon UTC. Resolved against the coach's
  // own timezone, never the server's, which is UTC in production.
  const { parseWorkoutDate } = dateHelpers(await getViewerTimeZone());
  const date = parseWorkoutDate(input);
  if (!date) throw new ApiError(400, "Please choose a valid date.");
  return date;
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

export async function POST(req: NextRequest) {
  try {
    const coach = await requireCoach();
    if (!coach.teamId) throw new ApiError(400, "No team found for this coach.");
    const b = await req.json();

    const type = isWorkoutType(b.type) ? b.type : "EASY";
    // Title is optional: fall back to the workout type's label (e.g. "Easy Run").
    const title = String(b.title ?? "").trim() || defaultWorkoutTitle(type);
    const date = await parseDate(b.date);
    const scope = b.scope === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM";

    // Resolve who this workout is assigned to.
    const teamAthletes = await prisma.user.findMany({
      where: { teamId: coach.teamId, role: "ATHLETE", active: true },
      select: { id: true },
    });
    const teamAthleteIds = teamAthletes.map((a) => a.id);

    let assigneeIds: string[];
    if (scope === "TEAM") {
      assigneeIds = teamAthleteIds;
    } else {
      const requested: string[] = Array.isArray(b.athleteIds) ? b.athleteIds.map(String) : [];
      assigneeIds = requested.filter((id) => teamAthleteIds.includes(id));
      if (assigneeIds.length === 0) {
        throw new ApiError(400, "Select at least one athlete for an individual workout.");
      }
    }

    const workout = await prisma.workout.create({
      data: {
        title,
        type,
        scope,
        date,
        distance: clean(b.distance),
        pace: clean(b.pace),
        warmup: clean(b.warmup),
        mainSet: clean(b.mainSet),
        cooldown: clean(b.cooldown),
        notes: clean(b.notes),
        location: clean(b.location),
        link: clean(b.link),
        teamId: coach.teamId,
        createdById: coach.id,
      },
    });

    if (assigneeIds.length) {
      await prisma.assignment.createMany({
        data: assigneeIds.map((athleteId) => ({ workoutId: workout.id, athleteId })),
      });
    }

    return ok({ id: workout.id, assigned: assigneeIds.length }, 201);
  } catch (e) {
    return apiError(e);
  }
}
