import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // bg-paper, not bg-white/70: dark mode is a set of overrides keyed to
        // utility names, and an opacity variant generates a class none of them
        // match — which left this reading as a light grey slab inside a dark
        // card. As a token it is a slightly recessed well in both themes.
        "flex flex-col items-start justify-center rounded-lg border border-dashed border-ink/15 bg-paper px-5 py-8 text-left shadow-sm",
        className
      )}
    >
      {icon && (
        <div className="mb-3 rounded-md bg-ink p-2 text-brand-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
