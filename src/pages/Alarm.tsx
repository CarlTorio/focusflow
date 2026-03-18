import { Bell } from "lucide-react";
import { MobileHeader } from "@/components/navigation/MobileHeader";

export default function Alarm() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Alarms" />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Bell className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No alarms yet</h2>
          <p className="text-sm text-muted-foreground">
            Your reminders will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
