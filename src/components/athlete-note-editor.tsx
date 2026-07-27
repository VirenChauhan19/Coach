"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, StickyNote } from "lucide-react";
import { TypeBadge } from "./ui/badges";
import { useDates } from "./time-zone";

type NoteItem = {
  id: string;
  title: string;
  type: string;
  dateISO: string;
  note: string | null;
};

// Coach-only: add/edit the private "note just for you" an athlete sees on a
// specific workout. Lives on the athlete detail page so it's one tap from the
// roster — pick an athlete, jump to the session, type the note.
export function AthleteNoteEditor({
  athleteFirstName,
  upcoming,
  recent,
}: {
  athleteFirstName: string;
  upcoming: NoteItem[];
  recent: NoteItem[];
}) {
  const total = upcoming.length + recent.length;
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-brand-500" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
          Personal notes
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-slate-500">
        Private notes only {athleteFirstName} sees on a session — coaching cues,
        pace tweaks, or a check-in. Tap any workout to add or edit one.
      </p>

      {total === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-paper-200 bg-paper-50 px-4 py-6 text-center text-sm text-slate-400">
          No sessions for {athleteFirstName} to annotate yet.
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {upcoming.length > 0 && (
            <NoteGroup label="Upcoming" items={upcoming} athleteFirstName={athleteFirstName} />
          )}
          {recent.length > 0 && (
            <NoteGroup label="Recent" items={recent} athleteFirstName={athleteFirstName} />
          )}
        </div>
      )}
    </section>
  );
}

function NoteGroup({
  label,
  items,
  athleteFirstName,
}: {
  label: string;
  items: NoteItem[];
  athleteFirstName: string;
}) {
  return (
    <div>
      <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <ul className="divide-y divide-paper-100">
        {items.map((it) => (
          <NoteRow key={it.id} item={it} athleteFirstName={athleteFirstName} />
        ))}
      </ul>
    </div>
  );
}

function NoteRow({
  item,
  athleteFirstName,
}: {
  item: NoteItem;
  athleteFirstName: string;
}) {
  const { smartDayLabel } = useDates();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNote: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Couldn't save the note.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  function cancel() {
    setValue(item.note ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
          <TypeBadge type={item.type} />
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {smartDayLabel(item.dateISO)}
        </span>
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            className="input min-h-[64px] resize-y"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Add a personal note for ${athleteFirstName}…`}
            maxLength={1000}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-gold !px-3 !py-1.5 text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save note
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : item.note ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group mt-2 flex w-full items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-2.5 text-left transition hover:border-brand-300"
        >
          <StickyNote size={13} className="mt-0.5 shrink-0 text-brand-700" />
          <span className="flex-1 text-sm leading-relaxed text-brand-900">{item.note}</span>
          <Pencil size={13} className="mt-0.5 shrink-0 text-brand-600 opacity-60 group-hover:opacity-100" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition hover:gap-2 hover:text-brand-800"
        >
          <Plus size={13} /> Add a personal note
        </button>
      )}
    </li>
  );
}
