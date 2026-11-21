import type {
  ActivityLogEntry,
  CalendarFeed,
  Contact,
  EventContact,
  EventRow,
  Occasion,
  OccasionKind,
  Sequence,
  Tag,
} from "@/lib/types";
import { addDays, startOfDay } from "@/lib/occasions";

/**
 * Sample people and dates for the tour's live screens. Dates are built from
 * the viewer's own "today" so Home always has something on today and this week.
 * None of this is ever saved; tour screens can't write to the database.
 */
export function buildFixtures(now: Date) {
  const today = startOfDay(now);
  const DAY = 86_400_000;
  const ago = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
  const md = (offset: number) => {
    const d = addDays(today, offset);
    return { month: d.getMonth() + 1, day: d.getDate() };
  };

  const tags: Tag[] = [
    { id: "t-church", name: "Church group", color: "#4F9C8C" },
    { id: "t-family", name: "Family", color: "#B084C4" },
    { id: "t-vol", name: "Volunteers", color: "#CB9A45" },
    { id: "t-warm", name: "Warm leads", color: "#7FA65A" },
  ];
  const tag = (id: string) => tags.find((t) => t.id === id)!;

  const person = (p: Partial<Contact> & { id: string; full_name: string }): Contact => ({
    nickname: null,
    phone: null,
    phone2: null,
    phone2_label: null,
    instagram_handle: null,
    tiktok_handle: null,
    email: null,
    notes: "",
    status: "active",
    visible: true,
    created_at: ago(300),
    updated_at: ago(3),
    tags: [],
    ...p,
  });

  const contacts: Contact[] = [
    person({ id: "c-aisha", full_name: "Aisha Bello", phone: "(555) 905-3318", email: "aisha@example.com", tags: [tag("t-church")] }),
    person({ id: "c-bethany", full_name: "Bethany Cole", phone: "(555) 318-4402", tags: [tag("t-church")] }),
    person({ id: "c-dana", full_name: "Dana Whitfield", phone: "(555) 640-2207", visible: false }),
    person({ id: "c-daniel", full_name: "Daniel Osei", phone: "(555) 822-1940", tags: [tag("t-church"), tag("t-vol")] }),
    person({ id: "c-grace", full_name: "Grace Kim", email: "grace.kim@example.com", tags: [tag("t-church")] }),
    person({
      id: "c-jordan",
      full_name: "Jordan Ellis",
      nickname: "Jo",
      phone: "(555) 201-4410",
      phone2: "(555) 330-1182",
      phone2_label: "Work",
      email: "jordan@example.com",
      instagram_handle: "jordanellis",
      notes: "Met at the spring fundraiser. Prefers texts after 5pm.",
      tags: [tag("t-church"), tag("t-vol")],
    }),
    person({ id: "c-kevin", full_name: "Kevin Brown", phone: "(555) 776-0091", status: "do_not_contact" }),
    person({ id: "c-leo", full_name: "Leo Park", email: "leo.park@example.com", tags: [tag("t-warm")] }),
    person({ id: "c-marcus", full_name: "Marcus Hill", phone: "(555) 781-5521", tags: [tag("t-church")] }),
    person({ id: "c-maya", full_name: "Maya Rodriguez", phone: "(555) 612-0937", instagram_handle: "maya.rod", tags: [tag("t-warm"), tag("t-vol")] }),
    person({ id: "c-priya", full_name: "Priya Raman", phone: "(555) 448-2290", email: "priya@example.com", tags: [tag("t-vol")] }),
    person({ id: "c-rose", full_name: "Rose Ellis", nickname: "Grandma Rose", phone: "(555) 210-7764", tags: [tag("t-family")] }),
    person({ id: "c-sam", full_name: "Sam Ortiz", instagram_handle: "samortiz", status: "invalid", tags: [tag("t-warm")] }),
    person({ id: "c-tom", full_name: "Tom Avery", phone: "(555) 517-6623", tags: [tag("t-church"), tag("t-warm")] }),
  ];
  const who = (id: string) => contacts.find((c) => c.id === id)!;

  const occ = (o: Partial<Occasion> & { id: string; kind: OccasionKind; month: number; day: number }): Occasion => ({
    contact_id: null,
    label: "",
    year: null,
    source: "manual",
    feed_id: null,
    external_uid: null,
    dismissed: false,
    last_wished_year: null,
    contact: null,
    ...o,
  });
  const linked = (contactId: string) => ({ contact_id: contactId, contact: who(contactId) });
  const fromCalendar = (uid: string) => ({ source: "calendar" as const, feed_id: "f-1", external_uid: uid });

  const occasions: Occasion[] = [
    occ({ id: "o-jordan-bday", kind: "birthday", ...md(0), year: 1994, ...linked("c-jordan") }),
    occ({
      id: "o-rose-anniv",
      kind: "anniversary",
      label: "Grandma Rose & Grandpa Lou",
      ...md(0),
      year: 1971,
      ...linked("c-rose"),
      last_wished_year: today.getFullYear(),
    }),
    occ({ id: "o-priya-grad", kind: "other", label: "Graduation", ...md(1), ...linked("c-priya") }),
    occ({ id: "o-marcus-bday", kind: "birthday", label: "Marcus Hill", ...md(3), year: 1988, ...linked("c-marcus"), ...fromCalendar("u-1") }),
    occ({ id: "o-aisha-anniv", kind: "anniversary", ...md(5), year: 2016, ...linked("c-aisha") }),
    occ({ id: "o-tasha", kind: "birthday", label: "Tasha Green", ...md(9), year: 1990, ...fromCalendar("u-2") }),
    occ({ id: "o-maya", kind: "birthday", label: "Maya", ...md(12), ...fromCalendar("u-3") }),
    occ({ id: "o-leo-bday", kind: "birthday", ...md(16), ...linked("c-leo") }),
    occ({ id: "o-ray", kind: "birthday", label: "Uncle Ray", ...md(21), ...fromCalendar("u-4") }),
    occ({ id: "o-jordan-anniv", kind: "anniversary", month: 2, day: 25, year: 2019, ...linked("c-jordan") }),
    occ({ id: "o-jordan-work", kind: "other", label: "Work anniversary", month: 9, day: 8, year: 2021, ...linked("c-jordan") }),
  ];

  const feeds: CalendarFeed[] = [
    {
      id: "f-1",
      name: "Birthdays & Anniversaries",
      url: "",
      last_synced_at: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      last_error: null,
      last_result: { found: 48, linked: 45, unlinked: 3, removed: 0 },
      created_at: ago(30),
    },
  ];

  const q4: EventRow = {
    id: "e-q4",
    name: "Q4 Outreach",
    description: "Reconnect with everyone before the holidays",
    notes: "Aim to finish step 1 by Friday.",
    archived: false,
    created_at: ago(12),
    contact_count: 6,
    sent_count: 5,
    responded_count: 2,
  };
  const events: EventRow[] = [
    q4,
    {
      id: "e-vol",
      name: "Volunteer thank-yous",
      description: "After the food drive",
      notes: "",
      archived: false,
      created_at: ago(40),
      contact_count: 4,
      sent_count: 4,
      responded_count: 3,
    },
    {
      id: "e-spring",
      name: "Spring fundraiser invites",
      description: "",
      notes: "",
      archived: true,
      created_at: ago(220),
      contact_count: 11,
      sent_count: 19,
      responded_count: 7,
    },
  ];

  const sequences: Sequence[] = [
    { id: "s-1", event_id: q4.id, step_number: 1, channel: "sms", body: "Hey {first_name}, it's been a while! Free for coffee this week?" },
    { id: "s-2", event_id: q4.id, step_number: 2, channel: "whatsapp", body: "Hi {nickname}, just bumping this up. Would love to catch up before the holidays." },
  ];

  const sent = (steps: number[]) =>
    Object.fromEntries(steps.map((n) => [n, { channel: n === 1 ? ("sms" as const) : ("whatsapp" as const), sent_at: ago(5 - n) }]));
  const member = (contactId: string, steps: number[], responded = false): EventContact & { contact: Contact } => ({
    id: `ec-${contactId}`,
    event_id: q4.id,
    contact_id: contactId,
    current_step: steps.length,
    responded,
    last_channel_sent: steps.length ? (steps.length > 1 ? "whatsapp" : "sms") : null,
    last_sent_at: steps.length ? ago(4) : null,
    added_at: ago(12),
    sent_steps: sent(steps),
    contact: who(contactId),
  });
  const roster = [
    member("c-maya", [1]),
    member("c-jordan", [1]),
    member("c-priya", [1, 2], true),
    member("c-marcus", []),
    member("c-aisha", [1], true),
    member("c-sam", []),
  ];

  const jordan = who("c-jordan");
  const jordanMemberships = [{ ...roster[1], event: { ...q4, sequences } }];
  const jordanActivity: ActivityLogEntry[] = [
    { id: "a-1", contact_id: jordan.id, event_id: q4.id, message: 'Marked step 1 (Text) as sent for "Q4 Outreach".', created_at: ago(4) },
    { id: "a-2", contact_id: jordan.id, event_id: null, message: "Sent anniversary wishes (Text)", created_at: ago(270) },
    { id: "a-3", contact_id: jordan.id, event_id: null, message: "Sent birthday wishes (WhatsApp)", created_at: ago(365) },
  ];
  const jordanOccasions = occasions
    .filter((o) => o.contact_id === jordan.id)
    .map((o) => ({ ...o, contact: undefined }));

  const church = tag("t-church");
  const churchMembers = contacts.filter((c) => c.tags?.some((t) => t.id === church.id));
  const birthdays: Record<string, { id: string; month: number; day: number; year: number | null; source: "manual" | "calendar" }> = {};
  for (const o of occasions) {
    if (o.kind === "birthday" && o.contact_id) {
      birthdays[o.contact_id] = { id: o.id, month: o.month, day: o.day, year: o.year, source: o.source };
    }
  }

  const tagCounts = tags.map((t) => ({
    ...t,
    count: contacts.filter((c) => c.tags?.some((x) => x.id === t.id)).length,
  }));

  const duplicateContacts: Contact[] = [
    ...contacts,
    person({ id: "c-maya-2", full_name: "Maya Rodriguez", phone: "555-612-0937", created_at: ago(20) }),
    person({ id: "c-priya-2", full_name: "Priya R.", email: "Priya@example.com", created_at: ago(8) }),
  ];

  return {
    today,
    tags,
    contacts,
    picker: contacts.map(({ id, full_name, nickname, phone }) => ({ id, full_name, nickname, phone })),
    blastOptions: events.filter((e) => !e.archived).map(({ id, name }) => ({ id, name })),
    occasions,
    feeds,
    feedViews: feeds.map((f) => ({
      id: f.id,
      name: f.name,
      masked: "calendar.google.com/…/basic.ics",
      last_synced_at: f.last_synced_at,
      last_error: f.last_error,
      last_result: f.last_result,
    })),
    events,
    q4,
    sequences,
    roster,
    jordan,
    jordanMemberships,
    jordanActivity,
    jordanOccasions,
    church,
    churchMembers,
    birthdays,
    tagCounts,
    duplicateContacts,
  };
}

/** A small CSV the import screen is filled with. */
export const SAMPLE_CSV = `Name,Mobile,Work phone,E-mail,Birthday
Tasha Green,(555) 302-1189,,tasha@example.com,1990-11-27
Ray Douglas,(555) 870-4432,(555) 870-0000,,
Ana Lucia Reyes,(555) 228-9051,,ana@example.com,`;
