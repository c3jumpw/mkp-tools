import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import EventsClient from "@/components/events/EventsClient";
import type { EventRow } from "@/lib/types";

export default async function EventsPage() {
  const supabase = await createClient();

  const [{ data }, memberships] = await Promise.all([
    supabase
      .from("pingpath_events")
      .select("*, pingpath_event_contacts(count)")
      .order("created_at", { ascending: false }),
    fetchAllRows<{ event_id: string; current_step: number; responded: boolean }>(
      (from, to) =>
        supabase
          .from("pingpath_event_contacts")
          .select("event_id, current_step, responded")
          .order("id")
          .range(from, to)
    ),
  ]);

  const statsByEvent = new Map<string, { sent: number; responded: number }>();
  for (const m of memberships) {
    const s = statsByEvent.get(m.event_id) || { sent: 0, responded: 0 };
    s.sent += m.current_step || 0;
    if (m.responded) s.responded += 1;
    statsByEvent.set(m.event_id, s);
  }

  const events: EventRow[] = (data || []).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    notes: e.notes,
    archived: e.archived,
    created_at: e.created_at,
    contact_count: e.pingpath_event_contacts?.[0]?.count ?? 0,
    sent_count: statsByEvent.get(e.id)?.sent ?? 0,
    responded_count: statsByEvent.get(e.id)?.responded ?? 0,
  }));

  return <EventsClient initialEvents={events} />;
}
