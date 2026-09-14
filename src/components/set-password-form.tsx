"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { LogoMark } from "./ui/logo";
import { Field, FormError } from "./ui/field";
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
    <div className="flex min-h-app items-start justify-center bg-paper px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:items-center sm:py-10">
      <div className="w-full max-w-[440px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <div className="mb-7 flex items-center gap-3">
          <LogoMark size={44} className="rounded-xl" />
          <div className="leading-tight">
            <div className="text-base font-semibold text-ink">SCAD Atlanta</div>
            <div className="text-sm text-slate-500">Distance team</div>
          </div>
        </div>

        <div className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">One last step</div>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.04em] text-ink">
          Set your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Welcome, {firstName}. Choose a password only you know.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <FormError message={error} />}

          <Field label="New password" htmlFor="new-password" required>
            <div className="relative">
              <input
                id="new-password"
                type={show ? "text" : "password"}
                className="input min-h-12 rounded-xl pr-12"
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
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
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
              className="input min-h-12 rounded-xl"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </Field>

          <ul className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
            <Requirement met={longEnough}>At least 8 characters</Requirement>
            <Requirement met={matches}>Both passwords match</Requirement>
          </ul>

          <button
            type="submit"
            className="btn-primary min-h-12 w-full rounded-xl font-semibold"
            disabled={loading || !longEnough || !matches}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Set password and continue
          </button>
        </form>
      </div>
    </div>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={"flex items-center gap-2 " + (met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")}>
      <Check size={13} className={met ? "opacity-100" : "opacity-40"} />
      {children}
    </li>
  );
}
