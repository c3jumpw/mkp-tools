import { Sidebar, BottomNav, MobileHeader } from "@/components/Nav";
import WhatsNew from "@/components/updates/WhatsNew";
import { unseenUpdates } from "@/lib/changelog";
import { getViewer } from "@/lib/viewer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const updates = viewer ? unseenUpdates(viewer) : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <MobileHeader />
        {children}
      </div>
      <BottomNav />
      {updates.length > 0 && <WhatsNew updates={updates} isAdmin={viewer?.role === "admin"} />}
    </div>
  );
}
