import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="md:pl-[72px]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
