/** Day names, indexed to match Postgres's and JavaScript's 0 = Sunday. */
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function todayIndex(): number {
  return new Date().getDay();
}

/**
 * The target for one station, as it reads on a placard: "4 × 8", "3 × 30s",
 * or just the reps when no set count is given.
 */
export function formatTarget(opts: {
  sets?: number | null;
  reps?: string | null;
  durationSeconds?: number | null;
}): string | null {
  const { sets, reps, durationSeconds } = opts;
  const unit = reps?.trim() || (durationSeconds ? formatDuration(durationSeconds) : null);

  if (sets && unit) return `${sets} × ${unit}`;
  if (sets) return `${sets} ${sets === 1 ? "set" : "sets"}`;
  return unit;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/** How long a session took, for the history list. */
export function formatElapsed(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateWithWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * A rough read on how long a routine takes, so Today can say something useful
 * before the first session is ever logged. Assumes a set plus its rest runs
 * about 75 seconds, and a timed drill runs its duration plus 30 seconds.
 */
export function estimateMinutes(
  stations: { sets?: number | null; durationSeconds?: number | null }[],
): number {
  const seconds = stations.reduce((total, s) => {
    if (s.durationSeconds) return total + (s.sets || 1) * (s.durationSeconds + 30);
    return total + (s.sets || 3) * 75;
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

/** Sort an array by a numeric key without mutating it. */
export function byPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}
