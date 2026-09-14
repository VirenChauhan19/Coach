"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { LogoMark } from "./ui/logo";
import { ThemeToggle } from "./theme-toggle";
import { Modal } from "./ui/modal";
import {
  IconToday,
  IconCalendar,
  IconTraining,
  IconTeam,
  IconProfile,
} from "./ui/icons";

type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ICONS = {
  dashboard: IconToday,
  calendar: IconCalendar,
  workouts: IconTraining,
  athletes: IconTeam,
  settings: IconProfile,
} as const;

type NavItem = {
  href: string;
  label: string;
  badge?: number;
  icon: keyof typeof ICONS;
};

const pageTitle = (pathname: string) => {
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/workouts")) return "Training";
  if (pathname.startsWith("/athletes")) return "Team";
  if (pathname.startsWith("/settings")) return "Profile";
  return "Today";
};

function NavTrailing({ active, badge }: { active: boolean; badge?: number }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <Loader2
        size={14}
        className={cn("shrink-0 animate-spin", active ? "text-ink" : "text-slate-400")}
      />
    );
  }
  if (badge) {
    return (
      <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded bg-brand-400 px-1.5 py-0.5 text-[11px] font-semibold text-ink">
        {badge > 99 ? "99+" : badge}
      </span>
    );
  }
  return null;
}

export function AppShell({
  user,
  children,
}: {
  user: NavUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  function openSheet() {
    setMobileOpen(true);
  }

  function closeSheet() {
    setMobileOpen(false);
  }

  const isCoach = user.role === "COACH";
  const roleLabel = isCoach ? "Coach" : "Athlete";

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Today", icon: "dashboard" },
    { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/workouts", label: "Training", icon: "workouts" },
    ...(isCoach
      ? [
          {
            href: "/athletes",
            label: "Team",
            icon: "athletes" as const,
          },
        ]
      : []),
    { href: "/settings", label: "Profile", icon: "settings" },
  ];

  const currentTitle = pageTitle(pathname);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Team navigation" className="space-y-2">
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
              "group flex min-h-[60px] items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition-colors",
              active
                ? "bg-brand-50 text-ink"
                : "text-slate-600 hover:bg-slate-50 hover:text-ink"
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-colors",
                active
                  ? "bg-brand-300 text-ink-900 shadow-[0_3px_8px_-5px_rgba(144,104,23,0.4)]"
                  : "text-slate-500 group-hover:bg-white group-hover:text-ink"
              )}
            >
              <Icon size={25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate", active ? "font-semibold" : "font-medium")}>{item.label}</span>
            </span>
            <NavTrailing active={active} badge={item.badge} />
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="space-y-3">
      <Link href="/settings" onClick={closeSheet} className="group flex min-h-16 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition-colors hover:bg-slate-100">
        <Avatar name={user.name} seed={user.id} size={42} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{roleLabel} profile</div>
        </div>
        <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-slate-400" />
      </Link>
      <div className="flex items-center justify-between px-1">
        <button
          onClick={logout}
          className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} aria-hidden="true" /> Sign out
        </button>
        <ThemeToggle className="shrink-0 shadow-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-app">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-paper-50 lg:flex">
        <div className="px-6 pb-6 pt-8">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl">
            <LogoMark size={44} />
            <div className="leading-tight">
              <div className="text-[16px] font-bold tracking-tight text-ink">SCAD Atlanta</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Distance team</div>
            </div>
          </Link>
        </div>

        <div className="mx-6 border-t border-slate-200" />

        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-thin">
          <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your team hub</p>
          <NavLinks />
        </div>

        <div className="border-t border-slate-200 p-4">
          <UserCard />
        </div>
      </aside>

      <header
        className="sticky top-0 z-30 border-b border-slate-200/70 bg-paper-50/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-ink-900/95 sm:px-6 lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-[72px] items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark size={38} className="rounded-xl" />
            <div className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-ink">SCAD Distance</span>
              <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Atlanta · {currentTitle}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="shadow-none" />
            <button
              onClick={openSheet}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-200 bg-brand-50"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
            >
              <Avatar name={user.name} seed={user.id} size={32} />
            </button>
          </div>
        </div>
      </header>

      <Modal open={mobileOpen} onClose={closeSheet} title="Your team hub" description={`SCAD Atlanta · ${roleLabel}`} size="sm">
        <NavLinks onNavigate={closeSheet} />
        <div className="mt-5"><UserCard /></div>
      </Modal>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-paper-50/95 px-3 pt-2 shadow-[0_-8px_28px_-16px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-ink-900/95 lg:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <nav aria-label="Main navigation" className="mx-auto flex max-w-lg items-stretch gap-1">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
                  active ? "text-ink" : "text-slate-500 hover:text-ink"
                )}
              >
                <span className={cn("flex h-9 w-14 items-center justify-center rounded-2xl transition-colors", active ? "bg-brand-300 text-ink-900" : "group-hover:bg-slate-100")}>
                  <Icon size={24} />
                </span>
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="absolute right-2 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-400 px-1 text-[9px] font-semibold text-ink">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="relative min-w-0 lg:min-h-app lg:pl-72">
        <div
          key={pathname}
          className="mx-auto w-full max-w-[1500px] animate-page-enter px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8 lg:py-7"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
