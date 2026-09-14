import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic, pleasant avatar background based on a seed (name/email/id).
const AVATAR_PALETTE = [
  "#1F6F54", "#2563EB", "#9333EA", "#C8920C", "#0F766E",
  "#DB2777", "#475569", "#B45309", "#0E7490", "#4338CA",
  "#15803D", "#BE123C", "#7C3AED", "#0369A1", "#92400E",
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function parsePersonalBests(
  json: string | null | undefined
): { event: string; time: string }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.filter((p) => p && p.event && p.time);
    return [];
  } catch {
    return [];
  }
}

export function eventsList(events: string | null | undefined): string[] {
  if (!events) return [];
  return events
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export type Paces = {
  ez?: string;
  // The chart carries two tempo zones, short (LT-1) and medium (LT-2); a
  // prescription written "@ ST-MT" asks for the range between them.
  tempo?: string;
  tempoMed?: string;
  k10?: string;
  k8?: string;
  k6?: string;
  k5?: string;
  k3?: string;
  mile?: string;
  doubleFreq?: string;
  xtFreq?: string;
  xtTarget?: string;
  /** This athlete's slot in the lift window, on days the plan lifts. */
  liftTime?: string;
};

export function parsePaces(json: string | null | undefined): Paces | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    return p && typeof p === "object" ? (p as Paces) : null;
  } catch {
    return null;
  }
}
