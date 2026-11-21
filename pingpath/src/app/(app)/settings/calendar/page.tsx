import { createClient } from "@/lib/supabase/server";
import { maskFeedUrl } from "@/lib/ical";
import CalendarSettingsClient, { type FeedView } from "@/components/home/CalendarSettingsClient";

export const dynamic = "force-dynamic";

export default async function CalendarSettingsPage() {
  const supabase = await createClient();
  const { data: feeds } = await supabase
    .from("pingpath_calendar_feeds")
    .select("id, name, url, last_synced_at, last_error, last_result, created_at")
    .order("created_at");

  // Only a masked form of the secret link is sent to the browser.
  const views: FeedView[] = (feeds || []).map((f) => ({
    id: f.id,
    name: f.name,
    masked: maskFeedUrl(f.url),
    last_synced_at: f.last_synced_at,
    last_error: f.last_error,
    last_result: f.last_result,
  }));

  return <CalendarSettingsClient feeds={views} />;
}
