import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import ContactsClient from "@/components/contacts/ContactsClient";
import type { Contact, Tag } from "@/lib/types";

export default async function ContactsPage() {
  const supabase = await createClient();

  const [rawContacts, { data: tags }, { data: blasts }] = await Promise.all([
    fetchAllRows<Contact & { pingpath_contact_tags: { tag: Tag | null }[] }>((from, to) =>
      supabase
        .from("pingpath_contacts")
        .select("*, pingpath_contact_tags(tag:pingpath_tags(*))")
        .order("full_name")
        .order("id")
        .range(from, to)
    ),
    supabase.from("pingpath_tags").select("*").order("name"),
    supabase
      .from("pingpath_events")
      .select("id, name")
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const contacts: Contact[] = rawContacts.map((c) => ({
    ...c,
    tags: (c.pingpath_contact_tags || [])
      .map((ct) => ct.tag)
      .filter((t): t is Tag => Boolean(t)),
  }));

  return (
    <ContactsClient
      initialContacts={contacts}
      allTags={(tags as Tag[]) || []}
      allBlasts={blasts || []}
    />
  );
}
