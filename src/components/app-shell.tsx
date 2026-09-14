"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { LogoMark } from "./ui/logo";
import {
  IconTrack,
  IconCalendar,
  IconStopwatch,
  IconChat,
  IconRunner,
  IconSliders,
} from "./ui/icons";

type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ICONS = {
  dashboard: IconTrack,
  calendar: IconCalendar,
  workouts: IconStopwatch,
  messages: IconChat,
  athletes: IconRunner,
  settings: IconSliders,
} as const;

type NavItem = {
  href: string;
  label: string;
  kicker: string;
  badge?: number;
  icon: keyof typeof ICONS;
};

const pageTitle = (pathname: string) => {
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/workouts")) return "Workouts";
  if (pathname.startsWith("/messages")) return "Messages";
  if (pathname.startsWith("/athletes")) return "Athletes";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
};

// Trailing slot for each nav item. Uses Next's pending-navigation state so a
// spinner appears the instant a link is clicked, the rail feels responsive
// even while the (remote) database is still resolving the next page.
function NavTrailing({ active, badge }: { active: boolean; badge?: number }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <Loader2
        size={15}
        className={cn("shrink-0 animate-spin", active ? "text-brand-500" : "text-brand-300")}
      />
    );
  }
  if (badge) {
    return (
      <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-md bg-brand-400 px-1.5 py-0.5 text-[11px] font-bold text-ink">
        {badge > 99 ? "99+" : badge}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
        active ? "bg-brand-400" : "bg-transparent group-hover:bg-white/30"
      )}
    />
  );
}

