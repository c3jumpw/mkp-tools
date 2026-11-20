import { NextResponse } from "next/server";
import { LATEST_SEQ, SEEN_KEY, unseenFor } from "@/lib/changelog";
import { roleOf } from "@/lib/roles";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The changes this person hasn't seen yet, filtered by their role on the
 * server so admin-only entries never reach anyone else's browser.
 *
 * Marking them seen happens in the browser (WhatsNew.tsx), by writing
 * `latest` to the account's user metadata.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Signed out" }, { status: 401 });

  const raw = user.user_metadata?.[SEEN_KEY];
  const entries = unseenFor({
    role: roleOf(user),
    seen: typeof raw === "number" ? raw : null,
    createdAt: user.created_at ?? null,
  }).map((e) => ({
    seq: e.seq,
    date: e.date,
    kind: e.kind,
    audience: e.audience,
    title: e.title,
    summary: e.summary,
    details: e.details ?? [],
    link: e.link ?? null,
    figure: e.figure ?? null,
  }));

  return NextResponse.json(
    { user: user.id, latest: LATEST_SEQ, entries },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
