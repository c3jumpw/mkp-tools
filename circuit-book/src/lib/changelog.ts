/**
 * Every change to Circuit Book, oldest first. The data is in
 * src/content/changelog.json so it stays plain, portable JSON; this module
 * types it and answers "what's new for this person?".
 *
 * Server-only on purpose: entries for admins must never be shipped to a
 * member's browser. Client code gets entries from /api/whats-new, already
 * filtered by role.
 *
 * Adding an entry: see CLAUDE.md, "Change log". `npm run changelog:check`
 * validates the file, and CI fails a push that changes the app without one.
 */
import "server-only";
import raw from "@/content/changelog.json";
import type { FigureName } from "@/app/guide/figures";
import { canSee, type Audience, type Role } from "@/lib/roles";
import { SEEN_META_KEY } from "@/lib/whats-new";

export type ChangeKind = "new" | "improved" | "fixed" | "internal";

export type ChangeEntry = {
  /** 1, 2, 3… in release order. Never reused or renumbered: seen markers point at it. */
  seq: number;
  /** When it went live, as YYYY-MM-DD in New York time. */
  date: string;
  kind: ChangeKind;
  audience: Audience;
  /** Show it in the What's new pop-up to the people it applies to. */
  announce: boolean;
  title: string;
  summary: string;
  details?: string[];
  /** Where to try it. */
  link?: { href: string; label: string };
  /** An annotated guide screenshot to show with it. */
  figure?: FigureName;
  /** Short SHAs in c3jumpw/mkp-tools. */
  commits?: string[];
};

export const CHANGELOG = raw as ChangeEntry[];

export const LATEST_SEQ = CHANGELOG.reduce((m, e) => Math.max(m, e.seq), 0);

export const REPO_URL = "https://github.com/c3jumpw/mkp-tools";

/** Key in the account's user metadata holding the last entry they've seen. */
export const SEEN_KEY = SEEN_META_KEY;

/**
 * Announced entries this person hasn't seen, newest first.
 *
 * `seen` is the last seq they dismissed. Someone who has never dismissed the
 * pop-up starts from the day their account was made, so a new account isn't
 * greeted with the app's whole history.
 */
export function unseenFor({
  role,
  seen,
  createdAt,
}: {
  role: Role;
  seen: number | null;
  createdAt: string | null;
}): ChangeEntry[] {
  const joined = createdAt ? nyDate(new Date(createdAt)) : null;
  const baseline =
    seen ?? (joined ? CHANGELOG.filter((e) => e.date <= joined).reduce((m, e) => Math.max(m, e.seq), 0) : 0);
  return CHANGELOG.filter((e) => e.announce && e.kind !== "internal" && e.seq > baseline && canSee(e.audience, role))
    .sort((a, b) => b.seq - a.seq);
}

/** YYYY-MM-DD in New York, to compare with entry dates. */
function nyDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
