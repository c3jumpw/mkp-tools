"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * One browser client for the whole app. Supabase keeps the session in cookies
 * via @supabase/ssr, so the middleware can read it too.
 */
export function supabaseBrowser() {
  if (cached) return cached;
  cached = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
