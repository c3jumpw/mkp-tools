import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import TagDetailClient, { type BirthdayInfo, type PickerContact } from "@/components/contacts/TagDetailClient";
import type { Contact, Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tag }, memberRows, allContacts, birthdayRows] = await Promise.all([
    supabase.from("pingpath_tags").select("*").eq("id", id).single(),
    // Many-to-one embed: PostgREST returns one contact object per row.
    fetchAllRows<{ contact: unknown }>((from, to) =>
      supabase
        .from("pingpath_contact_tags")
        .select("contact:pingpath_contacts(*)")
        .eq("tag_id", id)
        .order("contact_id")
        .range(from, to)
    ),
    fetchAllRows<PickerContact>((from, to) =>
      supabase
        .from("pingpath_contacts")
        .select("id, full_name, nickname, phone")
        .order("full_name")
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<BirthdayInfo & { contact_id: string }>((from, to) =>
      supabase
        .from("pingpath_occasions")
        .select("id, contact_id, month, day, year, source")
        .eq("kind", "birthday")
        .not("contact_id", "is", null)
        .order("id")
        .range(from, to)
    ),
  ]);

  if (!tag) notFound();

  const members = memberRows
    .map((r) => r.contact as Contact | null)
    .filter((c): c is Contact => Boolean(c))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // A synced calendar birthday wins over a hand-typed one, same as the home page.
  const birthdays: Record<string, BirthdayInfo> = {};
  for (const b of birthdayRows) {
    const prev = birthdays[b.contact_id];
    if (!prev || (prev.source === "manual" && b.source === "calendar")) {
      birthdays[b.contact_id] = { id: b.id, month: b.month, day: b.day, year: b.year, source: b.source };
    }
  }

  return (
    <TagDetailClient tag={tag as Tag} members={members} allContacts={allContacts} birthdays={birthdays} />
  );
}
