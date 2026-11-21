"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { createContact } from "@/app/(app)/contacts/actions";
import { normalizeFeedUrl, parseIcs, type IcsEvent } from "@/lib/ical";
import {
  detectKind,
  exactContactMatch,
  extractName,
  extractYear,
  normalizeName,
  type SimpleDate,
} from "@/lib/occasions";
import type { Channel, OccasionKind } from "@/lib/types";
import { CHANNEL_LABEL, OCCASION_LABEL } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function validDate(d: SimpleDate | null | undefined): d is SimpleDate {
  if (!d) return false;
  if (!Number.isInteger(d.month) || d.month < 1 || d.month > 12) return false;
  if (!Number.isInteger(d.day) || d.day < 1 || d.day > 31) return false;
  if (d.year != null && (!Number.isInteger(d.year) || d.year < 1900 || d.year > 2100)) return false;
  return true;
}

function revalidateOccasionViews(contactId?: string | null) {
  revalidatePath("/home");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

// ---------------------------------------------------------------------------
// Birthdays / anniversaries typed in by hand
// ---------------------------------------------------------------------------

/** Set (or clear, with null) a contact's hand-entered birthday or anniversary. */
export async function setContactOccasion(
  contactId: string,
  kind: OccasionKind,
  date: SimpleDate | null
) {
  const { supabase, user } = await requireUser();

  const { data: calendarRow } = await supabase
    .from("pingpath_occasions")
    .select("id")
    .eq("contact_id", contactId)
    .eq("kind", kind)
    .eq("source", "calendar")
    .limit(1)
    .maybeSingle();
  if (calendarRow) {
    throw new Error(
      `This ${OCCASION_LABEL[kind].toLowerCase()} comes from your Google Calendar. Change it there, or unlink it first.`
    );
  }

  const { data: existing } = await supabase
    .from("pingpath_occasions")
    .select("id")
    .eq("contact_id", contactId)
    .eq("kind", kind)
    .eq("source", "manual")
    .maybeSingle();

  if (!date) {
    if (existing) await supabase.from("pingpath_occasions").delete().eq("id", existing.id);
    revalidateOccasionViews(contactId);
    return;
  }
  if (!validDate(date)) throw new Error("That date doesn't look right.");

  if (existing) {
    const { error } = await supabase
      .from("pingpath_occasions")
      .update({ month: date.month, day: date.day, year: date.year, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("pingpath_occasions").insert({
      user_id: user.id,
      contact_id: contactId,
      kind,
      month: date.month,
      day: date.day,
      year: date.year,
      source: "manual",
    });
    if (error) throw new Error(error.message);
  }
  revalidateOccasionViews(contactId);
}

/**
 * Create or edit one of a contact's special dates: an anniversary, or any
 * named event ("Graduation", "Work anniversary"). A contact can have several.
 */
export async function saveSpecialDate(input: {
  id?: string | null;
  contactId: string;
  kind: "anniversary" | "other";
  label: string;
  date: SimpleDate;
}) {
  const { supabase, user } = await requireUser();
  if (!validDate(input.date)) throw new Error("Pick a month and day (the year is optional).");
  const kind: OccasionKind = input.kind === "anniversary" ? "anniversary" : "other";
  const label = kind === "anniversary" ? "" : input.label.trim().slice(0, 60);
  if (kind === "other" && !label) throw new Error("Give the date a name, e.g. “Graduation”.");

  if (kind === "anniversary") {
    const { data: cal } = await supabase
      .from("pingpath_occasions")
      .select("id")
      .eq("contact_id", input.contactId)
      .eq("kind", "anniversary")
      .eq("source", "calendar")
      .limit(1)
      .maybeSingle();
    if (cal) {
      throw new Error("This anniversary comes from your Google Calendar. Change it there, or unlink it first.");
    }
  }

  const fields = {
    kind,
    label,
    month: input.date.month,
    day: input.date.day,
    year: input.date.year,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from("pingpath_occasions").update(fields).eq("id", input.id).eq("source", "manual")
    : await supabase.from("pingpath_occasions").insert({
        ...fields,
        user_id: user.id,
        contact_id: input.contactId,
        source: "manual",
      });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("manual_contact_kind_key")) {
        throw new Error("Only one custom special date per contact can be saved right now. Edit the existing one instead.");
      }
      throw new Error(
        kind === "anniversary"
          ? "This contact already has an anniversary. Edit that one instead."
          : `This contact already has a date called “${label}”.`
      );
    }
    throw new Error(error.message);
  }
  revalidateOccasionViews(input.contactId);
}

// ---------------------------------------------------------------------------
// Linking calendar entries to contacts
// ---------------------------------------------------------------------------

export async function linkOccasion(occasionId: string, contactId: string) {
  const { supabase } = await requireUser();
  const { data: occ, error } = await supabase
    .from("pingpath_occasions")
    .select("id, kind, source, contact_id")
    .eq("id", occasionId)
    .single();
  if (error || !occ) throw new Error("Couldn't find that date.");

  // The calendar entry now carries this date — drop a hand-typed duplicate.
  if (occ.source === "calendar") {
    await supabase
      .from("pingpath_occasions")
      .delete()
      .eq("contact_id", contactId)
      .eq("kind", occ.kind)
      .eq("source", "manual");
  }

  const { error: upErr } = await supabase
    .from("pingpath_occasions")
    .update({ contact_id: contactId, dismissed: false, updated_at: new Date().toISOString() })
    .eq("id", occasionId);
  if (upErr) throw new Error(upErr.message);
  revalidateOccasionViews(contactId);
  if (occ.contact_id && occ.contact_id !== contactId) revalidatePath(`/contacts/${occ.contact_id}`);
}

export async function unlinkOccasion(occasionId: string) {
  const { supabase } = await requireUser();
  const { data: occ } = await supabase
    .from("pingpath_occasions")
    .select("id, source, contact_id")
    .eq("id", occasionId)
    .single();
  if (!occ) return;
  if (occ.source === "manual") {
    await supabase.from("pingpath_occasions").delete().eq("id", occasionId);
  } else {
    await supabase
      .from("pingpath_occasions")
      .update({ contact_id: null, updated_at: new Date().toISOString() })
      .eq("id", occasionId);
  }
  revalidateOccasionViews(occ.contact_id);
}

export async function setOccasionDismissed(occasionId: string, dismissed: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pingpath_occasions")
    .update({ dismissed })
    .eq("id", occasionId);
  if (error) throw new Error(error.message);
  revalidateOccasionViews();
}

/** Records that wishes went out this year (shows a check on the dashboard) and logs it. */
export async function markWished(input: {
  occasionId: string;
  contactId: string;
  kind: OccasionKind;
  year: number;
  channel: Channel;
}) {
  const { supabase } = await requireUser();
  await supabase
    .from("pingpath_occasions")
    .update({ last_wished_year: input.year })
    .eq("id", input.occasionId);
  await supabase.from("pingpath_activity_log").insert({
    contact_id: input.contactId,
    event_id: null,
    message: `Sent ${OCCASION_LABEL[input.kind].toLowerCase()} wishes (${CHANNEL_LABEL[input.channel]})`,
  });
  revalidateOccasionViews(input.contactId);
}

export async function unmarkWished(occasionId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pingpath_occasions").update({ last_wished_year: null }).eq("id", occasionId);
  revalidateOccasionViews();
}

// ---------------------------------------------------------------------------
// Quick add from the home page
// ---------------------------------------------------------------------------

export async function quickAddContact(input: {
  full_name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  instagram_handle?: string;
  phone2?: string;
  phone2_label?: string;
  birthday?: SimpleDate | null;
  special?: { kind: "anniversary" | "other"; label: string; date: SimpleDate } | null;
  /** A calendar entry this new contact should be linked to. */
  linkOccasionId?: string | null;
}) {
  const full_name = input.full_name.trim();
  if (!full_name) throw new Error("Name is required.");

  const contact = await createContact({
    full_name,
    nickname: input.nickname?.trim(),
    phone: input.phone?.trim(),
    email: input.email?.trim(),
    instagram_handle: input.instagram_handle?.trim(),
    phone2: input.phone2?.trim(),
    phone2_label: input.phone2_label?.trim(),
  });

  let linkedKind: OccasionKind | null = null;
  if (input.linkOccasionId) {
    const { supabase } = await requireUser();
    const { data: occ } = await supabase
      .from("pingpath_occasions")
      .select("kind")
      .eq("id", input.linkOccasionId)
      .single();
    await linkOccasion(input.linkOccasionId, contact.id);
    linkedKind = (occ?.kind as OccasionKind) || null;
  }

  if (validDate(input.birthday) && linkedKind !== "birthday") {
    await setContactOccasion(contact.id, "birthday", input.birthday);
  }
  if (input.special && validDate(input.special.date) && !(input.special.kind === "anniversary" && linkedKind === "anniversary")) {
    await saveSpecialDate({ contactId: contact.id, ...input.special });
  }

  revalidatePath("/contacts");
  revalidateOccasionViews(contact.id);
  return { id: contact.id as string };
}

// ---------------------------------------------------------------------------
// Google Calendar (secret iCal address) sync
// ---------------------------------------------------------------------------

type SyncResult = { found: number; linked: number; unlinked: number; removed: number };

async function fetchFeed(url: string): Promise<IcsEvent[]> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5" },
    });
  } catch {
    throw new Error("Couldn't reach that calendar link. Check it and try again.");
  }
  if (res.status === 404 || res.status === 403 || res.status === 401) {
    throw new Error(
      "Google turned the link away. It may have been reset — copy a fresh secret address from Google Calendar settings."
    );
  }
  if (!res.ok) throw new Error(`The calendar link returned an error (${res.status}).`);
  const text = await res.text();
  if (text.length > 8_000_000) throw new Error("That calendar is too large to import.");
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error(
      "That link didn't return a calendar file. Use the “Secret address in iCal format” link, which ends in .ics."
    );
  }
  return parseIcs(text);
}

