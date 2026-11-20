/**
 * Who can see what. Everyone is a member; some accounts are also admins.
 *
 * The role lives in the account's app metadata under `cb_role`. Users can't
 * write app metadata themselves (only the database or the service key can),
 * so the role can be trusted. The key is namespaced because the Supabase
 * project, and its accounts, are shared with other tools.
 *
 * Make someone an admin (SQL editor, or any database connection):
 *   update auth.users
 *      set raw_app_meta_data = raw_app_meta_data || '{"cb_role":"admin"}'
 *    where email = 'someone@example.com';
 */
export type Role = "member" | "admin";

export function roleOf(user: { app_metadata?: Record<string, unknown> } | null | undefined): Role {
  return user?.app_metadata?.cb_role === "admin" ? "admin" : "member";
}

/** Who a change log entry, tour slide or guide section is for. */
export type Audience = "everyone" | "admins";

export function canSee(audience: Audience, role: Role): boolean {
  return audience === "everyone" || role === "admin";
}
