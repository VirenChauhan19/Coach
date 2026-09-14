"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          className="absolute inset-0 animate-fade-in bg-ink/65 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink/10 bg-white shadow-[0_24px_80px_-30px_rgb(19_23_31_/_0.75)] animate-sheet-up sm:rounded-lg sm:animate-pop",
            SIZES[size]
          )}
        >
          {/* grab handle, bottom-sheet affordance on mobile */}
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 bg-paper-50 px-5 py-4">
              <div>
                {title && (
                  <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="-mr-1 rounded-md p-1.5 text-slate-400 transition hover:bg-ink/5 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-ink/10 bg-paper-50 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
