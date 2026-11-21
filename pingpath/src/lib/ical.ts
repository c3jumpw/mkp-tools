/**
 * Minimal iCalendar (.ics) reader — just enough to pull yearly events
 * (birthdays, anniversaries) out of a Google Calendar "secret address".
 */

export type IcsEvent = {
  uid: string;
  summary: string;
  description: string;
  month: number;
  day: number;
  year: number;
  yearly: boolean;
  /** Recurrence ended before today (RRULE UNTIL in the past). */
  ended: boolean;
  /** An edited single instance of a recurring event — the series row covers it. */
  isOverride: boolean;
  cancelled: boolean;
};

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Split "NAME;PARAM=x:VALUE" at the first colon that isn't inside quotes. */
function splitLine(line: string): [string, string] | null {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) return [line.slice(0, i), line.slice(i + 1)];
  }
  return null;
}

function parseDateValue(v: string): { year: number; month: number; day: number } | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseIcs(text: string): IcsEvent[] {
  const unfolded = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "");
  const events: IcsEvent[] = [];
  const today = new Date();
  let cur: Partial<IcsEvent> & { hasStart?: boolean } | null = null;

  for (const raw of unfolded.split("\n")) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") {
      cur = { summary: "", description: "", yearly: false, ended: false, isOverride: false, cancelled: false };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.hasStart && cur.uid) events.push(cur as IcsEvent);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const parts = splitLine(line);
    if (!parts) continue;
    const [left, value] = parts;
    const name = left.split(";")[0].toUpperCase();

    switch (name) {
      case "UID":
        cur.uid = value.trim();
        break;
      case "SUMMARY":
        cur.summary = unescapeText(value).trim();
        break;
      case "DESCRIPTION":
        cur.description = unescapeText(value);
        break;
      case "DTSTART": {
        const d = parseDateValue(value);
        if (d) {
          cur.year = d.year;
          cur.month = d.month;
          cur.day = d.day;
          cur.hasStart = true;
        }
        break;
      }
      case "RRULE": {
        const rule = Object.fromEntries(
          value.split(";").map((p) => {
            const [k, v] = p.split("=");
            return [k.toUpperCase(), v];
          })
        );
        if (rule.FREQ === "YEARLY") cur.yearly = true;
        if (rule.UNTIL) {
          const u = parseDateValue(rule.UNTIL);
          if (u && new Date(u.year, u.month - 1, u.day) < today) cur.ended = true;
        }
        break;
      }
      case "RECURRENCE-ID":
        cur.isOverride = true;
        break;
      case "STATUS":
        if (value.trim().toUpperCase() === "CANCELLED") cur.cancelled = true;
        break;
    }
  }
  return events;
}

/** Accepts https:// and webcal:// links; returns a fetchable https URL or null. */
export function normalizeFeedUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (/^webcals?:\/\//i.test(s)) s = s.replace(/^webcals?:\/\//i, "https://");
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Shows enough of a secret link to recognise it without exposing it. */
export function maskFeedUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").filter(Boolean).pop() || "";
    return `${u.host}/…/${tail}`;
  } catch {
    return "Saved link";
  }
}
