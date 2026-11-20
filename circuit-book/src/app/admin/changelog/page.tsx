import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppFrame from "@/components/AppFrame";
import { CHANGELOG, REPO_URL } from "@/lib/changelog";
import { roleOf } from "@/lib/roles";
import { supabaseServer } from "@/lib/supabase/server";
import ChangelogView from "./ChangelogView";

export const metadata: Metadata = { title: "Change log · Circuit Book" };
export const dynamic = "force-dynamic";

/**
 * Admin only: every change to Circuit Book, from src/content/changelog.json.
 * The proxy already turns non-admins away; this check makes sure the entries
 * are never rendered for one even if that rule changes.
 */
export default async function ChangelogPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (roleOf(user) !== "admin") redirect("/today");

  return (
    <AppFrame title="Change log">
      <ChangelogView entries={CHANGELOG} repoUrl={REPO_URL} />
    </AppFrame>
  );
}
