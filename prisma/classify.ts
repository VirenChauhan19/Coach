// Turns a raw cell from the coach's plan spreadsheet ("70-80' EZ + 6-8 X 20\"
// STRIDES @ MILE") into the fields the app stores on a Workout.
//
// This lives apart from seed.ts because seed.ts resets the database on import.
// One-off scripts that touch live data need the same classification the seed
// uses, so they import it from here instead.

const RACES = new Set([
  "CONVERSE KICK-OFF",
  "FOOTHILLS INV",
  "NAIA BLAZING TIGER",
  "ROYALS XC CHALLENGE",
  "SUN CONF. CHAMP.",
  "NAIA NATIONAL CHAMP.",
]);

function durationLabel(text: string): string | null {
  const m = text.match(/^(\d+)-(\d+)'/);
  return m ? `${m[1]}–${m[2]} min` : null;
}

function raceTitle(t: string): string {
  let s = t
    .toLowerCase()
    .replace(/\binv\b\.?/g, "invitational")
    .replace(/\bconf\.?\b/g, "conference")
    .replace(/\bchamp\.?\b/g, "championship");
  s = s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return s
    .replace(/\bNaia\b/g, "NAIA")
    .replace(/\bXc\b/g, "XC")
    .replace(/Kick-off/i, "Kick-Off");
}

function woTitle(raw: string): string {
  return raw
    .replace(/\bWO\b/gi, "Workout")
    .split(/\s+/)
    .map((w) => (/[0-9#/"']/.test(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

export type Classified = {
  type: string;
  title: string;
  mainSet: string | null;
  distance: string | null;
  pace: string | null;
};

export function classify(text: string, lrTarget: string): Classified | null {
  if (!text) return null;
  const t = text.toUpperCase();
  const dist = durationLabel(text);

  if (t === "OFF") return { type: "REST", title: "Rest Day", mainSet: null, distance: null, pace: null };

  if (RACES.has(t))
    return {
      type: "RACE",
      title: raceTitle(text),
      mainSet: "Race day — warm up early, pin numbers, line up ready to compete.",
      distance: null,
      pace: "Race effort",
    };

  if (t.startsWith("PRE-MEET"))
    return { type: "WORKOUT", title: "Pre-Meet Primer", mainSet: text, distance: null, pace: "Light + strides" };

  if (t.includes("TEMPO")) {
    let title = "Tempo Workout";
    if (t.includes("TURNOVER")) title = "Tempo + Turnover";
    else if (t.includes("@ TEMPO")) title = "Tempo Surges";
    else {
      const n = t.match(/#(\d+)/);
      title = "Tempo Workout" + (n ? ` #${n[1]}` : "");
    }
    const plus = text.indexOf("+");
    const main = dist && plus > 0 ? text.slice(plus + 1).trim() : text;
    return { type: "WORKOUT", title, mainSet: main, distance: dist, pace: "Tempo effort" };
  }

  if (/\bWO\b/.test(t) || t.includes("WO #"))
    return { type: "WORKOUT", title: woTitle(text), mainSet: text, distance: null, pace: "See your race paces" };

  // Rep sessions, in either shorthand the coach uses: the "EI" ladders
  // ("3X4X40\"/80\"/3' EI") and plain rep prescriptions that lead with the rep
  // count ("10-12 X 1' @ 3K-5K W/ 1'"). Both are hard 3K-5K work — without the
  // second pattern these fall through to the easy-run default below.
  if (/\bEI\b/.test(t) || /^\d+(-\d+)?\s*X\s/.test(t))
    return { type: "WORKOUT", title: "Interval Workout", mainSet: text, distance: null, pace: "3K–5K effort on reps" };

  if (t.includes("STRIDES")) {
    const plus = text.indexOf("+");
    const main = plus > 0 ? text.slice(plus + 1).trim() : text;
    return { type: "EASY", title: "Easy Run + Strides", mainSet: main, distance: dist, pace: "Easy" };
  }

  if (/^\d+-\d+'\s*EZ$/.test(t)) {
    const isLong = text.startsWith(lrTarget + "'");
    return isLong
      ? { type: "LONG_RUN", title: "Long Run", mainSet: null, distance: dist, pace: "Easy–moderate" }
      : { type: "EASY", title: "Easy Run", mainSet: null, distance: dist, pace: "Easy" };
  }

  return { type: "EASY", title: "Easy Run", mainSet: text, distance: dist, pace: "Easy" };
}
