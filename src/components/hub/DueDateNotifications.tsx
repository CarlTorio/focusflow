import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function DueDateNotifications() {
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ["due-date-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority, status")
        .neq("status", "completed")
        .order("due_date", { ascending: true })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  if (tasks.length === 0) return null;

  const getUrgencyInfo = (dueDate: string) => {
    const due = new Date(dueDate + "T23:59:59");
    const today = new Date();
    const daysLeft = differenceInDays(due, today);

    if (isPast(due) && !isToday(due)) {
      return { label: "Overdue", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle, urgent: true };
    }
    if (isToday(due)) {
      return { label: "Due today", color: "text-warning", bg: "bg-warning/10", icon: Clock, urgent: true };
    }
    if (daysLeft === 1) {
      return { label: "Tomorrow", color: "text-warning", bg: "bg-warning/10", icon: Clock, urgent: true };
    }
    if (daysLeft <= 3) {
      return { label: `${daysLeft} days left`, color: "text-primary", bg: "bg-primary/10", icon: Calendar, urgent: false };
    }
    return { label: format(new Date(dueDate), "MMM d"), color: "text-muted-foreground", bg: "bg-secondary", icon: Calendar, urgent: false };
  };

  const urgentTasks = tasks.filter((t) => {
    const info = getUrgencyInfo(t.due_date);
    return info.urgent;
  });

  const upcomingTasks = tasks.filter((t) => {
    const info = getUrgencyInfo(t.due_date);
    return !info.urgent;
  }).slice(0, 5);

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-foreground">📋 What's Coming Up</h3>

      {urgentTasks.length > 0 && (
        <div className="mb-3 space-y-2">
          {urgentTasks.map((task) => {
            const info = getUrgencyInfo(task.due_date);
            const Icon = info.icon;
            return (
              <div
                key={task.id}
                className={cn("flex items-center gap-3 rounded-xl p-3", info.bg)}
              >
                <Icon className={cn("h-4 w-4 shrink-0", info.color)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                  <p className={cn("text-xs font-semibold", info.color)}>{info.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="space-y-2">
          {urgentTasks.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground mt-2">Coming up</p>
          )}
          {upcomingTasks.map((task) => {
            const info = getUrgencyInfo(task.due_date);
            return (
              <div key={task.id} className="flex items-center justify-between py-1.5">
                <span className="truncate text-sm text-foreground">{task.title}</span>
                <span className={cn("ml-2 shrink-0 text-xs font-medium", info.color)}>
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tasks.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No upcoming deadlines 🎉
        </p>
      )}
    </div>
  );
}
