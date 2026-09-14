"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Field, FormError } from "./ui/field";
import { Avatar } from "./ui/avatar";

type SettingsUser = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  phone: string | null;
  hometown: string | null;
  gradYear: number | null;
  events: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  bio: string | null;
  mileageGroup: string | null;
};

export function SettingsForm({
  user,
  teamName,
  season,
}: {
  user: SettingsUser;
  teamName: string;
  season: string | null;
}) {
  const router = useRouter();
  const isCoach = user.role === "COACH";

  const [profile, setProfile] = useState({
    name: user.name,
    username: user.username ?? "",
    phone: user.phone ?? "",
    hometown: user.hometown ?? "",
    gradYear: user.gradYear ? String(user.gradYear) : "",
    events: user.events ?? "",
    emergencyName: user.emergencyName ?? "",
    emergencyPhone: user.emergencyPhone ?? "",
    bio: user.bio ?? "",
  });
  const [pErr, setPErr] = useState<string | null>(null);
  const [pOk, setPOk] = useState(false);
  const [pSaving, setPSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function set<K extends keyof typeof profile>(k: K, v: string) {
    setProfile((p) => ({ ...p, [k]: v }));
    setPOk(false);
  }

  async function saveProfile() {
    setPSaving(true);
    setPErr(null);
    setPOk(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setPErr(data.error ?? "Could not save.");
      } else {
        setPOk(true);
        router.refresh();
      }
    } catch {
      setPErr("Network error.");
    } finally {
      setPSaving(false);
    }
  }

  async function savePassword() {
    setPwErr(null);
    setPwOk(false);
    if (pw.newPassword !== pw.confirm) {
      setPwErr("New passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwErr(data.error ?? "Could not update password.");
      } else {
        setPwOk(true);
        setPw({ currentPassword: "", newPassword: "", confirm: "" });
      }
    } catch {
      setPwErr("Network error.");
    } finally {
      setPwSaving(false);
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      router.push("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* profile */}
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={user.name} seed={user.id} size={48} />
            <div>
              <h2 className="text-sm font-semibold text-ink">Profile</h2>
              <p className="text-xs text-slate-500">
                Update your personal details.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {pErr && <FormError message={pErr} />}
            {pOk && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Check size={15} /> Profile saved.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className="input" value={profile.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Username" hint="What you sign in with.">
                <input
                  className="input"
                  value={profile.username}
                  onChange={(e) => set("username", e.target.value.toLowerCase().trim())}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>
              <Field label="Phone">
                <input className="input" value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Hometown">
                <input className="input" value={profile.hometown} onChange={(e) => set("hometown", e.target.value)} />
              </Field>
              {!isCoach && (
                <>
                  <Field label="Graduation year">
                    <input className="input" inputMode="numeric" value={profile.gradYear} onChange={(e) => set("gradYear", e.target.value)} />
                  </Field>
                  <Field label="Events">
                    <input className="input" value={profile.events} onChange={(e) => set("events", e.target.value)} placeholder="5000m, 10000m" />
                  </Field>
                  <Field label="Emergency contact">
                    <input className="input" value={profile.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
                  </Field>
                  <Field label="Emergency phone">
                    <input className="input" value={profile.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
                  </Field>
                </>
              )}
            </div>
            <Field label={isCoach ? "About" : "Notes"}>
              <textarea className="input min-h-[60px] resize-y" value={profile.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={saveProfile} disabled={pSaving}>
                {pSaving && <Loader2 size={16} className="animate-spin" />}
                Save profile
              </button>
            </div>
          </div>
        </section>

        {/* password */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Password</h2>
          <p className="text-xs text-slate-500">Change your account password.</p>
          <div className="mt-4 space-y-4">
            {pwErr && <FormError message={pwErr} />}
            {pwOk && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Check size={15} /> Password updated.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Current">
                <input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
              </Field>
              <Field label="New" hint="Min. 8 characters">
                <input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
              </Field>
              <Field label="Confirm new">
                <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={savePassword} disabled={pwSaving}>
                {pwSaving && <Loader2 size={16} className="animate-spin" />}
                Update password
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* account info */}
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink">Account</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-ink">
                {isCoach ? "Coach / Admin" : "Athlete"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Team</dt>
              <dd className="font-medium text-ink">{teamName}</dd>
            </div>
            {!isCoach && user.mileageGroup && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Mileage group</dt>
                <dd className="font-medium text-ink">Group {user.mileageGroup}</dd>
              </div>
            )}
            {season && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Season</dt>
                <dd className="font-medium text-ink">{season}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <button
              onClick={signOutEverywhere}
              disabled={signingOut}
              className="btn-outline w-full"
            >
              {signingOut && <Loader2 size={16} className="animate-spin" />}
              Sign out of all devices
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Ends every active session, including this one.
            </p>
          </div>
        </section>

        <section className="card bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Privacy</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your post-workout feedback and soreness notes are private. Only your
            coach can see your feedback, never other athletes.
          </p>
        </section>
      </div>
    </div>
  );
}
