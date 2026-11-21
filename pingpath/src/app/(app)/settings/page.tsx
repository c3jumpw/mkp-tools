import SettingsMenu from "@/components/SettingsMenu";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getViewer();
  return <SettingsMenu isAdmin={viewer?.role === "admin"} />;
}
