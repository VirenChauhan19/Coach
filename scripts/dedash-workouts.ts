/* eslint-disable no-console */
// One-off: take the em and en dashes out of the text already sitting in the
// database. classify.ts stopped producing them, but 366 workouts were written
// before that and still read "50-60 min" with an en dash, "Easy-moderate",
// "3K-5K effort on reps" and so on, all of it visible on the athlete's screen.
//
// The replacements are spelled out rather than done by character so the result
// is exactly what classify() now returns. That matters: a future reseed has to
// produce byte-identical text, or the next sync script sees phantom changes.
//
// Dry run:  npx tsx scripts/dedash-workouts.ts
// Apply:    npx tsx scripts/dedash-workouts.ts --apply
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const EM = "—";
const EN = "–";
const DASH = new RegExp(`[${EM}${EN}]`);

/**
 * Swap a dash for a connector, taking the spaces around it with it: the stored
 * text reads "Team meeting <space><dash><space> Men", and a naive swap leaves
 * "Team meeting ,  Men".
 */
function swap(value: string, dash: string, connector: string): string {
  const parts = value.split(dash);
  if (parts.length === 1) return value;
  return parts.map((part, i) => (i === 0 ? part.trimEnd() : i === parts.length - 1 ? part.trimStart() : part.trim())).join(connector);
}

/** Field-specific rules, matching what classify.ts now emits. */
function clean(field: string, value: string): string {
  if (field === "mainSet") {
    // The race note reads as two sentences now, not one with an aside.
    const v = swap(value, EM, ". ");
    return v.startsWith("Race day. warm up") ? v.replace("Race day. warm up", "Race day. Warm up") : v;
  }
  if (field === "distance") return value.split(EN).join("-"); // "50-60 min"
  if (field === "pace") return value.split(EN).join(" to "); // "Easy to moderate"
  return swap(swap(value, EM, ", "), EN, " to ");
}

const FIELDS = ["title", "distance", "pace", "warmup", "mainSet", "cooldown", "notes", "location"] as const;

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN, pass --apply to write\n");

  const workouts = await prisma.workout.findMany({
    select: { id: true, title: true, distance: true, pace: true, warmup: true, mainSet: true, cooldown: true, notes: true, location: true },
  });

  const edits: { id: string; data: Record<string, string> }[] = [];
  const preview = new Map<string, { to: string; n: number }>();

  for (const w of workouts) {
    const data: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = w[f];
      if (typeof v !== "string" || !DASH.test(v)) continue;
      const next = clean(f, v);
      if (next === v) continue;
      data[f] = next;
      const key = `${f}: ${v}`;
      const seen = preview.get(key);
      if (seen) seen.n++;
      else preview.set(key, { to: next, n: 1 });
    }
    if (Object.keys(data).length) edits.push({ id: w.id, data });
  }

  for (const [from, { to, n }] of [...preview].sort())
    console.log(`  ${String(n).padStart(4)}x  ${from}\n           -> ${to}`);

  const leftover = edits.flatMap((e) => Object.values(e.data)).filter((v) => DASH.test(v));
  if (leftover.length) {
    console.log(`\nREFUSING: ${leftover.length} value(s) still contain a dash after cleaning, e.g. ${JSON.stringify(leftover[0])}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log(`\nDry run complete. ${edits.length} of ${workouts.length} workout(s) would change.`);
    return;
  }

  // Chunked rather than one transaction: this touches most of the table, and
  // the pooled connection has a statement budget.
  for (let i = 0; i < edits.length; i += 50) {
    await prisma.$transaction(edits.slice(i, i + 50).map((e) => prisma.workout.update({ where: { id: e.id }, data: e.data })));
  }
  console.log(`\nUpdated ${edits.length} workout(s).`);

  const still = (await prisma.workout.findMany({ select: { title: true, distance: true, pace: true, mainSet: true, notes: true, location: true } }))
    .flatMap((w) => Object.values(w))
    .filter((v): v is string => typeof v === "string" && DASH.test(v));
  console.log(still.length === 0 ? "Verified: no dashes left in any workout." : `WARNING: ${still.length} value(s) still dashed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
