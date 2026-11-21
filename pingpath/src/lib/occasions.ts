import type { OccasionKind } from "@/lib/types";

/**
 * Pure date + name helpers shared by the server (calendar sync) and the
 * client (home dashboard). Nothing here touches the database.
 */

export type SimpleDate = { month: number; day: number; year: number | null };

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Local-midnight Date for this month/day in the given year (Feb 29 → Feb 28 in non-leap years). */
export function occurrenceInYear(month: number, day: number, year: number): Date {
  if (month === 2 && day === 29 && !isLeap(year)) return new Date(year, 1, 28);
  return new Date(year, month - 1, Math.min(day, daysInMonth(year, month)));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Whole calendar days from a to b (DST-safe). */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export function sameDay(a: Date, b: Date) {
  return daysBetween(a, b) === 0;
}

export function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = occurrenceInYear(month, day, from.getFullYear());
  return daysBetween(from, thisYear) >= 0
    ? thisYear
    : occurrenceInYear(month, day, from.getFullYear() + 1);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatMonthDay(month: number, day: number, year?: number | null) {
  return `${MONTH_SHORT[month - 1]} ${day}${year ? `, ${year}` : ""}`;
}

export function relativeDay(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days ago`;
  return `In ${days} days`;
}

/** "Turns 31" / "25th anniversary" — only when the year is actually known. */
export function milestone(kind: OccasionKind, year: number | null, on: Date): string | null {
  if (!year) return null;
  const n = on.getFullYear() - year;
  if (n <= 0 || n > 120) return null;
  if (kind === "birthday") return `Turns ${n}`;
  if (kind === "anniversary") return `${ordinal(n)} anniversary`;
  return `${n} years`;
}

// ---------------------------------------------------------------------------
// US holidays (computed, so no feed or network needed)
// ---------------------------------------------------------------------------

export type Holiday = { key: string; name: string; date: Date };

function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset + (n - 1) * 7);
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const last = new Date(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, last.getDate() - offset);
}

/** Western Easter Sunday (anonymous Gregorian algorithm). */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function holidaysForYear(year: number): Holiday[] {
  const list: [string, Date][] = [
    ["New Year's Day", new Date(year, 0, 1)],
    ["Martin Luther King Jr. Day", nthWeekday(year, 0, 1, 3)],
    ["Valentine's Day", new Date(year, 1, 14)],
    ["Presidents' Day", nthWeekday(year, 1, 1, 3)],
    ["St. Patrick's Day", new Date(year, 2, 17)],
    ["Easter", easter(year)],
    ["Mother's Day", nthWeekday(year, 4, 0, 2)],
    ["Memorial Day", lastWeekday(year, 4, 1)],
    ["Juneteenth", new Date(year, 5, 19)],
    ["Father's Day", nthWeekday(year, 5, 0, 3)],
    ["Independence Day", new Date(year, 6, 4)],
    ["Labor Day", nthWeekday(year, 8, 1, 1)],
    ["Indigenous Peoples' Day", nthWeekday(year, 9, 1, 2)],
    ["Halloween", new Date(year, 9, 31)],
    ["Veterans Day", new Date(year, 10, 11)],
    ["Thanksgiving", nthWeekday(year, 10, 4, 4)],
    ["Christmas Eve", new Date(year, 11, 24)],
    ["Christmas", new Date(year, 11, 25)],
    ["New Year's Eve", new Date(year, 11, 31)],
  ];
  return list.map(([name, date]) => ({ key: `${name}-${year}`, name, date }));
}

// ---------------------------------------------------------------------------
// Reading names and kinds out of calendar event titles
// ---------------------------------------------------------------------------

const KIND_WORDS =
  /(^|[^\p{L}])(happy|wedding|birthday|birthdays|bday|b-day|b'day|anniversary|anniv\.?|cumpleaños|cumple)(?=[^\p{L}]|$)/giu;

export function detectKind(summary: string): OccasionKind {
  const s = summary.toLowerCase();
  if (/anniv/.test(s)) return "anniversary";
  if (/birth|b-?day|b'day|cumple|🎂|🎈/u.test(s)) return "birthday";
  if (/memorial|passed|remembrance|in memory|\brip\b/.test(s)) return "other";
  // Two names joined ("Mom & Dad", "Ana and Luis") usually means a couple.
  if (/\s(&|and|\+)\s/.test(extractName(summary))) return "anniversary";
  // A yearly, untitled-kind event in a people calendar is almost always a birthday.
  return "birthday";
}

export function extractName(summary: string): string {
  let s = summary
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[️‍]/g, "")
    .replace(/\((?:b\.?|born|est\.?|since)?\s*(?:19|20)\d{2}\)/gi, " ")
    .replace(/\b(?:b\.|born|since|married(?: in)?)\s*(?:19|20)\d{2}\b/gi, " ");
  s = s.replace(KIND_WORDS, "$1 ");
  s = s.replace(/['’]s(?=\s|$)/g, "");
  s = s.replace(/\b(?:19|20)\d{2}\b/g, " ");
  s = s.replace(/^[\s\-–—:|,.!]+|[\s\-–—:|,.!]+$/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || summary.trim();
}

/** A birth/wedding year written into the title or description, e.g. "(1990)", "born 1988". */
export function extractYear(summary: string, description = ""): number | null {
  const current = new Date().getFullYear();
  const patterns = [
    /\((?:b\.?|born|est\.?|since)?\s*((?:19|20)\d{2})\)/i,
    /\b(?:b\.|born|since|married(?: in)?)\s*((?:19|20)\d{2})\b/i,
  ];
  for (const text of [summary, description]) {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const y = Number(m[1]);
        if (y >= 1900 && y <= current) return y;
      }
    }
  }
  const bare = summary.match(/\b((?:19|20)\d{2})\b/);
  if (bare) {
    const y = Number(bare[1]);
    if (y >= 1900 && y <= current) return y;
  }
  return null;
}

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();
}

type NamedContact = { id: string; full_name: string; nickname: string | null };

/** Exact, unambiguous match only — used for automatic linking during sync. */
export function exactContactMatch<T extends NamedContact>(name: string, contacts: T[]): T | null {
  const target = normalizeName(name);
  if (!target) return null;
  const byFull = contacts.filter((c) => normalizeName(c.full_name) === target);
  if (byFull.length === 1) return byFull[0];
  if (byFull.length > 1) return null;
  const byNick = contacts.filter((c) => c.nickname && normalizeName(c.nickname) === target);
  return byNick.length === 1 ? byNick[0] : null;
}

/** Looser suggestions shown as one-tap "Link to …?" chips. */
export function suggestContacts<T extends NamedContact>(name: string, contacts: T[], limit = 3): T[] {
  const target = normalizeName(name);
  if (!target) return [];
  const tokens = target.split(" ").filter((t) => t.length > 1 && t !== "&" && t !== "and");
  if (!tokens.length) return [];
  const scored: { c: T; score: number }[] = [];
  for (const c of contacts) {
    const full = normalizeName(c.full_name);
    const nick = c.nickname ? normalizeName(c.nickname) : "";
    const first = full.split(" ")[0];
    let score = 0;
    if (full === target || nick === target) score = 100;
    else if (full.includes(target) || (target.length > 3 && target.includes(full))) score = 60;
    else if (tokens.includes(first) || (nick && tokens.includes(nick))) score = 40;
    else if (tokens.some((t) => full.split(" ").includes(t))) score = 20;
    if (score) scored.push({ c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.c.full_name.localeCompare(b.c.full_name))
    .slice(0, limit)
    .map((s) => s.c);
}

export const WISH_TEMPLATES: Record<OccasionKind, string> = {
  birthday: "Happy birthday, {nickname}! Hope it's a great one 🎉",
  anniversary: "Happy anniversary, {nickname}! Wishing you both the best 🥂",
  other: "Thinking of you today, {nickname}.",
};

type Typed = { kind: OccasionKind; label: string; source: "manual" | "calendar" };

/** What kind of date this is, in words: "Birthday", "Anniversary", or a named event like "Graduation". */
export function occasionTypeLabel(o: Typed): string {
  if (o.kind === "other" && o.source === "manual" && o.label) return o.label;
  return o.kind === "birthday" ? "Birthday" : o.kind === "anniversary" ? "Anniversary" : "Special date";
}

/** Starting message for wishes; a named event reads "Happy Graduation, …". */
export function wishTemplate(o: Typed): string {
  if (o.kind === "other" && o.source === "manual" && o.label) return `Happy ${o.label}, {nickname}! 🎉`;
  return WISH_TEMPLATES[o.kind];
}
