"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_VERSION } from "@/lib/changelog";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Records that this account has seen What's new for the current version. */
export async function markUpdatesSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const now = new Date().toISOString();
  await supabase
    .from("pingpath_user_prefs")
    .upsert({ user_id: user.id, seen_version: CURRENT_VERSION, seen_at: now, updated_at: now });
}
