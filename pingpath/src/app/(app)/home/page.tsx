import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import HomeClient, { type PickerContact } from "@/components/home/HomeClient";
import TourPrompt from "@/components/tour/TourPrompt";
import type { CalendarFeed, Occasion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [occasions, contacts, { data: feeds }] = await Promise.all([
    fetchAllRows<Occasion>((from, to) =>
      supabase
        .from("pingpath_occasions")
        .select("*, contact:pingpath_contacts(*)")
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<PickerContact>((from, to) =>
      supabase
        .from("pingpath_contacts")
        .select("id, full_name, nickname, phone")
        .order("full_name")
        .range(from, to)
    ),
    // The secret calendar URL never leaves the server.
    supabase
      .from("pingpath_calendar_feeds")
      .select("id, name, last_synced_at, last_error, last_result, created_at")
      .order("created_at"),
  ]);

  return (
    <>
      <TourPrompt isNew={contacts.length === 0} />
      <HomeClient
        occasions={occasions}
        contacts={contacts}
        feeds={((feeds as Omit<CalendarFeed, "url">[]) || []).map((f) => ({ ...f, url: "" }))}
      />
    </>
  );
}
