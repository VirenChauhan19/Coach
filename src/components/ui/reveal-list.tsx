"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STEP = 20;

/**
 * Renders a long list a chunk at a time.
 *
 * A full season is several hundred sessions, and server-rendering every card up
 * front put megabytes of markup into the initial HTML, the single biggest
 * reason the Workouts screen was slow to arrive on a phone. Nothing is dropped:
 * the section headers still count the real total, and the rest unfolds on
 * demand, instantly, because the data is already in memory.
 */
export function RevealList<T>({
  items,
  initial = STEP,
  className,
  noun = "more",
  children,
}: {
  items: T[];
  initial?: number;
  className?: string;
  /** Plural noun for the button, e.g. "sessions". */
  noun?: string;
  children: (item: T) => React.ReactNode;
}) {
  const [shown, setShown] = useState(initial);
  const remaining = items.length - shown;

  return (
    <>
      <div className={className}>{items.slice(0, shown).map(children)}</div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STEP)}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed",
            "border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700",
            "transition hover:border-brand-300 hover:bg-white hover:text-ink active:translate-y-px"
          )}
        >
          Show {Math.min(STEP, remaining)} more
          <span className="text-xs font-medium text-slate-500">
            {remaining} {noun} left
          </span>
        </button>
      )}
    </>
  );
}
