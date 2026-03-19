import { MobileHeader } from "@/components/navigation/MobileHeader";
import { AlarmManagement } from "@/components/alarms/AlarmManagement";
import { Bell } from "lucide-react";

export default function Alarm() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Alarms" />

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 px-6 pt-8 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Alarms & Reminders
          </h1>
          <p className="text-xs text-muted-foreground">Manage your alarms and notifications</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 md:px-6 md:py-6">
        <AlarmManagement />
      </div>
    </div>
  );
}
