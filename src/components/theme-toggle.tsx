"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const STORAGE_KEY = "scad-theme";
const THEME_CHANGE_EVENT = "scad-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (meta) meta.content = theme === "dark" ? "#111418" : "#DDB13D";
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function preferredTheme(): Theme {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    function syncTheme() {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }

    function syncStoredTheme(event: StorageEvent) {
      if (event.storageArea === window.localStorage && (event.key === STORAGE_KEY || event.key === null)) {
        applyTheme(preferredTheme());
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener("storage", syncStoredTheme);
    applyTheme(preferredTheme());
    setReady(true);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  function toggleTheme() {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      suppressHydrationWarning
    >
      {ready && isDark ? <Sun size={19} strokeWidth={1.7} /> : <Moon size={19} strokeWidth={1.7} />}
    </button>
  );
}
