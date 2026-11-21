import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminChangeLog from "@/components/updates/AdminChangeLog";
import { RELEASES } from "@/lib/changelog";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Admin · PingPath", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") notFound();
  return <AdminChangeLog releases={RELEASES} liveDeployment={process.env.VERCEL_DEPLOYMENT_ID} />;
}
