import data from "@/data/changelog.json";

/**
 * The change log lives in src/data/changelog.json (newest first) so it stays
 * plain data that can be read, exported and kept outside the app. Every update
 * adds an entry at the top whose version matches package.json; the build stops
 * if it doesn't, or if a change doesn't say who it applies to
 * (scripts/check-tour.mjs). See TOUR.md.
 */
export type Audience = "everyone" | "admin";
export type ChangeKind = "new" | "improved" | "fixed" | "behind-the-scenes";
export type Role = "admin" | "member";

export type Change = {
  kind: ChangeKind;
  /** Where in the app: Home, Contacts, Tags, Blasts, Blast Deck, Settings, Help, Accounts, Setup, Admin, App. */
  area: string;
  /** Who it applies to. Admin-only changes never show in other people's What's new. */
  audience: Audience;
  title: string;
  detail?: string;
  /** A tour step that shows it. */
  slide?: string;
};

export type Release = {
  version: string;
  /** For display, e.g. "November 18, 2026". */
  date: string;
  /** YYYY-MM-DD. */
  isoDate: string;
  title: string;
  summary?: string;
  /** Titles of the changes that apply to everyone (the tour's What's new uses these). */
  items: string[];
  changes: Change[];
  /** Tour steps that show what changed (slide ids from src/lib/tour/slides.ts). */
  slides?: string[];
  /** Production deployments on Vercel, oldest first. Handy for rolling back. */
  deployments?: string[];
  /** Written afterwards from the deploy history, before notes were kept. */
  reconstructed?: boolean;
};

type RawRelease = Omit<Release, "date" | "isoDate" | "items"> & { date: string };

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const RELEASES: Release[] = (data.releases as unknown as RawRelease[]).map((r) => ({
  ...r,
  isoDate: r.date,
  date: formatDay(r.date),
  items: r.changes.filter((c) => c.audience === "everyone").map((c) => c.title),
}));

export const CURRENT_VERSION = RELEASES[0].version;
export const CURRENT_RELEASE = RELEASES[0];

export const KIND_LABEL: Record<ChangeKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  "behind-the-scenes": "Behind the scenes",
};

/** -1 if a is older than b, 0 if equal, 1 if newer. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function appliesTo(change: Change, role: Role): boolean {
  return change.audience === "everyone" || role === "admin";
}

/** Before notes were tracked per account, the last update was shown per device. */
const PER_ACCOUNT_SINCE = "1.4.0";

/**
 * The updates someone hasn't seen yet, newest first, each trimmed to the
 * changes that apply to them. Updates with nothing for them are left out.
 * New accounts start from the version that was current when they signed up.
 */
export function unseenUpdates({
  role,
  seenVersion,
  joinedOn,
}: {
  role: Role;
  seenVersion: string | null;
  /** YYYY-MM-DD the account was created. */
  joinedOn: string;
}): Release[] {
  let since = seenVersion;
  if (!since) {
    const atSignup = RELEASES.find((r) => r.isoDate <= joinedOn)?.version ?? RELEASES[RELEASES.length - 1].version;
    since = compareVersions(atSignup, PER_ACCOUNT_SINCE) > 0 ? atSignup : PER_ACCOUNT_SINCE;
  }
  return RELEASES.filter((r) => compareVersions(r.version, since) > 0)
    .map((r) => ({ ...r, changes: r.changes.filter((c) => appliesTo(c, role)) }))
    .filter((r) => r.changes.length > 0);
}

/** Per-device memory for the welcome card on Home. */
export const TOUR_STORAGE_KEY = "pingpath:tour";
export type TourMemory = { welcomed?: boolean; seen?: string };

export function readTourMemory(): TourMemory {
  try {
    return JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || "{}") as TourMemory;
  } catch {
    return {};
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ welcomed: true, seen: CURRENT_VERSION }));
  } catch {
    // storage unavailable: the card just shows again next time
  }
}
