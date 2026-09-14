"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "./ui/logo";
import { Field, FormError } from "./ui/field";
import { Loader2 } from "lucide-react";
import { browserTimeZone } from "./time-zone";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function go(payload: {
    email: string;
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
        // Tell the server where we're signing in from, so the schedule renders
        // in this device's days rather than the server's.
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
    go({ email, password, name, inviteCode });
  }

  function demoLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    go({ email: demoEmail, password: "password123" });
  }

  return (
    <div className="flex min-h-app flex-col lg:flex-row">
      {/* Brand / hero panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        {/* uniform stripe down the edge */}
        <span className="absolute inset-y-0 left-0 w-1.5 bg-brand-500" />

        <div className="relative flex items-center gap-3">
          <LogoMark size={44} />
          <div className="leading-none">
            <div className="font-display text-lg font-bold uppercase tracking-wide">
              SCAD Atlanta
            </div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-400">
              Distance
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <div className="eyebrow text-brand-400">Cross Country &amp; Track</div>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight xl:text-6xl">
            The team&apos;s
            <br />
            private
            <br />
            <span className="text-brand-400">training hub.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-300">
            Personalized schedules, a shared calendar, direct messaging, and
            honest post-workout feedback, built for a coach and his runners,
            not a social feed.
          </p>
          <div className="mt-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>Schedules</span>
            <span className="h-1 w-1 rounded-full bg-brand-500" />
            <span>Calendar</span>
            <span className="h-1 w-1 rounded-full bg-brand-500" />
            <span>Feedback</span>
          </div>
        </div>

        <div className="relative flex items-center gap-2.5 text-xs text-slate-500">
          <span className="h-px w-6 bg-slate-700" />
          Private &amp; secure by design.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-paper-50 px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark size={40} />
            <div className="leading-none">
              <div className="font-display text-lg font-bold uppercase tracking-wide text-ink">
                SCAD Atlanta
              </div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Distance
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login"
              ? "Sign in to your team hub."
              : "Join your team's private training hub."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {error && <FormError message={error} />}

            {mode === "signup" && (
              <Field label="Full name" htmlFor="name" required>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Lee"
                  autoComplete="name"
                  required
                />
              </Field>
            )}

            <Field label="Email" htmlFor="email" required>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@scadrunning.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </Field>

            {mode === "signup" && (
              <Field
                label="Invite code"
                htmlFor="inviteCode"
                hint="Only if your coach gave you one. New accounts join as athletes; the coach manages the team."
              >
                <input
                  id="inviteCode"
                  className="input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </Field>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-6">
              <div className="relative my-4 text-center">
                <span className="relative z-10 bg-paper-50 px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Try the demo
                </span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-paper-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => demoLogin("cbenassi@scadxc.com")}
                  disabled={loading}
                  className="btn-outline"
                >
                  Coach demo
                </button>
                <button
                  type="button"
                  onClick={() => demoLogin("viren@scadxc.com")}
                  disabled={loading}
                  className="btn-outline"
                >
                  Athlete demo
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Demo password: <span className="font-mono">password123</span>
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
