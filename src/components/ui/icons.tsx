import type { AriaAttributes, ReactNode } from "react";

/** A shared, softly filled icon family for the athlete's daily routine. */
export type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Supplying a title makes an icon accessible when it stands alone. */
  title?: string;
  "aria-hidden"?: AriaAttributes["aria-hidden"];
};

function Icon({
  size = 24,
  strokeWidth = 1.7,
  className,
  title,
  "aria-hidden": ariaHidden,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={ariaHidden ?? (title ? undefined : true)}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** A rising sun marks the start of the training day. */
export function IconToday(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M6.5 15.5a5.5 5.5 0 0 1 11 0"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 3.5v2.25M4.75 6.75l1.6 1.6M19.25 6.75l-1.6 1.6M2.75 15.5h18.5M6.5 19.5h11" />
    </Icon>
  );
}

/** A pocket planner with a simple, legible four-day grid. */
export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="5" width="17.5" height="15.75" rx="3.25" fill="currentColor" fillOpacity="0.12" />
      <path d="M3.5 9.5h17M8 3.25v3.5M16 3.25v3.5" />
      <g fill="currentColor" stroke="none">
        <rect x="7.5" y="12.5" width="2.5" height="2.5" rx="0.75" />
        <rect x="14" y="12.5" width="2.5" height="2.5" rx="0.75" fillOpacity="0.55" />
        <rect x="7.5" y="16.5" width="2.5" height="2.5" rx="0.75" fillOpacity="0.55" />
        <rect x="14" y="16.5" width="2.5" height="2.5" rx="0.75" fillOpacity="0.55" />
      </g>
    </Icon>
  );
}

/** A running shoe in profile, with a cushioned sole and two lace marks. */
export function IconTraining(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="m3.1 7.25 3.45 4a2.1 2.1 0 0 0 2.6.5l2.25-1.15 4.9 3.25 2.95.85a2.6 2.6 0 0 1 1.9 2.5v1.55a1 1 0 0 1-1 1H3.75a1.5 1.5 0 0 1-1.5-1.5V8.75a1.6 1.6 0 0 1 .85-1.5Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M2.5 16.5h3.25c2.75 0 3.9 1.5 6.75 1.5H21M11.4 10.75l-1.2 2.1M14.25 12.5l-1.2 1.85" />
    </Icon>
  );
}

/** Two teammates, drawn as full silhouettes instead of a tiny stick figure. */
export function IconTeam(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="16.75" cy="7.75" r="2.75" fill="currentColor" fillOpacity="0.12" />
      <path d="M17.5 13.5c2.25.4 3.75 2.25 3.75 4.5v1a1.25 1.25 0 0 1-1.25 1.25h-2.25" fill="currentColor" fillOpacity="0.12" />
      <circle cx="8.75" cy="7.25" r="3.25" fill="currentColor" fillOpacity="0.16" />
      <path d="M2.75 19v-.5a6 6 0 0 1 12 0v.5a1.25 1.25 0 0 1-1.25 1.25H4A1.25 1.25 0 0 1 2.75 19Z" fill="currentColor" fillOpacity="0.16" />
    </Icon>
  );
}

/** A personal profile, with the same shoulders and head as the team icon. */
export function IconProfile(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="7.25" r="3.5" fill="currentColor" fillOpacity="0.16" />
      <path d="M5 19v-.25a7 6 0 0 1 14 0V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19Z" fill="currentColor" fillOpacity="0.16" />
    </Icon>
  );
}

/** An easy-to-read stopwatch for pace and session details. */
export function IconStopwatch(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 2.75h5M12 2.75v2.75M18.25 6.75l1.5-1.5" />
      <circle cx="12" cy="13.25" r="7.5" fill="currentColor" fillOpacity="0.14" />
      <path d="M12 9v4.25l2.75 1.5" />
    </Icon>
  );
}

/** A completed step inside a progress ring. */
export function IconProgress(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.12" strokeOpacity="0.2" />
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
      <path d="m8.25 12 2.5 2.5 5-5" />
    </Icon>
  );
}

/** A warm, rounded conversation bubble for a workout check-in. */
export function IconFeedback(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M7.5 4h9A4.5 4.5 0 0 1 21 8.5v5a4.5 4.5 0 0 1-4.5 4.5h-5L6 21v-3.25A4.5 4.5 0 0 1 3 13.5v-5A4.5 4.5 0 0 1 7.5 4Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M7.5 9h9M7.5 13h5.5" />
    </Icon>
  );
}

/** A soft leaf for recovery and rest. */
export function IconRecovery(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M20.5 3.5c.75 5.25-.15 10.1-3.55 13.05a7.35 7.35 0 0 1-10.1-.4 6.7 6.7 0 0 1 .05-9.6C10.1 3.4 15.25 4.75 20.5 3.5Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M3.5 20.5 15 9M8.5 15.5V11" />
    </Icon>
  );
}

// Existing screens can migrate without losing their named imports.
export const IconTrack = IconToday;
export const IconRunner = IconTeam;
export const IconSliders = IconProfile;
