import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/changelog";

export type Viewer = {
  id: string;
  role: Role;
  /** YYYY-MM-DD the account was created. */
  joinedOn: string;
  /** The last update whose What's new this account has seen. */
  seenVersion: string | null;
};

/**
 * Who is signed in, their role and what they've seen. Roles are granted in the
 * Supabase dashboard (table pingpath_roles); the app can only read its own row.
 * Cached per request, so the layout and the page share one lookup.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const [{ data: role }, { data: prefs }] = await Promise.all([
      supabase.from("pingpath_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("pingpath_user_prefs").select("seen_version").eq("user_id", user.id).maybeSingle(),
    ]);
    return {
      id: user.id,
      role: role?.role === "admin" ? "admin" : "member",
      joinedOn: (user.created_at || new Date().toISOString()).slice(0, 10),
      seenVersion: prefs?.seen_version ?? null,
    };
  } catch {
    return null;
  }
});
