/**
 * Small pieces shared by the admin change log and the What's new pop-up.
 * Kept free of the change log data itself, which is server-only.
 */

export type Kind = "new" | "improved" | "fixed" | "internal";

const KIND: Record<Kind, { label: string; className: string }> = {
  // Blue, the guide's callout colour: "look here". Lime stays reserved for state.
  new: { label: "New", className: "border-[#5ab0ff]/40 bg-[#5ab0ff]/15 text-[#8cc8ff]" },
  improved: { label: "Improved", className: "border-chalk/30 bg-raise text-chalk" },
  fixed: { label: "Fixed", className: "border-warn/40 bg-warn/10 text-warn" },
  internal: { label: "Behind the scenes", className: "border-dashed border-line text-muted" },
};

export function KindBadge({ kind }: { kind: Kind }) {
  const k = KIND[kind];
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[0.7rem] font-semibold tracking-wide uppercase ${k.className}`}
    >
      {k.label}
    </span>
  );
}

export const KIND_LABEL: Record<Kind, string> = Object.fromEntries(
  Object.entries(KIND).map(([k, v]) => [k, v.label]),
) as Record<Kind, string>;

export function AudienceTag({ audience }: { audience: "everyone" | "admins" }) {
  if (audience === "everyone") return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2.5 text-[0.7rem] font-medium text-muted">
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4" y="9" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      Admins only
    </span>
  );
}

/** "2026-10-30" → "Fri, Oct 30, 2026". Parsed as a calendar date, not a UTC instant. */
export function formatEntryDate(date: string, withYear = true): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
}

export function formatMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
