"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "./ui/logo";
import { Field, FormError } from "./ui/field";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { browserTimeZone } from "./time-zone";

export function SetPasswordForm({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.trim().split(/\s+/)[0] || name;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const longEnough = password.length >= 8;
  const matches = confirm.length > 0 && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!longEnough) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: password,
          confirmPassword: confirm,
          timeZone: browserTimeZone(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not set your password. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-app items-center justify-center bg-paper-50 px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
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

        <div className="eyebrow text-brand-600">One last step</div>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-ink">
          Set your password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Welcome, {firstName}. Choose a password only you know to finish setting
          up your account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <FormError message={error} />}

          <Field label="New password" htmlFor="new-password" required>
            <div className="relative">
              <input
                id="new-password"
                type={show ? "text" : "password"}
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="confirm-password" required>
            <input
              id="confirm-password"
              type={show ? "text" : "password"}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </Field>

          <ul className="space-y-1 text-xs">
            <Requirement met={longEnough}>At least 8 characters</Requirement>
            <Requirement met={matches}>Both passwords match</Requirement>
          </ul>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !longEnough || !matches}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Set password &amp; continue
          </button>
        </form>
      </div>
    </div>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={
        "flex items-center gap-1.5 " + (met ? "text-emerald-600" : "text-slate-400")
      }
    >
      <Check size={13} className={met ? "opacity-100" : "opacity-40"} />
      {children}
    </li>
  );
}
