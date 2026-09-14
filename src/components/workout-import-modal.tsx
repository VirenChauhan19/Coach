"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import type { ImportMode, ImportResolution, ImportResolutions, WeekImportPreview, WeekImportResult } from "@/lib/workout-import-types";
import { workoutInstantForDay } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";
import { Modal } from "./ui/modal";
import { TypeBadge } from "./ui/badges";
import { IconCalendar, IconTeam, IconTraining } from "./ui/icons";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function isMonday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = workoutInstantForDay(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 1;
}

export function WorkoutImportModal({ open, onClose, nowISO }: {
  open: boolean;
  onClose: () => void;
  nowISO: string;
}) {
  const router = useRouter();
  const { format, weekStart: startOfWeek } = useDates();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [weekStart, setWeekStart] = useState(() => format(startOfWeek(nowISO), "yyyy-MM-dd"));
  const [mode, setMode] = useState<ImportMode>("add");
  const [resolutions, setResolutions] = useState<ImportResolutions>({});
  const [preview, setPreview] = useState<WeekImportPreview | null>(null);
  // Keep the match controls available while an edited preview needs rechecking.
  const [matchContext, setMatchContext] = useState<WeekImportPreview | null>(null);
  const [result, setResult] = useState<WeekImportResult | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [activity, setActivity] = useState<"preview" | "commit" | null>(null);
  const [dragging, setDragging] = useState(false);
  const activityRef = useRef<typeof activity>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const reviewedResolutions = useRef<ImportResolutions>({});
  const mounted = useRef(true);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (preview || result) summaryRef.current?.focus({ preventScroll: false });
  }, [preview, result]);

  const committing = activity === "commit";
  const allUnchanged = Boolean(preview && preview.errors.length === 0 && preview.summary.assignments === 0 && preview.summary.replacing === 0 && preview.summary.unchanged > 0);
  const canPublish = Boolean(preview?.canImport && preview.errors.length === 0 && !allUnchanged);
  const days = useMemo(() => {
    const grouped = new Map<string, WeekImportPreview["workouts"]>();
    for (const workout of preview?.workouts ?? []) {
      grouped.set(workout.date, [...(grouped.get(workout.date) ?? []), workout]);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [preview]);

  function invalidate() {
    if (activityRef.current === "commit") return;
    requestId.current += 1;
    controller.current?.abort();
    controller.current = null;
    activityRef.current = null;
    setActivity(null);
    setPreview(null);
    setIssue(null);
  }

  function close() {
    if (activityRef.current === "commit") return;
    invalidate();
    onClose();
  }

  function chooseFile(next: File | undefined) {
    if (!next || activityRef.current === "commit") return;
    invalidate();
    setMatchContext(null);
    setResolutions({});
    reviewedResolutions.current = {};
    setFile(null);
    if (!next.name.toLowerCase().endsWith(".xlsx")) {
      setIssue("Choose an Excel workbook ending in .xlsx.");
    } else if (next.size > MAX_FILE_SIZE) {
      setIssue("This workbook is too large. Choose an .xlsx file up to 2 MB.");
    } else if (next.size === 0) {
      setIssue("This file is empty. Choose the saved weekly workbook.");
    } else {
      setFile(next);
    }
  }

  function resolve(key: string, change: Partial<ImportResolution>) {
    if (activityRef.current === "commit") return;
    invalidate();
    setResolutions((current) => ({ ...current, [key]: { ...current[key], ...change } }));
  }

  async function submit(action: "preview" | "commit") {
    if (activityRef.current || !file) return;
    if (!isMonday(weekStart)) {
      setIssue("Choose the Monday that starts this training week.");
      return;
    }
    if (action === "commit" && (!preview || !canPublish)) return;

    const thisRequest = ++requestId.current;
    controller.current?.abort();
    const abort = action === "preview" ? new AbortController() : null;
    controller.current = abort;
    activityRef.current = action;
    setActivity(action);
    setIssue(null);
    const body = new FormData();
    body.set("file", file);
    body.set("weekStart", weekStart);
    body.set("mode", mode);
    body.set("resolutions", JSON.stringify(resolutions));
    body.set("action", action);
    if (action === "commit" && preview) body.set("previewToken", preview.previewToken);

    try {
      const response = await fetch("/api/workouts/import", { method: "POST", body, signal: abort?.signal });
      const payload = await response.json() as WeekImportPreview | WeekImportResult | { error: string };
      if (!mounted.current || thisRequest !== requestId.current) return;
      if (!response.ok) {
        if (response.status === 409) setPreview(null);
        throw new Error("error" in payload ? payload.error : "The workbook could not be processed. Please try again.");
      }
      if (action === "preview" && "previewToken" in payload) {
        reviewedResolutions.current = resolutions;
        setPreview(payload);
        setMatchContext(payload);
      } else if (action === "commit" && "imported" in payload && payload.imported) {
        setResult(payload);
        router.refresh();
      } else {
        throw new Error("The server returned an incomplete response. Review the workbook again.");
      }
    } catch (error) {
      if (!mounted.current || thisRequest !== requestId.current || abort?.signal.aborted) return;
      setIssue(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      if (mounted.current && thisRequest === requestId.current) {
        activityRef.current = null;
        controller.current = null;
        setActivity(null);
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={result ? "Your week is ready" : "Import a training week"}
      description={result ? "The plan is now available to your athletes." : "Bring your weekly Excel plan into the team schedule."}
      size="xl"
      footer={result ? (
        <>
          <button className="btn-ghost" onClick={close}>Close</button>
          <button className="btn-primary min-h-12 flex-1 sm:flex-none" onClick={() => { close(); router.push("/workouts"); router.refresh(); }}>
            View training <ArrowRight size={17} />
          </button>
        </>
      ) : (
        <>
          <p className="w-full text-xs text-slate-500" aria-live="polite">
            {committing ? "Publishing your week. Keep this window open." : preview ? allUnchanged ? "These assignments are already on the schedule." : "Review the athletes and sessions before publishing." : "Your schedule stays unchanged until you publish."}
          </p>
          <button className="btn-ghost" onClick={close} disabled={committing}>Cancel</button>
          <button
            className="btn-primary min-h-12 flex-1 sm:flex-none"
            disabled={Boolean(activity) || !file || !isMonday(weekStart) || (Boolean(preview) && !canPublish)}
            onClick={() => submit(preview ? "commit" : "preview")}
          >
            {activity ? <Loader2 size={17} className="animate-spin" /> : preview ? <Check size={17} /> : <IconTraining size={19} />}
            {committing ? "Publishing…" : activity === "preview" ? "Reviewing…" : allUnchanged ? "Already scheduled" : preview ? preview.errors.length > 0 ? "Resolve issues to publish" : "Publish week" : "Review changes"}
          </button>
        </>
      )}
    >
      {result ? (
        <div ref={summaryRef} tabIndex={-1} className="py-5 outline-none">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><CheckCircle2 size={25} strokeWidth={1.7} /></span>
          <h3 className="text-2xl font-semibold tracking-tight text-ink">Week of {format(workoutInstantForDay(result.weekStart), "MMM d")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.workouts} sessions created, with {result.assignments} athlete assignments.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-semibold text-ink">{result.unchanged}</p><p className="mt-1 text-xs text-slate-500">Already scheduled</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-semibold text-ink">{result.replaced}</p><p className="mt-1 text-xs text-slate-500">Unlogged assignments replaced</p></div>
          </div>
        </div>
      ) : (
        <div className="space-y-5" aria-busy={Boolean(activity)}>
          <fieldset disabled={committing} className="min-w-0 space-y-4 disabled:opacity-70">
            <legend className="sr-only">Workbook and import options</legend>
            <div
              onDragOver={(event) => { event.preventDefault(); if (!committing) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (committing) return;
                if (event.dataTransfer.files.length !== 1) {
                  invalidate();
                  setFile(null);
                  setMatchContext(null);
                  setResolutions({});
                  reviewedResolutions.current = {};
                  setIssue("Choose one weekly workbook at a time.");
                  return;
                }
                chooseFile(event.dataTransfer.files[0]);
              }}
            >
              <input id={`${id}-file`} className="peer sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
              <label htmlFor={`${id}-file`} className={cn("flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400", dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50 hover:border-brand-300")}>
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">{file ? <FileSpreadsheet size={22} strokeWidth={1.7} /> : <Upload size={22} strokeWidth={1.7} />}</span>
                <span className="max-w-full break-words text-sm font-semibold text-ink">{file ? file.name : "Choose your weekly workbook"}</span>
                <span className="mt-1 text-xs leading-relaxed text-slate-500">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · Tap to choose a different file` : "Tap to browse or drop an .xlsx file here · Up to 2 MB"}</span>
              </label>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Use your weekly workbook with the Training and Pace Chart tabs.</p>
            </div>

            <div>
              <label className="label" htmlFor={`${id}-week`}>Week starts on Monday</label>
              <input id={`${id}-week`} className="input max-w-full sm:max-w-xs" type="date" value={weekStart} aria-describedby={`${id}-week-hint`} aria-invalid={!isMonday(weekStart)} onChange={(event) => { invalidate(); setWeekStart(event.target.value); }} />
              <p id={`${id}-week-hint`} className={cn("mt-1.5 text-xs", isMonday(weekStart) ? "text-slate-500" : "text-rose-600")}>Choose the Monday for the week you want to schedule.</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="label">How should this plan be added?</legend>
              {([{ value: "add", label: "Add sessions", help: "Add new assignments and leave the current schedule in place." }, { value: "replace", label: "Replace unlogged sessions", help: "Replace only the days and athletes in this file. Logged records are protected; conflicting logs will block replacement." }] as const).map((option) => (
                <label key={option.value} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-3.5", mode === option.value ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white")}>
                  <input className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500" type="radio" name={`${id}-mode`} value={option.value} checked={mode === option.value} onChange={() => { invalidate(); setMode(option.value); }} />
                  <span><span className="block text-sm font-semibold text-ink">{option.label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.help}</span></span>
                </label>
              ))}
            </fieldset>
          </fieldset>

          {issue && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p className="min-w-0 break-words">{issue}</p></div>}

          {preview && (
            <div ref={summaryRef} tabIndex={-1} className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 outline-none">
              <div className="flex items-start gap-3">
                <IconCalendar size={23} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">{format(workoutInstantForDay(preview.weekStart), "MMM d")} – {format(workoutInstantForDay(preview.weekEnd), "MMM d, yyyy")}</h3>
                  <p className="mt-1 break-words text-xs text-slate-500">File week: {preview.sourceWeekLabel || "Not labeled"}</p>
                  {preview.theme && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{preview.theme}</p>}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[["Athletes", preview.summary.athletes], ["Sessions", preview.summary.workouts], ["New assignments", preview.summary.assignments], ["Unchanged", preview.summary.unchanged], ["Replacing", preview.summary.replacing]].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white p-3 last:col-span-2 sm:last:col-span-1"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-xl font-semibold text-ink">{value}</dd></div>
                ))}
              </dl>
            </div>
          )}

          {preview && preview.errors.length > 0 && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <h3 className="text-sm font-semibold text-rose-700">Resolve these before publishing</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-rose-700">{preview.errors.map((error, index) => <li key={index} className="break-words">{error}</li>)}</ul>
            </div>
          )}
          {preview && preview.warnings.length > 0 && (
            <details className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{preview.warnings.length} notes about this workbook</summary>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">{preview.warnings.map((warning, index) => <li key={index} className="break-words">{warning}</li>)}</ul>
            </details>
          )}

          {matchContext && (
            <section className="space-y-3" aria-labelledby={`${id}-athletes`}>
              <div className="flex items-center gap-2"><IconTeam size={21} className="text-brand-700 dark:text-brand-300" /><h3 id={`${id}-athletes`} className="font-semibold text-ink">Match athletes</h3><span className="ml-auto text-xs text-slate-500">{matchContext.athletes.length} in file</span></div>
              <p className="text-xs leading-relaxed text-slate-500">Check each name against your roster. Choose groups for TBD entries, or skip an athlete for this import.</p>
              {!preview && <p role="status" className="rounded-xl bg-brand-50 p-3 text-xs font-medium text-brand-700">Your changes need review. Select Review changes when you are ready.</p>}
              <fieldset disabled={committing} className="min-w-0 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
                <legend className="sr-only">Athlete matches and group choices</legend>
                {matchContext.athletes.map((match, index) => {
                  const override = resolutions[match.key] ?? {};
                  const athleteId = override.athleteId ?? match.athleteId;
                  const athlete = matchContext.roster.find((person) => person.id === athleteId);
                  const skipped = override.skip ?? match.status === "skipped";
                  const volume = override.volumeGroup ?? match.volumeGroup;
                  const workoutGroup = override.workoutGroup ?? match.workoutGroup;
                  const choicesChanged = JSON.stringify(override) !== JSON.stringify(reviewedResolutions.current[match.key] ?? {});
                  const serverNeedsAttention = !choicesChanged && (match.status === "unmatched" || match.status === "needs_group");
                  const needsGroup = !volume || !matchContext.groups.includes(volume) || Boolean(workoutGroup && !matchContext.groups.includes(workoutGroup));
                  const needsFix = !skipped && (!athlete || needsGroup || serverNeedsAttention);
                  const status = skipped ? "Skipped" : !athlete ? "Match athlete" : needsGroup ? "Choose groups" : serverNeedsAttention ? "Needs attention" : "Matched";
                  const rowId = `${id}-athlete-${index}`;
                  return (
                    <details key={match.key} open={needsFix} className="group bg-white p-3.5">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-ink">{match.sourceName}</span><span className="mt-0.5 block break-words text-xs text-slate-500">{skipped ? "Not included in this week" : athlete?.name ?? match.athleteName ?? "Choose an athlete from your roster"}</span>{!skipped && volume && <span className="mt-1 block text-[11px] text-slate-500">Volume {volume}{workoutGroup && workoutGroup !== volume ? ` · Workout ${workoutGroup}` : ""}</span>}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold", skipped ? "bg-slate-100 text-slate-500" : needsFix ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700")}>{status}</span>
                        <ChevronDown size={15} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600" htmlFor={`${rowId}-skip`}><input id={`${rowId}-skip`} type="checkbox" checked={skipped} className="h-4 w-4 accent-brand-500" onChange={(event) => resolve(match.key, { skip: event.target.checked })} />Skip this athlete</label>
                        <div className={cn("grid min-w-0 gap-3 sm:grid-cols-2", skipped && "opacity-50")}>
                          <div className="min-w-0 sm:col-span-2"><label className="label" htmlFor={`${rowId}-person`}>Roster athlete</label><select id={`${rowId}-person`} className="input" disabled={skipped} value={override.athleteId ?? match.athleteId ?? ""} onChange={(event) => resolve(match.key, { athleteId: event.target.value || undefined })}><option value="">Choose an athlete</option>{matchContext.roster.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
                          <div className="min-w-0"><label className="label" htmlFor={`${rowId}-volume`}>Volume group</label><select id={`${rowId}-volume`} className="input" disabled={skipped} value={override.volumeGroup ?? ""} onChange={(event) => resolve(match.key, { volumeGroup: event.target.value || undefined })}><option value="">Use workbook group</option>{matchContext.groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
                          <div className="min-w-0"><label className="label" htmlFor={`${rowId}-workout`}>Workout group</label><select id={`${rowId}-workout`} className="input" disabled={skipped} value={override.workoutGroup === undefined ? "__workbook" : override.workoutGroup} onChange={(event) => resolve(match.key, { workoutGroup: event.target.value === "__workbook" ? undefined : event.target.value })}><option value="__workbook">Use workbook group</option><option value="">Use volume group</option>{matchContext.groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
                        </div>
                        {match.message && !skipped && (preview || serverNeedsAttention) && <p className="text-xs leading-relaxed text-slate-500">{match.message}</p>}
                      </div>
                    </details>
                  );
                })}
              </fieldset>
            </section>
          )}

          {preview && days.length > 0 && (
            <section className="space-y-3" aria-labelledby={`${id}-sessions`}>
              <div className="flex items-center gap-2"><IconTraining size={21} className="text-brand-700 dark:text-brand-300" /><h3 id={`${id}-sessions`} className="font-semibold text-ink">The week, day by day</h3></div>
              {days.map(([date, workouts], dayIndex) => (
                <details key={date} open={dayIndex === 0} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 bg-slate-50 px-4 py-3 [&::-webkit-details-marker]:hidden"><span className="text-sm font-semibold text-ink">{format(workoutInstantForDay(date), "EEEE, MMM d")}</span><span className="ml-auto text-xs text-slate-500">{workouts.length} {workouts.length === 1 ? "session" : "sessions"}</span><ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" /></summary>
                  <div className="divide-y divide-slate-200">
                    {workouts.map((workout) => (
                      <article key={workout.key} className="min-w-0 space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2"><h4 className="min-w-0 break-words text-sm font-semibold text-ink">{workout.title}</h4><TypeBadge type={workout.type} /></div>
                        <p className="break-words text-xs leading-relaxed text-slate-500">{workout.groups.length > 0 && `Group ${workout.groups.join(" / ")} · `}{workout.athleteNames.join(", ")}</p>
                        {(workout.distance || workout.pace || workout.location) && <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{[workout.distance, workout.pace, workout.location].filter(Boolean).join(" · ")}</p>}
                        {[["Warm-up", workout.warmup], ["Main set", workout.mainSet], ["Cool-down", workout.cooldown], ["Notes", workout.notes], ["Link", workout.link]].filter(([, value]) => value).map(([label, value]) => <div key={label}><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{value}</p></div>)}
                        {workout.newAthleteNames.length > 0 && <p className="break-words text-xs leading-relaxed text-emerald-700">New for {workout.newAthleteNames.join(", ")}</p>}
                        {workout.unchangedAthleteNames.length > 0 && <p className="break-words text-xs leading-relaxed text-slate-500">Already scheduled: {workout.unchangedAthleteNames.join(", ")}</p>}
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
