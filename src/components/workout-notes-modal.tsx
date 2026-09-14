"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, StickyNote } from "lucide-react";
import { Modal } from "./ui/modal";
import { Avatar } from "./ui/avatar";

export type WorkoutNoteRow = {
  id: string; // assignment id
  athleteId: string;
  name: string;
  note: string | null;
};

// Workout-centric way to add the private per-athlete note: open it on a workout
// and annotate any assigned athlete inline. Same data as the athlete page
// (Assignment.customNote), edit from whichever side is faster.
export function WorkoutNotesModal({
  open,
  onClose,
  workoutTitle,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  workoutTitle: string;
  rows: WorkoutNoteRow[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personal notes"
      description={`Private notes for "${workoutTitle}". Each athlete sees only their own.`}
      size="lg"
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No athletes are assigned to this workout.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <AthleteNoteRow key={r.id} row={r} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

function AthleteNoteRow({ row }: { row: WorkoutNoteRow }) {
  const router = useRouter();
  const [note, setNote] = useState(row.note ?? "");
  const [saved, setSaved] = useState((row.note ?? "").trim());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNote: note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Couldn't save the note.");
        setSaving(false);
        return;
      }
      setSaved(note.trim());
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} seed={row.athleteId} size={30} />
        <span className="flex-1 truncate text-sm font-semibold text-ink">{row.name}</span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-ink"
          >
            {saved ? (
              <>
                <Pencil size={13} /> Edit
              </>
            ) : (
              <>
                <Plus size={13} /> Note
              </>
            )}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            className="input min-h-[60px] resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Personal note for ${row.name.split(" ")[0]}...`}
            maxLength={1000}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(saved);
                setError(null);
                setEditing(false);
              }}
              disabled={saving}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : saved ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 flex w-full items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-left transition-colors hover:border-slate-300"
        >
          <StickyNote size={13} className="mt-0.5 shrink-0 text-slate-500" />
          <span className="flex-1 text-sm leading-relaxed text-slate-700">{saved}</span>
        </button>
      ) : null}
    </li>
  );
}
