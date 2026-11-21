import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import DuplicatesClient from "@/components/contacts/DuplicatesClient";
import type { Contact, Tag } from "@/lib/types";

export default async function DuplicatesPage() {
  const supabase = await createClient();

  const rawContacts = await fetchAllRows<Contact & { pingpath_contact_tags: { tag: Tag | null }[] }>(
    (from, to) =>
      supabase
        .from("pingpath_contacts")
        .select("*, pingpath_contact_tags(tag:pingpath_tags(*))")
        .order("created_at")
        .order("id")
        .range(from, to)
  );

  const contacts: Contact[] = rawContacts.map((c) => ({
    ...c,
    tags: (c.pingpath_contact_tags || [])
      .map((ct) => ct.tag)
      .filter((t): t is Tag => Boolean(t)),
  }));

  return <DuplicatesClient contacts={contacts} />;
}