type Candidate = {
  uid: string;
  label: string;
  kind: OccasionKind;
  month: number;
  day: number;
  year: number | null;
};

function eventsToCandidates(events: IcsEvent[]): Candidate[] {
  const keyword = /birth|b-?day|b'day|anniv|cumple|🎂/iu;
  const grouped = new Map<string, Candidate & { yearly: boolean }>();
  for (const e of events) {
    if (e.cancelled || e.isOverride || !e.summary) continue;
    const annual = (e.yearly && !e.ended) || keyword.test(e.summary);
    if (!annual) continue;
    const label = extractName(e.summary);
    const kind = detectKind(e.summary);
    const key = `${normalizeName(label)}|${kind}|${e.month}|${e.day}`;
    const prev = grouped.get(key);
    // Several one-off events for the same person and date collapse into one,
    // preferring the recurring series.
    if (prev && (prev.yearly || !e.yearly)) continue;
    grouped.set(key, {
      uid: e.uid,
      label,
      kind,
      month: e.month,
      day: e.day,
      year: extractYear(e.summary, e.description),
      yearly: e.yearly,
    });
  }
  return [...grouped.values()].map(({ yearly: _y, ...c }) => c);
}

async function syncOneFeed(feedId: string, url: string): Promise<SyncResult> {
  const { supabase, user } = await requireUser();
  const candidates = eventsToCandidates(await fetchFeed(url));

  const [existing, contacts, manual, linkedCal] = await Promise.all([
    fetchAllRows<{
      id: string;
      external_uid: string | null;
      contact_id: string | null;
      label: string;
      kind: OccasionKind;
      month: number;
      day: number;
      year: number | null;
    }>((from, to) =>
      supabase
        .from("pingpath_occasions")
        .select("id, external_uid, contact_id, label, kind, month, day, year")
        .eq("feed_id", feedId)
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<{ id: string; full_name: string; nickname: string | null }>((from, to) =>
      supabase.from("pingpath_contacts").select("id, full_name, nickname").order("id").range(from, to)
    ),
    fetchAllRows<{ id: string; contact_id: string; kind: OccasionKind; month: number; day: number }>(
      (from, to) =>
        supabase
          .from("pingpath_occasions")
          .select("id, contact_id, kind, month, day")
          .eq("source", "manual")
          .not("contact_id", "is", null)
          .order("id")
          .range(from, to)
    ),
    fetchAllRows<{ contact_id: string; kind: OccasionKind }>((from, to) =>
      supabase
        .from("pingpath_occasions")
        .select("contact_id, kind")
        .eq("source", "calendar")
        .not("contact_id", "is", null)
        .order("id")
        .range(from, to)
    ),
  ]);

  const byUid = new Map(existing.map((r) => [r.external_uid, r]));
  const manualByContactKind = new Map(manual.map((m) => [`${m.contact_id}|${m.kind}`, m]));
  const takenContactKind = new Set(linkedCal.map((r) => `${r.contact_id}|${r.kind}`));

  const toInsert: Record<string, unknown>[] = [];
  const manualToDelete: string[] = [];
  const seenUids = new Set<string>();

  for (const c of candidates) {
    seenUids.add(c.uid);
    const prev = byUid.get(c.uid);
    if (prev) {
      const changed =
        prev.label !== c.label ||
        prev.kind !== c.kind ||
        prev.month !== c.month ||
        prev.day !== c.day ||
        (prev.year ?? null) !== c.year;
      if (changed) {
        await supabase
          .from("pingpath_occasions")
          .update({
            label: c.label,
            kind: c.kind,
            month: c.month,
            day: c.day,
            year: c.year,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prev.id);
      }
      continue;
    }

    // New entry: link automatically only on an exact, unambiguous name match
    // that doesn't contradict a date already on that contact.
    let contactId: string | null = null;
    const match = exactContactMatch(c.label, contacts);
    if (match) {
      const ck = `${match.id}|${c.kind}`;
      const manualRow = manualByContactKind.get(ck);
      const sameDate = manualRow && manualRow.month === c.month && manualRow.day === c.day;
      if (!takenContactKind.has(ck) && (!manualRow || sameDate)) {
        contactId = match.id;
        takenContactKind.add(ck);
        if (manualRow) manualToDelete.push(manualRow.id);
      }
    }

    toInsert.push({
      user_id: user.id,
      contact_id: contactId,
      kind: c.kind,
      label: c.label,
      month: c.month,
      day: c.day,
      year: c.year,
      source: "calendar",
      feed_id: feedId,
      external_uid: c.uid,
    });
  }

  if (manualToDelete.length) {
    await supabase.from("pingpath_occasions").delete().in("id", manualToDelete);
  }
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from("pingpath_occasions").insert(toInsert.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  // Entries deleted from the calendar go away here too.
  const removedIds = existing.filter((r) => r.external_uid && !seenUids.has(r.external_uid)).map((r) => r.id);
  for (let i = 0; i < removedIds.length; i += 200) {
    await supabase.from("pingpath_occasions").delete().in("id", removedIds.slice(i, i + 200));
  }

  const { count: linkedCount } = await supabase
    .from("pingpath_occasions")
    .select("id", { count: "exact", head: true })
    .eq("feed_id", feedId)
    .not("contact_id", "is", null);

  return {
    found: candidates.length,
    linked: linkedCount ?? 0,
    unlinked: candidates.length - (linkedCount ?? 0),
    removed: removedIds.length,
  };
}

/** Syncs every saved calendar (or just one). Errors are stored on the feed, not thrown. */
export async function syncCalendarFeeds(feedId?: string) {
  const { supabase } = await requireUser();
  let q = supabase.from("pingpath_calendar_feeds").select("id, url");
  if (feedId) q = q.eq("id", feedId);
  const { data: feeds } = await q;

  const results: { id: string; ok: boolean; error?: string; result?: SyncResult }[] = [];
  for (const f of feeds || []) {
    try {
      const result = await syncOneFeed(f.id, f.url);
      await supabase
        .from("pingpath_calendar_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: null, last_result: result })
        .eq("id", f.id);
      results.push({ id: f.id, ok: true, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed.";
      await supabase
        .from("pingpath_calendar_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: message })
        .eq("id", f.id);
      results.push({ id: f.id, ok: false, error: message });
    }
  }
  revalidatePath("/home");
  revalidatePath("/settings/calendar");
  revalidatePath("/contacts", "layout");
  return results;
}

export async function addCalendarFeed(rawUrl: string, name?: string) {
  const { supabase, user } = await requireUser();
  const url = normalizeFeedUrl(rawUrl);
  if (!url) return { ok: false as const, error: "Paste the full link, starting with https://" };

  // Check the link works before saving it.
  try {
    const events = await fetchFeed(url);
    if (!eventsToCandidates(events).length) {
      return {
        ok: false as const,
        error:
          "That calendar opened, but it has no yearly events in it. Check you copied the address for your birthdays calendar.",
      };
    }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Couldn't read that calendar." };
  }

  const { data: feed, error } = await supabase
    .from("pingpath_calendar_feeds")
    .insert({ user_id: user.id, url, name: name?.trim() || "Google Calendar" })
    .select("id")
    .single();
  if (error || !feed) return { ok: false as const, error: error?.message || "Couldn't save the calendar." };

  const [r] = await syncCalendarFeeds(feed.id);
  return r?.ok
    ? { ok: true as const, result: r.result! }
    : { ok: false as const, error: r?.error || "Saved, but the first sync failed." };
}

export async function removeCalendarFeed(feedId: string) {
  const { supabase } = await requireUser();
  // Imported dates go with it (feed_id cascades); hand-entered dates stay.
  const { error } = await supabase.from("pingpath_calendar_feeds").delete().eq("id", feedId);
  if (error) throw new Error(error.message);
  revalidatePath("/home");
  revalidatePath("/settings/calendar");
  revalidatePath("/contacts", "layout");
}
