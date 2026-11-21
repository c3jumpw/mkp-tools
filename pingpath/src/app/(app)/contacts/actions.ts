"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import type { ContactStatus } from "@/lib/types";

export async function createContact(input: {
  full_name: string;
  nickname?: string;
  phone?: string;
  phone2?: string;
  phone2_label?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  email?: string;
  notes?: string;
  tagIds?: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("pingpath_contacts")
    .insert({
      user_id: user.id,
      full_name: input.full_name,
      nickname: input.nickname || null,
      phone: input.phone || null,
      phone2: input.phone2 || null,
      phone2_label: input.phone2 && input.phone2_label?.trim() ? input.phone2_label.trim() : null,
      instagram_handle: input.instagram_handle || null,
      tiktok_handle: input.tiktok_handle || null,
      email: input.email || null,
      notes: input.notes || "",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (input.tagIds?.length) {
    await supabase
      .from("pingpath_contact_tags")
      .insert(input.tagIds.map((tag_id) => ({ contact_id: data.id, tag_id })));
  }

  revalidatePath("/contacts");
  return data;
}

export async function updateContact(
  id: string,
  fields: Partial<{
    full_name: string;
    nickname: string | null;
    phone: string | null;
    phone2: string | null;
    phone2_label: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    email: string | null;
    notes: string;
  }>
) {
  const supabase = await createClient();
  const clean = { ...fields };
  if ("phone2_label" in clean) clean.phone2_label = clean.phone2_label?.trim() || null;
  const { error } = await supabase.from("pingpath_contacts").update(clean).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/tags", "layout");
}

export async function removeContactFromTag(contactId: string, tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/tags", "layout");
}

export async function setContactStatus(id: string, status: ContactStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_contacts")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function setContactVisible(id: string, visible: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_contacts")
    .update({ visible })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}

export async function bulkDeleteContacts(ids: string[]) {
  const supabase = await createClient();
  if (!ids.length) return;
  const { error } = await supabase.from("pingpath_contacts").delete().in("id", ids);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
}

export async function createTag(name: string, color: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("pingpath_tags")
    .insert({ user_id: user.id, name, color })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath("/tags");
  return data;
}

export async function updateTag(id: string, fields: Partial<{ name: string; color: string }>) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_tags").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath("/tags");
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath("/tags");
}

export async function bulkAddTagToContacts(contactIds: string[], tagId: string) {
  const supabase = await createClient();
  if (!contactIds.length) return;
  const { error } = await supabase
    .from("pingpath_contact_tags")
    .upsert(
      contactIds.map((contact_id) => ({ contact_id, tag_id: tagId })),
      { onConflict: "contact_id,tag_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/contacts");
  revalidatePath("/tags", "layout");
}

export async function setContactTags(contactId: string, tagIds: string[]) {
  const supabase = await createClient();
  await supabase.from("pingpath_contact_tags").delete().eq("contact_id", contactId);
  if (tagIds.length) {
    const { error } = await supabase
      .from("pingpath_contact_tags")
      .insert(tagIds.map((tag_id) => ({ contact_id: contactId, tag_id })));
    if (error) throw new Error(error.message);
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export type ImportRow = {
  full_name: string;
  nickname?: string;
  phone?: string;
  phone2?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  email?: string;
  notes?: string;
};

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const trimmed = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return trimmed.length >= 7 ? trimmed : null;
}

/** Bulk import with de-dup on phone number (normalized, so formatting differences don't slip through). */
export async function bulkImportContacts(rows: ImportRow[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const existingRows = await fetchAllRows<{ phone: string | null }>((from, to) =>
    supabase
      .from("pingpath_contacts")
      .select("phone")
      .not("phone", "is", null)
      .order("id")
      .range(from, to)
  );
  const existingPhones = new Set(
    existingRows.map((c) => (c.phone ? normalizePhone(c.phone) : null)).filter(Boolean)
  );

  const clean = rows.filter((r) => r.full_name?.trim());
  const seenInBatch = new Set<string>();
  const toInsert = clean.filter((r) => {
    const norm = r.phone ? normalizePhone(r.phone) : null;
    if (!norm) return true;
    if (existingPhones.has(norm) || seenInBatch.has(norm)) return false;
    seenInBatch.add(norm);
    return true;
  });
  const skipped = clean.length - toInsert.length;

  if (toInsert.length) {
    const { error } = await supabase.from("pingpath_contacts").insert(
      toInsert.map((r) => ({
        user_id: user.id,
        full_name: r.full_name.trim(),
        nickname: r.nickname || null,
        phone: r.phone || null,
        phone2: r.phone2 || null,
        instagram_handle: r.instagram_handle || null,
        tiktok_handle: r.tiktok_handle || null,
        email: r.email || null,
        notes: r.notes || "",
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/contacts");
  return { imported: toInsert.length, skipped };
}
