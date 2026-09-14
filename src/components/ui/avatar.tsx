import { cn, initials } from "@/lib/utils";

const tones = [
  { background: "#E7ECE6", foreground: "#435A46" },
  { background: "#E4EAF0", foreground: "#455C71" },
  { background: "#F0E7DB", foreground: "#755737" },
  { background: "#EDE7F1", foreground: "#635274" },
  { background: "#F2E4DF", foreground: "#865B4E" },
  { background: "#E1ECE9", foreground: "#38665E" },
];

function avatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return tones[Math.abs(hash) % tones.length];
}

export function Avatar({
  name,
  seed,
  size = 40,
  className,
  ring = false,
}: {
  name: string;
  seed?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const tone = avatarTone(seed ?? name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-semibold leading-none tracking-[-0.025em] shadow-[inset_0_0_0_1px_rgba(28,32,39,0.04)]",
        ring && "ring-2 ring-white dark:ring-ink-800",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: tone.background,
        color: tone.foreground,
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
