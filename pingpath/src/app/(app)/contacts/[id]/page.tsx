import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContactDetailClient from "@/components/contacts/ContactDetailClient";
import type { ActivityLogEntry, Channel, Contact, EventContact, Occasion, Tag } from "@/lib/types";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: raw, error },
    { data: tags },
    { data: memberships },
    { data: activity },
    { data: occasions },
  ] = await Promise.all([
    supabase
      .from("pingpath_contacts")
      .select("*, pingpath_contact_tags(tag:pingpath_tags(*))")
      .eq("id", id)
      .single(),
    supabase.from("pingpath_tags").select("*").order("name"),
    supabase
      .from("pingpath_event_contacts")
      .select("*, event:pingpath_events(*, sequences:pingpath_sequences(*))")
      .eq("contact_id", id)
      .order("added_at", { ascending: false }),
    supabase
      .from("pingpath_activity_log")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("pingpath_occasions").select("*").eq("contact_id", id),
  ]);

  if (error || !raw) notFound();

  const membershipIds = (memberships || []).map((m) => m.id);
  const { data: sendLog } = membershipIds.length
    ? await supabase
        .from("pingpath_send_log")
        .select("event_contact_id, step_number, channel, sent_at")
        .in("event_contact_id", membershipIds)
    : { data: [] as { event_contact_id: string; step_number: number; channel: Channel; sent_at: string }[] };

  const sentByMembership = new Map<string, Record<number, { channel: Channel; sent_at: string }>>();
  for (const row of sendLog || []) {
    const existing = sentByMembership.get(row.event_contact_id) || {};
    existing[row.step_number] = { channel: row.channel, sent_at: row.sent_at };
    sentByMembership.set(row.event_contact_id, existing);
  }

  const contact: Contact = {
    ...raw,
    tags: (raw.pingpath_contact_tags || [])
      .map((ct: { tag: Tag | null }) => ct.tag)
      .filter(Boolean),
  };

  const membershipsWithSent = (memberships || []).map((m) => ({
    ...m,
    sent_steps: sentByMembership.get(m.id) || {},
  }));

  return (
    <ContactDetailClient
      contact={contact}
      allTags={(tags as Tag[]) || []}
      memberships={membershipsWithSent as unknown as (EventContact & {
        event: import("@/lib/types").EventRow & { sequences: import("@/lib/types").Sequence[] };
      })[]}
      activity={(activity as ActivityLogEntry[]) || []}
      occasions={(occasions as Occasion[]) || []}
    />
  );
}
