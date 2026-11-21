import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeckClient from "@/components/events/DeckClient";
// Roster/sequence data is loaded here so the deck opens with cards ready.
import type { Channel, Contact, EventContact, EventRow, Sequence } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BlastDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event, error }, { data: sequences }, { data: roster }] =
    await Promise.all([
      supabase.from("pingpath_events").select("*").eq("id", id).single(),
      supabase
        .from("pingpath_sequences")
        .select("*")
        .eq("event_id", id)
        .order("step_number"),
      supabase
        .from("pingpath_event_contacts")
        .select("*, contact:pingpath_contacts(*)")
        .eq("event_id", id)
        .order("added_at"),
    ]);

  if (error || !event) notFound();

  const eventContactIds = (roster || []).map((r) => r.id);
  const { data: sendLog } = eventContactIds.length
    ? await supabase
        .from("pingpath_send_log")
        .select("event_contact_id, step_number, channel, sent_at")
        .in("event_contact_id", eventContactIds)
    : {
        data: [] as {
          event_contact_id: string;
          step_number: number;
          channel: Channel;
          sent_at: string;
        }[],
      };

  const sentByEventContact = new Map<
    string,
    Record<number, { channel: Channel; sent_at: string }>
  >();
  for (const row of sendLog || []) {
    const existing = sentByEventContact.get(row.event_contact_id) || {};
    existing[row.step_number] = { channel: row.channel, sent_at: row.sent_at };
    sentByEventContact.set(row.event_contact_id, existing);
  }

  const rosterMapped: (EventContact & { contact: Contact })[] = (roster || [])
    .filter((r) => r.contact)
    .map((r) => ({
      ...r,
      sent_steps: sentByEventContact.get(r.id) || {},
      contact: r.contact as Contact,
    }));

  return (
    <DeckClient
      event={event as EventRow}
      sequences={(sequences as Sequence[]) || []}
      roster={rosterMapped}
    />
  );
}
