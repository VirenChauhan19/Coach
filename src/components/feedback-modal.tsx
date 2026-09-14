"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { Modal } from "./ui/modal";
import { Field, FormError } from "./ui/field";
import { cn } from "@/lib/utils";
import type { AssignmentDTO } from "@/lib/dto";

export function FeedbackModal({
  assignment,
  open,
  onClose,
}: {
  assignment: AssignmentDTO;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fb = assignment.feedback;
  const [completed, setCompleted] = useState(fb ? fb.completed : true);
  const [effort, setEffort] = useState<number | null>(fb?.effort ?? null);
  const [feeling, setFeeling] = useState(fb?.feeling ?? "");
  const [soreness, setSoreness] = useState(fb?.soreness ?? "");
  const [notes, setNotes] = useState(fb?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          completed,
          effort,
          feeling,
          soreness,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save your feedback.");
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
      title="How did it go?"
      description={assignment.workout.title}
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save feedback
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <FormError message={error} />}

        <Field label="Did you complete this workout?">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCompleted(true)}
              aria-pressed={completed}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                completed
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <Check size={16} /> Completed
            </button>
            <button
              type="button"
              onClick={() => setCompleted(false)}
              aria-pressed={!completed}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                !completed
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <X size={16} /> Didn&apos;t finish
            </button>
          </div>
        </Field>

        <Field
          label="Effort level (RPE)"
          hint="1 = very easy / 10 = all-out"
        >
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEffort(effort === n ? null : n)}
                aria-pressed={effort === n}
                className={cn(
                  "h-12 min-w-0 rounded-xl text-sm font-semibold transition-colors",
                  effort === n
                    ? "bg-brand-400 text-ink-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field label="How did you feel?">
          <textarea
            className="input min-h-[72px] resize-y"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="Legs felt fresh, breathing controlled..."
          />
        </Field>

        <Field label="Any pain or soreness?">
          <textarea
            className="input min-h-[60px] resize-y"
            value={soreness}
            onChange={(e) => setSoreness(e.target.value)}
            placeholder="Right achilles a little tight, nothing major..."
          />
        </Field>

        <Field label="Notes for your coach" hint="Only your coach can see this.">
          <textarea
            className="input min-h-[60px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Questions, pace thoughts, anything you want to flag..."
          />
        </Field>
      </div>
    </Modal>
  );
}
