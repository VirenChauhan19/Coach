import { cn } from "@/lib/utils";

// The official SCAD Bees mark (served from /public). Rendered on a clean white
// badge so the full-color bee keeps its contrast on both the dark sidebar/hero
// and light backgrounds.
export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="SCAD Bees"
      className={cn(
        "inline-block shrink-0 rounded-full ring-1 ring-black/[0.06]",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: "#FFFFFF",
        backgroundImage: "url(/scad-bees.png)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "80%",
      }}
    />
  );
}

export function Wordmark({
  className,
  subtitle = true,
}: {
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">
          SCAD Atlanta
        </div>
        {subtitle && (
          <div className="text-xs font-medium text-brand-400">
            Distance team
          </div>
        )}
      </div>
    </div>
  );
}
