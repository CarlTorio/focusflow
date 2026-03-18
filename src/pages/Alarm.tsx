import { MobileHeader } from "@/components/navigation/MobileHeader";
import { AlarmManagement } from "@/components/alarms/AlarmManagement";

export default function Alarm() {
  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Alarms" />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <AlarmManagement />
      </div>
    </div>
  );
}
