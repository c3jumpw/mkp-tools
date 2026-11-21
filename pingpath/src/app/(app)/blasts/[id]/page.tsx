import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import EventDetailClient from "@/components/events/EventDetailClient";
import BlastDeckButton from "@/components/events/BlastDeckButton";
import type { Channel, Contact, EventContact, EventRow, Sequence, Tag } from "@/lib/types";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event, error }, { data: sequences }, { data: roster }, contacts, { data: tags }] =
    await Promise.all([
      supabase.from("pingpath_events").select("*").eq("id", id).single(),
      supabase
        .from("pingpath_sequences")
        .select("*")
        .eq("event_id", id)
        .order("step_number"),
      supabase
        .from("pingpath_event_contacts")
        .select("*, contact:pingpath_contacts(*, pingpath_contact_tags(tag:pingpath_tags(*)))")
        .eq("event_id", id)
        .order("added_at"),
      fetchAllRows<Contact>((from, to) =>
        supabase
          .from("pingpath_contacts")
          .select("*")
          .eq("visible", true)
          .order("full_name")
          .order("id")
          .range(from, to)
      ),
      supabase.from("pingpath_tags").select("*").order("name"),
    ]);

  if (error || !event) notFound();

  const eventContactIds = (roster || []).map((r) => r.id);
  const { data: sendLog } = eventContactIds.length
    ? await supabase
        .from("pingpath_send_log")
        .select("event_contact_id, step_number, channel, sent_at")
        .in("event_contact_id", eventContactIds)
    : { data: [] as { event_contact_id: string; step_number: number; channel: Channel; sent_at: string }[] };

  const sentByEventContact = new Map<string, Record<number, { channel: Channel; sent_at: string }>>();
  for (const row of sendLog || []) {
    const existing = sentByEventContact.get(row.event_contact_id) || {};
    existing[row.step_number] = { channel: row.channel, sent_at: row.sent_at };
    sentByEventContact.set(row.event_contact_id, existing);
  }

  const rosterMapped: (EventContact & { contact: Contact })[] = (roster || []).map((r) => ({
    ...r,
    sent_steps: sentByEventContact.get(r.id) || {},
    contact: {
      ...r.contact,
      tags: (r.contact?.pingpath_contact_tags || [])
        .map((ct: { tag: Tag | null }) => ct.tag)
        .filter(Boolean),
    },
  }));

  const canDeck = (sequences || []).length > 0 && rosterMapped.length > 0;

  return (
    <>
      <EventDetailClient
        event={event as EventRow}
        sequences={(sequences as Sequence[]) || []}
        roster={rosterMapped}
        allContacts={contacts}
        allTags={(tags as Tag[]) || []}
      />
      {canDeck && <BlastDeckButton eventId={id} />}
    </>
  );
}
