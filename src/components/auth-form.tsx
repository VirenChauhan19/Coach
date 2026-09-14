"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { IconTeam, IconTraining } from "./ui/icons";
import { LogoMark } from "./ui/logo";
import { Field, FormError } from "./ui/field";
import { ThemeToggle } from "./theme-toggle";
import { browserTimeZone } from "./time-zone";
import { normalizeUsername } from "@/lib/username";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  // A username is the only name this app knows people by, on both screens.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function go(payload: {
    username: string;
    password: string;
    name?: string;
    inviteCode?: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, timeZone: browserTimeZone() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.push(data.mustChangePassword ? "/set-password" : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Is the server running?");
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") go({ username: identifier, password });
    else go({ username: identifier, password, name, inviteCode });
  }

  function demoLogin(username: string, demoPassword: string) {
    setIdentifier(username);
    setPassword(demoPassword);
    go({ username, password: demoPassword });
  }

  return (
    <div className="min-h-app bg-paper px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:px-5 sm:py-8">
      <main className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[440px] items-start sm:min-h-[calc(100dvh-4rem)] sm:items-center">
        <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
          <div className="relative isolate overflow-hidden bg-ink px-5 pb-6 pt-5 sm:px-7 sm:pt-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-12 -z-10 h-72 w-60 -rotate-[25deg] rounded-[100px] border border-brand-400/20 p-4">
              <div className="h-full rounded-[84px] border border-brand-400/20 p-4">
                <div className="h-full rounded-[68px] border border-brand-400/20" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogoMark size={42} className="rounded-xl" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-white">SCAD Atlanta</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">Distance team</div>
                </div>
              </div>
              <ThemeToggle className="shrink-0 rounded-full" />
            </div>

            <h1 className="mt-7 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">
              {mode === "login" ? "Welcome back." : "Better together."}
            </h1>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-white/70">
              {mode === "login"
                ? "Your training. Your progress. Your team."
                : "Join your team and make every mile count."}
            </p>
          </div>

          <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-7">
            <form onSubmit={onSubmit} className="space-y-4">
              {error && <FormError message={error} />}

              {mode === "signup" && (
                <Field label="Full name" htmlFor="name" required>
                  <input
                    id="name"
                    className="input min-h-12 rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    autoComplete="name"
                    required
                  />
                </Field>
              )}

              <Field
                label="Username"
                htmlFor="identifier"
                required
                hint={mode === "signup" ? "Lower case, at least 3 characters. This is how you'll sign in." : undefined}
              >
                <input
                  id="identifier"
                  type="text"
                  className="input min-h-12 rounded-xl"
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(mode === "signup" ? normalizeUsername(e.target.value) : e.target.value)
                  }
                  placeholder="firstname"
                  autoComplete={mode === "login" ? "username" : "off"}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <input
                  id="password"
                  type="password"
                  className="input min-h-12 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
              </Field>

              {mode === "signup" && (
                <Field
                  label="Invite code"
                  htmlFor="inviteCode"
                  hint="Optional. New accounts join as athletes unless the coach updates the roster."
                >
                  <input
                    id="inviteCode"
                    className="input min-h-12 rounded-xl"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Optional"
                    autoComplete="off"
                  />
                </Field>
              )}

              <button type="submit" className="btn-primary min-h-12 w-full rounded-xl font-semibold" disabled={loading}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
                {!loading && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </form>

            {mode === "login" && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Take a look around</span>
                  <span className="text-xs text-slate-500">Try a demo</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => demoLogin("coach", "coachxc2026")}
                    disabled={loading}
                    className="btn-outline min-h-12 rounded-xl"
                  >
                    <IconTeam size={22} strokeWidth={1.7} className="text-brand-700 dark:text-brand-300" />
                    Coach
                  </button>
                  <button
                    type="button"
                    onClick={() => demoLogin("viren", "virenxc2026")}
                    disabled={loading}
                    className="btn-outline min-h-12 rounded-xl"
                  >
                    <IconTraining size={22} strokeWidth={1.7} className="text-brand-700 dark:text-brand-300" />
                    Athlete
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Sign in with your username, e.g. <span className="font-mono">viren</span>
                </p>
              </div>
            )}

            {/* No "join us" on the sign-in screen: this is a closed roster, the
                coach adds athletes. The way back from /signup stays. */}
            {mode === "signup" && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
