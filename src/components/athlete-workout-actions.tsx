"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  SkipForward,
  MessageCircleQuestion,
  Loader2,
  PencilLine,
} from "lucide-react";
import { FeedbackModal } from "./feedback-modal";
import { cn } from "@/lib/utils";
import type { AssignmentDTO } from "@/lib/dto";

const QUICK = [
  {
    status: "COMPLETED",
    label: "Completed",
    icon: Check,
    active: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    status: "SKIPPED",
    label: "Skipped",
    icon: SkipForward,
    active: "border-amber-500 bg-amber-50 text-amber-700",
  },
  {
    status: "NEEDS_DISCUSSION",
    label: "Need to discuss",
    icon: MessageCircleQuestion,
    active: "border-rose-500 bg-rose-50 text-rose-700",
  },
] as const;

export function AthleteWorkoutActions({
  assignment,
}: {
  assignment: AssignmentDTO;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isRest = assignment.workout.type === "REST";
  const status = assignment.status;
  const fb = assignment.feedback;

  async function setStatus(s: string) {
    setBusy(s);
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (isRest) {
    return (
      <p className="text-sm text-slate-500">
        Rest day. No need to check in. Recovery is part of the plan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {QUICK.map((q) => {
          const Icon = q.icon;
          const selected = status === q.status;
          return (
            <button
              key={q.status}
              type="button"
              onClick={() => setStatus(q.status)}
              disabled={busy !== null}
              aria-pressed={selected}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60 sm:min-h-11",
                q.status === "COMPLETED" && "col-span-2",
                selected
                  ? q.active
                  : q.status === "COMPLETED"
                    ? "border-[#1c2027] bg-[#1c2027] text-white hover:bg-ink-700"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {busy === q.status ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Icon size={18} aria-hidden="true" />
              )}
              {q.status === "COMPLETED" && !selected ? "Mark complete" : q.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink sm:w-auto sm:justify-start"
      >
        <PencilLine size={18} aria-hidden="true" />
        {fb ? "Edit your workout feedback" : "How did it feel? Add feedback"}
      </button>

      {fb && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
            {fb.effort != null && (
              <span>
                <span className="font-semibold text-ink">Effort:</span> {fb.effort}/10
              </span>
            )}
            <span>
              <span className="font-semibold text-ink">Done:</span>{" "}
              {fb.completed ? "Yes" : "No"}
            </span>
          </div>
          {fb.feeling && <p className="mt-1.5 text-slate-700">&quot;{fb.feeling}&quot;</p>}
          {fb.soreness && (
            <p className="mt-1 text-slate-500">Soreness: {fb.soreness}</p>
          )}
        </div>
      )}

      <FeedbackModal
        assignment={assignment}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
