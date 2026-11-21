import { createClient } from "@/lib/supabase/server";
import TagsClient from "@/components/contacts/TagsClient";

export default async function TagsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pingpath_tags")
    .select("*, pingpath_contact_tags(count)")
    .order("name");

  const tags = (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    count: t.pingpath_contact_tags?.[0]?.count ?? 0,
  }));

  return <TagsClient initialTags={tags} />;
}