export function AppShell({
  user,
  unreadMessages,
  children,
}: {
  user: NavUser;
  unreadMessages: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

  function openSheet() {
    setSheetClosing(false);
    setMobileOpen(true);
  }
  function closeSheet() {
    setSheetClosing(true);
    window.setTimeout(() => {
      setMobileOpen(false);
      setSheetClosing(false);
    }, 230);
  }

  const isCoach = user.role === "COACH";
  const roleLabel = isCoach ? "Head Coach" : "Athlete";

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", kicker: "Command center", icon: "dashboard" },
    { href: "/calendar", label: "Calendar", kicker: "Training map", icon: "calendar" },
    { href: "/workouts", label: "Workouts", kicker: "Plan + log", icon: "workouts" },
    {
      href: "/messages",
      label: "Messages",
      kicker: "Team comms",
      icon: "messages",
      badge: unreadMessages,
    },
    ...(isCoach
      ? [
          {
            href: "/athletes",
            label: "Athletes",
            kicker: "Roster hub",
            icon: "athletes" as const,
          },
        ]
      : []),
    { href: "/settings", label: "Settings", kicker: "Profile", icon: "settings" },
  ];

  const bottomNav: NavItem[] = nav.slice(0, 4);
  const currentTitle = pageTitle(pathname);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = isActive(item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-all duration-200",
              active
                ? "bg-white text-ink shadow-soft"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {/* gold active rail on the left edge */}
            <span
              className={cn(
                "absolute -left-px top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400 transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
              )}
            />
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                active
                  ? "bg-ink text-brand-400"
                  : "bg-white/[0.06] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-brand-300"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold leading-tight">
                {item.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] leading-tight",
                  active ? "text-slate-400" : "text-slate-500 group-hover:text-slate-400"
                )}
              >
                {item.kicker}
              </span>
            </span>
            <NavTrailing active={active} badge={item.badge} />
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} seed={user.id} size={42} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{user.name}</div>
          <div className="truncate text-xs text-slate-400">{roleLabel}</div>
        </div>
        <button
          onClick={logout}
          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-app">
      {/* Decorative wash. Desktop only: on a phone this is a full-viewport
          fixed layer the compositor carries through every scroll frame, and the
          body's own paper gradient already covers that size. */}
      <div className="pointer-events-none fixed inset-0 hidden bg-[radial-gradient(circle_at_12%_8%,rgb(234_179_8_/_0.18),transparent_26%),radial-gradient(circle_at_88%_0%,rgb(19_23_31_/_0.10),transparent_30%)] lg:block" />

      <aside className="fixed inset-y-4 left-4 z-30 hidden w-80 flex-col overflow-hidden rounded-lg border border-white/10 bg-ink shadow-[0_24px_70px_-28px_rgb(19_23_31_/_0.70)] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(234_179_8_/_0.22),transparent_30%),linear-gradient(180deg,rgb(255_255_255_/_0.07),transparent_42%)]" />

        <div className="relative px-5 pb-4 pt-5">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <LogoMark size={40} className="rounded-md ring-1 ring-white/15 transition-transform duration-200 group-hover:scale-105" />
            <div className="leading-none">
              <div className="font-display text-[17px] font-bold uppercase tracking-[0.08em] text-white">
                SCAD Atlanta
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-300">
                Distance Hub
              </div>
            </div>
          </Link>
        </div>

        <div className="relative mx-5 h-px bg-gradient-to-r from-white/15 via-white/10 to-transparent" />

        <div className="relative flex-1 overflow-y-auto px-3 py-4 scroll-thin">
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>
          <NavLinks />
        </div>

        <div className="relative p-3.5">
          <UserCard />
        </div>
      </aside>

      {/* Opaque, not translucent-and-blurred. A backdrop-filter on a sticky bar
          makes the browser re-blur whatever is passing underneath on every
          scroll frame, which is the single biggest source of scroll stutter on
          a phone. This header is lg:hidden, so the blur only ever cost mobile. */}
      <header
        className="sticky top-0 z-30 border-b border-ink/10 bg-paper px-4 lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark size={32} className="rounded-md" />
            <div className="leading-none">
              <span className="block font-display text-base font-bold uppercase tracking-[0.08em] text-ink">
                SCAD Distance
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {currentTitle}
              </span>
            </div>
          </Link>
          <button
            onClick={openSheet}
            className="rounded-lg border border-ink/10 bg-white p-1.5 shadow-soft"
            aria-label="Open menu"
          >
            <Avatar name={user.name} seed={user.id} size={32} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={cn(
              "absolute inset-0 bg-ink/60 backdrop-blur-sm",
              sheetClosing ? "animate-fade-out" : "animate-fade-in"
            )}
            onClick={closeSheet}
          />
          <div
            className={cn(
              "absolute inset-x-3 bottom-3 overflow-hidden rounded-lg border border-white/10 bg-ink p-4 shadow-soft",
              sheetClosing ? "animate-sheet-down" : "animate-sheet-up"
            )}
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark size={34} className="rounded-md" />
                <div>
                  <div className="font-display text-base font-bold uppercase text-white">
                    Team Hub
                  </div>
                  <div className="text-xs text-slate-400">{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={closeSheet}
                className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={closeSheet} />
            <div className="mt-4">
              <UserCard />
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden"
        style={{ paddingBottom: "calc(0.7rem + env(safe-area-inset-bottom))" }}
      >
        {/* Opaque for the same reason as the header above: this bar is pinned
            over scrolling content, so a backdrop blur re-runs every frame. */}
        <nav className="mx-auto flex max-w-md items-stretch gap-1 rounded-lg border border-ink/10 bg-ink p-1.5 shadow-soft">
          {bottomNav.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[10px] font-semibold transition active:scale-95",
                  active
                    ? "bg-white text-ink"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className={cn(active && "text-brand-500")}
                />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="absolute right-2 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-400 px-1 text-[9px] font-bold text-ink">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            onClick={openSheet}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[10px] font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="More"
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>

      <main className="relative min-h-app lg:pl-[22rem]">
        <div
          key={pathname}
          className="mx-auto w-full max-w-[1680px] animate-page-enter px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8 2xl:px-10"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
