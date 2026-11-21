"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CHANNEL_LABEL } from "@/lib/types";
import type { Channel } from "@/lib/types";

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
  eventId: string | null,
  message: string
) {
  await supabase.from("pingpath_activity_log").insert({
    contact_id: contactId,
    event_id: eventId,
    message,
  });
}

export async function createEvent(name: string, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("pingpath_events")
    .insert({ user_id: user.id, name, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/blasts");
  return data;
}

export async function updateEventNotes(id: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_events").update({ notes }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${id}`);
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blasts");
}

export async function archiveEvent(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_events")
    .update({ archived })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blasts");
}

export async function addSequenceStep(
  eventId: string,
  stepNumber: number,
  channel: Channel,
  body: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_sequences").insert({
    event_id: eventId,
    step_number: stepNumber,
    channel,
    body,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${eventId}`);
}

export async function updateSequenceStep(
  id: string,
  eventId: string,
  fields: Partial<{ channel: Channel; body: string }>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_sequences")
    .update(fields)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${eventId}`);
}

export async function deleteSequenceStep(id: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pingpath_sequences").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${eventId}`);
}

export async function addContactsToEvent(eventId: string, contactIds: string[]) {
  const supabase = await createClient();
  if (!contactIds.length) return;
  const { error } = await supabase
    .from("pingpath_event_contacts")
    .upsert(
      contactIds.map((contact_id) => ({ event_id: eventId, contact_id })),
      { onConflict: "event_id,contact_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${eventId}`);
}

export async function addContactsByTag(eventId: string, tagId: string) {
  const supabase = await createClient();
  const { data: links, error: linkErr } = await supabase
    .from("pingpath_contact_tags")
    .select("contact_id")
    .eq("tag_id", tagId);
  if (linkErr) throw new Error(linkErr.message);
  await addContactsToEvent(eventId, (links || []).map((l) => l.contact_id));
}

export async function removeContactFromEvent(eventContactId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_event_contacts")
    .delete()
    .eq("id", eventContactId);
  if (error) throw new Error(error.message);
  revalidatePath(`/blasts/${eventId}`);
}

async function recountSentSteps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventContactId: string
) {
  const { count } = await supabase
    .from("pingpath_send_log")
    .select("*", { count: "exact", head: true })
    .eq("event_contact_id", eventContactId);
  return count || 0;
}

/**
 * Toggle a single sequence step to "sent" for one contact. This never sends
 * anything itself — it's the manual confirmation after the person has
 * actually sent the message through their phone/app.
 */
export async function markStepSent(params: {
  eventContactId: string;
  eventId: string;
  contactId: string;
  blastName: string;
  stepNumber: number;
  channel: Channel;
}) {
  const { eventContactId, eventId, contactId, blastName, stepNumber, channel } = params;
  const supabase = await createClient();

  const { error: logError } = await supabase
    .from("pingpath_send_log")
    .upsert(
      { event_contact_id: eventContactId, step_number: stepNumber, channel, sent_at: new Date().toISOString() },
      { onConflict: "event_contact_id,step_number" }
    );
  if (logError) throw new Error(logError.message);

  const sentCount = await recountSentSteps(supabase, eventContactId);
  const { error } = await supabase
    .from("pingpath_event_contacts")
    .update({
      current_step: sentCount,
      last_channel_sent: channel,
      last_sent_at: new Date().toISOString(),
    })
    .eq("id", eventContactId);
  if (error) throw new Error(error.message);

  await logActivity(
    supabase,
    contactId,
    eventId,
    `Marked step ${stepNumber} (${CHANNEL_LABEL[channel]}) as sent for "${blastName}".`
  );

  revalidatePath(`/blasts/${eventId}`);
  revalidatePath(`/contacts/${contactId}`);
}

/** Undo a "sent" mark on one step — for corrections, not for un-sending anything. */
export async function unmarkStepSent(params: {
  eventContactId: string;
  eventId: string;
  contactId: string;
  blastName: string;
  stepNumber: number;
}) {
  const { eventContactId, eventId, contactId, blastName, stepNumber } = params;
  const supabase = await createClient();

  const { error: delError } = await supabase
    .from("pingpath_send_log")
    .delete()
    .eq("event_contact_id", eventContactId)
    .eq("step_number", stepNumber);
  if (delError) throw new Error(delError.message);

  const sentCount = await recountSentSteps(supabase, eventContactId);
  const { error } = await supabase
    .from("pingpath_event_contacts")
    .update({ current_step: sentCount })
    .eq("id", eventContactId);
  if (error) throw new Error(error.message);

  await logActivity(
    supabase,
    contactId,
    eventId,
    `Un-marked step ${stepNumber} as sent for "${blastName}".`
  );

  revalidatePath(`/blasts/${eventId}`);
  revalidatePath(`/contacts/${contactId}`);
}

export async function toggleResponded(params: {
  eventContactId: string;
  eventId: string;
  contactId: string;
  blastName: string;
  responded: boolean;
}) {
  const { eventContactId, eventId, contactId, blastName, responded } = params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("pingpath_event_contacts")
    .update({ responded })
    .eq("id", eventContactId);
  if (error) throw new Error(error.message);

  await logActivity(
    supabase,
    contactId,
    eventId,
    responded
      ? `Marked as responded in "${blastName}".`
      : `Un-marked as responded in "${blastName}".`
  );

  revalidatePath(`/blasts/${eventId}`);
  revalidatePath(`/contacts/${contactId}`);
}
