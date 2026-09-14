"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const attachDialog = useCallback((node: HTMLDivElement | null) => {
    dialogRef.current = node;
    if (node) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      node.focus({ preventScroll: true });
    }
  }, []);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]'
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (!dialogRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          role="dialog"
          ref={attachDialog}
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-lift outline-none animate-sheet-up sm:rounded-2xl sm:pb-0 sm:animate-pop",
            SIZES[size]
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                {title && (
                  <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className="mt-0.5 text-sm text-slate-500">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-ink/5 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-paper-50 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
