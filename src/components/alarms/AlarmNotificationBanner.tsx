import { useAlarmContext } from "@/contexts/AlarmContext";
import { Bell, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function AlarmNotificationBanner() {
  const { firingAlarm, dismiss, snooze } = useAlarmContext();

  if (!firingAlarm) return null;

  const alarm = firingAlarm.alarm;
  const canSnooze = alarm.snooze_count < alarm.max_snoozes;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] animate-in slide-in-from-top duration-500">
      <div className="mx-auto max-w-lg p-3">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/10">
          <div className="bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{alarm.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(alarm.alarm_time), "h:mm a")}
                  {alarm.alarm_type === "task_reminder" && " · Task Reminder"}
                  {alarm.alarm_type === "due_warning" && " · Due Date Warning"}
                  {alarm.alarm_type === "break_reminder" && " · Break Time"}
                </p>
                {alarm.snooze_count > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Snoozed {alarm.snooze_count}/{alarm.max_snoozes} times
                  </p>
                )}
              </div>
              <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 px-4 py-3">
            <Button onClick={dismiss} variant="outline" size="sm" className="flex-1">
              Dismiss
            </Button>
            {canSnooze && (
              <Button onClick={snooze} size="sm" className="flex-1 gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Snooze ({alarm.snooze_duration_minutes}m)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
