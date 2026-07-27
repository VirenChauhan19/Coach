"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { dateHelpers, TEAM_TIME_ZONE, type DateHelpers } from "@/lib/date";

const TimeZoneContext = createContext<string>(TEAM_TIME_ZONE);

/**
 * Supplies the viewer's timezone to every client component.
 *
 * The value comes from the server (read out of the session), NOT from the
 * browser — that's the point. If the client picked its own zone here, the first
 * client render would disagree with the server's HTML and React would throw a
 * hydration mismatch, which is how dates end up visibly flickering to a
 * different day. Correcting a stale zone is <TimeZoneSync/>'s job instead: it
 * updates the session and re-renders properly.
 */
export function TimeZoneProvider({
  zone,
  children,
}: {
  zone: string;
  children: React.ReactNode;
}) {
  return (
    <TimeZoneContext.Provider value={zone}>{children}</TimeZoneContext.Provider>
  );
}

/** The viewer's IANA timezone. */
export function useTimeZone(): string {
  return useContext(TimeZoneContext);
}

/** The date toolkit, bound to the viewer's timezone. */
export function useDates(): DateHelpers {
  return dateHelpers(useContext(TimeZoneContext));
}

/** What this browser actually thinks its timezone is. */
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Keeps the session's timezone matching the browser's.
 *
 * Renders nothing. Runs after hydration, so it can't cause a mismatch: if the
 * browser's zone differs from what the server rendered with, it saves the real
 * one and refreshes, and the next render is correct everywhere.
 *
 * `sessionZone` is the raw session value — null means "never detected", which
 * is why it's distinguished from the zone actually used for rendering.
 */
export function TimeZoneSync({ sessionZone }: { sessionZone: string | null }) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    const actual = browserTimeZone();
    if (!actual || actual === sessionZone) return;
    attempted.current = true; // one attempt per mount, never a refresh loop

    fetch("/api/me/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: actual }),
    })
      .then((res) => {
        if (res.ok) router.refresh();
      })
      .catch(() => {
        // Not worth surfacing: the fallback zone still renders a usable
        // schedule, and we retry on the next page load.
      });
  }, [sessionZone, router]);

  return null;
}
