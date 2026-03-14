import { useState } from "react";
import { useAlarms, Alarm, AlarmType } from "@/hooks/useAlarms";
import { Bell, Clock, AlertTriangle, Coffee, Plus, Trash2, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow } from "date-fns";
import { CreateAlarmModal } from "./CreateAlarmModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const alarmTypeIcons: Record<string, typeof Bell> = {
  custom: Bell,
  task_reminder: Clock,
  due_warning: AlertTriangle,
  break_reminder: Coffee,
  nudge: Bell,
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "task_reminder", label: "Task Reminders" },
  { key: "custom", label: "Custom" },
];

function formatAlarmTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

export function AlarmManagement() {
  const { alarms, updateAlarm, deleteAlarm } = useAlarms();
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Alarm | null>(null);

  const now = new Date();
  const filtered = alarms.filter((a) => {
    if (filter === "upcoming") return new Date(a.alarm_time) > now && a.is_active;
    if (filter === "task_reminder") return a.alarm_type === "task_reminder";
    if (filter === "custom") return a.alarm_type === "custom";
    return true;
  });

  const handleToggle = (alarm: Alarm) => {
    updateAlarm.mutate({ id: alarm.id, is_active: !alarm.is_active } as any);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteAlarm.mutate(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Alarm deleted");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Alarms & Reminders
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Alarm
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alarm list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No alarms set</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Task reminders will appear here automatically when you schedule tasks
            </p>
          </div>
        ) : (
          filtered.map((alarm) => {
            const Icon = alarmTypeIcons[alarm.alarm_type] || Bell;
            const isPast = new Date(alarm.alarm_time) < now;
            return (
              <div
                key={alarm.id}
                className={cn(
                  "group flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                  !alarm.is_active && "opacity-50"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  alarm.alarm_type === "due_warning" ? "bg-warning/10 text-warning" :
                  alarm.alarm_type === "break_reminder" ? "bg-success/10 text-success" :
                  "bg-primary/10 text-primary"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{alarm.title}</p>
                  <p className={cn("text-xs", isPast ? "text-muted-foreground" : "text-foreground/70")}>
                    {formatAlarmTime(alarm.alarm_time)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {alarm.is_recurring && alarm.recurrence_pattern && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                        {alarm.recurrence_pattern}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      🔊 {alarm.sound_type === "custom" ? "Custom" : alarm.sound_type}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setDeleteTarget(alarm)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Switch
                    checked={alarm.is_active}
                    onCheckedChange={() => handleToggle(alarm)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateAlarmModal open={showCreate} onClose={() => setShowCreate(false)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alarm?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
