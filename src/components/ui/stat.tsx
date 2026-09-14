"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Animated number that counts up from 0 → value the first time it scrolls into
 * view (eased), then holds. Falls back to the final value when the user prefers
 * reduced motion or JS hasn't run yet.
 */
export function CountUp({
  value,
  className,
  suffix = "",
  duration = 900,
}: {
  value: number;
  className?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduceMotion()) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    setDisplay(0);
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        // Clamp both ends. requestAnimationFrame reports the time the frame
        // began, which can predate the performance.now() captured a moment ago
        // in the IntersectionObserver callback. That made `t` negative, and
        // easeOutCubic turns a negative t into a negative multiplier, so the
        // stat visibly flashed a negative number before counting up.
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setDisplay(Math.round(value * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
      {suffix}
    </span>
  );
}

/**
 * Progress bar that grows from 0 → value on mount with an eased width
 * transition, so completion stats animate into place.
 */
export function AnimatedBar({
  value,
  className,
  barClassName = "bg-emerald-500",
  height = "h-1.5",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  height?: string;
}) {
  const target = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (reduceMotion()) {
      setWidth(target);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-sm bg-slate-200",
        height,
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-sm transition-[width] duration-700 ease-out",
          barClassName
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
