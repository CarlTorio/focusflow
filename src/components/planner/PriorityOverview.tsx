import { useState } from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { Tables } from "@/integrations/supabase/types";

type TaskWithAnalytics = Tables<"tasks"> & {
  schedules: Tables<"task_schedules">[];
  subtasks: Tables<"subtasks">[];
};

interface PriorityOverviewProps {
  tasks: TaskWithAnalytics[];
}

function getTaskStatus(task: TaskWithAnalytics): {
  label: string;
  color: string;
  pulse?: boolean;
} {
  const today = new Date();
  const dueDate = parseISO(task.due_date);
  const daysLeft = differenceInCalendarDays(dueDate, today);
  const isOverdue = daysLeft < 0;

  const completedSchedules = task.schedules.filter((s) => s.status === "completed");
  const totalSchedules = task.schedules.length;
  const completedHours = completedSchedules.reduce(
    (sum, s) => sum + Number(s.allocated_hours),
    0
  );
  const totalHours = Number(task.estimated_hours);

  if (isOverdue && task.status !== "completed") {
    return { label: "Overdue", color: "text-destructive bg-destructive/10", pulse: true };
  }

  const elapsed = differenceInCalendarDays(today, parseISO(task.created_at || today.toISOString()));
  const totalDays = differenceInCalendarDays(dueDate, parseISO(task.created_at || today.toISOString()));
  const expectedFraction = totalDays > 0 ? Math.min(1, elapsed / totalDays) : 0;
  const expectedHours = totalHours * expectedFraction;
  const fraction = totalHours > 0 ? completedHours / totalHours : 0;

  if (fraction >= expectedFraction - 0.05) {
    return { label: "On Track", color: "text-success bg-success/10" };
  } else if (fraction >= expectedFraction * 0.5) {
    return { label: "Behind", color: "text-warning bg-warning/10" };
  } else {
    return { label: "At Risk", color: "text-destructive bg-destructive/10" };
  }
}

function getDueDateColor(dueDate: string): string {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days < 0) return "bg-destructive/10 text-destructive";
  if (days <= 1) return "bg-destructive/10 text-destructive";
  if (days <= 3) return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
}

export function PriorityOverview({ tasks }: PriorityOverviewProps) {
  const [open, setOpen] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl bg-secondary/50 border border-border/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold font-heading text-foreground">Priority Overview</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {tasks.length} active
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-border/30 animate-in fade-in-0 duration-150">
          {tasks.map((task) => {
            const status = getTaskStatus(task);
            const dueDateColor = getDueDateColor(task.due_date);
            const completedSubtasks = task.subtasks.filter((s) => s.is_completed).length;
            const completedSchedules = task.schedules.filter(
              (s) => s.status === "completed"
            ).length;
            const totalSchedules = task.schedules.length;
        const hoursCompleted = task.schedules
              .filter((s) => s.status === "completed")
              .reduce((sum, s) => sum + Number(s.allocated_hours), 0);
            const progressPct =
              task.subtasks.length > 0
                ? Math.round((completedSubtasks / task.subtasks.length) * 100)
                : totalSchedules > 0
                ? Math.round((completedSchedules / totalSchedules) * 100)
                : 0;

            const daysLeft = differenceInCalendarDays(parseISO(task.due_date), new Date());

            return (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                {/* Priority dot */}
                <div
                   className={cn(
                     "mt-0.5 h-2.5 w-2.5 rounded-full shrink-0",
                     task.priority === "high"
                       ? "bg-destructive"
                       : task.priority === "medium"
                       ? "bg-warning"
                       : "bg-success"
                   )}
                 />

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <Progress value={progressPct} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {task.subtasks.length > 0
                        ? `${completedSubtasks}/${task.subtasks.length} steps`
                        : `${Math.round(hoursCompleted)}/${task.estimated_hours}h`}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", dueDateColor)}>
                      {daysLeft < 0
                        ? "Overdue"
                        : daysLeft === 0
                        ? "Due today"
                        : daysLeft === 1
                        ? "Due tomorrow"
                        : `Due ${format(parseISO(task.due_date), "MMM d")}`}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        status.color,
                        status.pulse && "animate-pulse"
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
