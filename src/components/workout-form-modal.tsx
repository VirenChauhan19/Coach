"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, User, Zap } from "lucide-react";
import { Modal } from "./ui/modal";
import { Field, FormError } from "./ui/field";
import { Avatar } from "./ui/avatar";
import { cn } from "@/lib/utils";
import {
  WORKOUT_TYPE_ORDER,
  workoutMeta,
  WORKOUT_PRESETS,
  defaultWorkoutTitle,
} from "@/lib/constants";
import { useDates } from "./time-zone";

export type WorkoutInitial = {
  id: string;
  title: string;
  type: string;
  dateISO: string;
  scope: string;
  distance: string | null;
  pace: string | null;
  warmup: string | null;
  mainSet: string | null;
  cooldown: string | null;
  notes: string | null;
  location: string | null;
  link: string | null;
  athleteIds: string[];
};

export function WorkoutFormModal({
  open,
  onClose,
  athletes,
  initial,
  defaultDateISO,
}: {
  open: boolean;
  onClose: () => void;
  athletes: { id: string; name: string; mileageGroup?: string | null }[];
  initial?: WorkoutInitial;
  defaultDateISO?: string;
}) {
  const { format } = useDates();
  const router = useRouter();
  const editing = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState(initial?.type ?? "EASY");
  const [date, setDate] = useState(
    format(initial?.dateISO ?? defaultDateISO ?? new Date(), "yyyy-MM-dd")
  );
  const [scope, setScope] = useState<"TEAM" | "INDIVIDUAL">(
    (initial?.scope as "TEAM" | "INDIVIDUAL") ?? "TEAM"
  );
  const [selected, setSelected] = useState<string[]>(initial?.athleteIds ?? []);
  const [distance, setDistance] = useState(initial?.distance ?? "");
  const [pace, setPace] = useState(initial?.pace ?? "");
  const [warmup, setWarmup] = useState(initial?.warmup ?? "");
  const [mainSet, setMainSet] = useState(initial?.mainSet ?? "");
  const [cooldown, setCooldown] = useState(initial?.cooldown ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // Mileage groups (A/B/C) on the roster, for one-tap "assign to a group".
  const groups = useMemo(
    () =>
      Array.from(
        new Set(athletes.map((a) => a.mileageGroup).filter(Boolean) as string[])
      ).sort(),
    [athletes]
  );
  const groupIds = (g: string) =>
    athletes.filter((a) => a.mileageGroup === g).map((a) => a.id);
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  function selectGroup(g: string) {
    setScope("INDIVIDUAL");
    setSelected(groupIds(g));
  }

  // One-tap quick-add: drop in sensible defaults for a routine session. The
  // coach can still tweak any field (or the date / who it's for) before saving.
  function applyPreset(p: (typeof WORKOUT_PRESETS)[number]) {
    setType(p.type);
    setTitle(p.title);
    setDistance(p.distance ?? "");
    setPace(p.pace ?? "");
    setMainSet(p.mainSet ?? "");
    setError(null);
  }

  async function save() {
    // Title is optional: the server fills it from the workout type if blank.
    if (scope === "INDIVIDUAL" && selected.length === 0) {
      setError("Select at least one athlete, or assign to the whole team.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title,
      type,
      date,
      scope,
      athleteIds: scope === "INDIVIDUAL" ? selected : undefined,
      distance,
      pace,
      warmup,
      mainSet,
      cooldown,
      location,
      link,
      notes,
    };
    try {
      const res = await fetch(
        editing ? `/api/workouts/${initial!.id}` : "/api/workouts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the workout.");
        setSaving(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit workout" : "New workout"}
      description={
        editing
          ? "Update the session details."
          : "Build a session and assign it to the whole team, a training group, or individual athletes."
      }
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-gold" onClick={save} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? "Save changes" : "Create workout"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <FormError message={error} />}

        {!editing && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Zap size={14} className="text-brand-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Quick add
              </span>
              <span className="text-xs text-slate-400">Tap one to prefill, then Create</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 stagger">
              {WORKOUT_PRESETS.map((p) => {
                const meta = workoutMeta(p.type);
                const active = type === p.type && title === p.title;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                      active
                        ? "border-brand-400 bg-brand-50 text-ink ring-1 ring-brand-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 h-px bg-slate-100" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Title"
            hint="Optional. Defaults to the workout type."
            className="sm:col-span-2"
          >
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultWorkoutTitle(type)}
            />
          </Field>
          <Field label="Date" required>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Type">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {WORKOUT_TYPE_ORDER.map((t) => {
              const meta = workoutMeta(t);
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  {meta.short}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Distance">
            <input
              className="input"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 6 mi"
            />
          </Field>
          <Field label="Pace / effort">
            <input
              className="input"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="e.g. Conversational (~7:45/mi)"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <Field label="Warm-up">
            <textarea
              className="input min-h-[52px] resize-y"
              value={warmup}
              onChange={(e) => setWarmup(e.target.value)}
              placeholder="2 mi easy + drills + 4 strides"
            />
          </Field>
          <Field label="Main set">
            <textarea
              className="input min-h-[60px] resize-y"
              value={mainSet}
              onChange={(e) => setMainSet(e.target.value)}
              placeholder="6 x 800m @ 5K effort, 2:00 jog recovery"
            />
          </Field>
          <Field label="Cool-down">
            <textarea
              className="input min-h-[52px] resize-y"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              placeholder="1.5 mi easy"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Location">
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Piedmont Park track"
            />
          </Field>
          <Field label="Attachment / link">
            <input
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            className="input min-h-[52px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the athletes should know..."
          />
        </Field>

        <Field label="Assign to">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScope("TEAM")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                scope === "TEAM"
                  ? "border-ink bg-ink text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <Users size={16} /> Whole team
            </button>
            {groups.map((g) => {
              const on = scope === "INDIVIDUAL" && sameSet(selected, groupIds(g));
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => selectGroup(g)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                    on
                      ? "border-brand-500 bg-brand-50 text-ink ring-1 ring-brand-300"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Group {g}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setScope("INDIVIDUAL")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                scope === "INDIVIDUAL" &&
                  !groups.some((g) => sameSet(selected, groupIds(g)))
                  ? "border-ink bg-ink text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <User size={16} /> Pick athletes
            </button>
          </div>
        </Field>

        {scope === "INDIVIDUAL" && (
          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {selected.length} selected
              </span>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  className="text-brand-700 hover:underline"
                  onClick={() => setSelected(athletes.map((a) => a.id))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:underline"
                  onClick={() => setSelected([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto scroll-thin p-2">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {athletes.map((a) => {
                  const on = selected.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition",
                        on ? "bg-brand-50 ring-1 ring-brand-300" : "hover:bg-slate-50"
                      )}
                    >
                      <Avatar name={a.name} seed={a.id} size={26} />
                      <span className="flex-1 truncate text-slate-700">{a.name}</span>
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          on
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-slate-300"
                        )}
                      >
                        {on && <span className="text-[10px]">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
