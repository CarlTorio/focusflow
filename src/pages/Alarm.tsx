import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { useAlarms, Alarm as AlarmType } from "@/hooks/useAlarms";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { QuickReminders } from "@/components/alarms/QuickReminders";

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now.getHours();
  const h12 = hours % 12 || 12;
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";

  return (
    <div className="flex items-baseline justify-center gap-1">
      <span
        className="text-6xl font-light tracking-tight text-foreground tabular-nums md:text-7xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {h12}:{mins}:{secs}
      </span>
      <span className="text-lg font-medium text-muted-foreground">{ampm}</span>
    </div>
  );
}

function AlarmRow({
  alarm,
  onToggle,
  onEdit,
}: {
  alarm: AlarmType;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const displayTime = (alarm as any).original_alarm_time || alarm.alarm_time;
  const d = new Date(displayTime);
  const h12 = d.getHours() % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "pm" : "am";

  const recLabel = alarm.is_recurring && alarm.recurrence_pattern
    ? alarm.recurrence_pattern === "daily"
      ? "Every day"
      : alarm.recurrence_pattern === "weekdays"
        ? "Weekdays"
        : alarm.recurrence_pattern === "weekly"
          ? "Weekly"
          : `Custom days`
    : "Only ring once";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl bg-card px-5 py-4 shadow-sm transition-all cursor-pointer active:scale-[0.98]",
        !alarm.is_active && "opacity-40"
      )}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-3xl font-light tabular-nums text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {h12}:{mins}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{ampm}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {alarm.title}, {recLabel}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={alarm.is_active}
          onCheckedChange={() => { onToggle(); }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

export default function Alarm() {
  const navigate = useNavigate();
  const { alarms, updateAlarm } = useAlarms();

  const activeCount = alarms.filter((a) => a.is_active).length;

  const handleToggle = (alarm: AlarmType) => {
    updateAlarm.mutate({ id: alarm.id, is_active: !alarm.is_active } as any);
  };

  return (
    <div className="pb-24 md:pb-8">
      <MobileHeader title="Alarm" />

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 px-6 pt-8 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Alarm
        </h1>
      </div>

      {/* Live clock — centered */}
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex flex-col items-center py-10 md:py-12">
          <LiveClock />
          <p className="mt-4 text-sm text-muted-foreground">
            {activeCount === 0
              ? "No alarms on"
              : `${activeCount} alarm${activeCount > 1 ? "s" : ""} active`}
          </p>
        </div>
      </div>

      {/* Main content — two columns on desktop */}
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Mobile: Quick Reminders first, then alarms */}
        <div className="md:hidden space-y-6">
          <QuickReminders />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Alarms</h3>
            </div>
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <AlarmRow
                  key={alarm.id}
                  alarm={alarm}
                  onToggle={() => handleToggle(alarm)}
                  onEdit={() => navigate(`/alarm/edit/${alarm.id}`)}
                />
              ))}
              {alarms.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Tap + to set your first alarm</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-8">
          {/* Left — Alarms */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Alarms</h3>
            </div>
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <AlarmRow
                  key={alarm.id}
                  alarm={alarm}
                  onToggle={() => handleToggle(alarm)}
                  onEdit={() => navigate(`/alarm/edit/${alarm.id}`)}
                />
              ))}
              {alarms.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Tap + to set your first alarm</p>
                </div>
              )}
            </div>
          </div>

          {/* Right — Quick Reminders */}
          <div>
            <QuickReminders />
          </div>
        </div>
      </div>

      {/* Floating add button */}
      <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 md:bottom-8">
        <button
          onClick={() => navigate("/alarm/add")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
