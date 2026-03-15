import { Check, Lock, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInCalendarDays, parseISO } from "date-fns";

const DEFAULT_EMOJIS = ["📋", "✏️", "📌", "🎯", "💡", "🔧", "📝", "🚀"];

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
  none: "border-l-gray-300 dark:border-l-gray-600",
};

interface PlannerTaskCardProps {
  schedule: ScheduleWithTask;
  lockState: "unlocked" | "tomorrow" | "future";
  onComplete: (scheduleId: string) => void;
  onOpenFocus?: (scheduleId: string) => void;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function PlannerTaskCard({
  schedule,
  lockState,
  onComplete,
  onOpenFocus,
}: PlannerTaskCardProps) {
  const task = schedule.task;
  const isCompleted = schedule.status === "completed";
  const isLocked = lockState !== "unlocked";
  const priority = task?.priority || "none";
  const hours = Number(schedule.allocated_hours);
  const isRecurring = (task as any)?.task_type === "recurring";

  const subtaskId = (schedule as any).subtask_id;
  const displayTitle = (schedule as any).display_title || task?.title || "Untitled";
  const parentTitle = task?.title || "";
  const showParentSubtitle = subtaskId && displayTitle !== parentTitle;

  // Due date warnings
  const dueDate = task?.due_date;
  let dueBadge: { text: string; className: string } | null = null;
  let borderExtra = "";

  if (dueDate && !isCompleted) {
    const daysUntilDue = differenceInCalendarDays(parseISO(dueDate), new Date());
    if (daysUntilDue < 0) {
      dueBadge = { text: "OVERDUE", className: "bg-destructive text-destructive-foreground" };
      borderExtra = "ring-2 ring-destructive/50";
    } else if (daysUntilDue === 0) {
      dueBadge = { text: "Due TODAY", className: "bg-destructive text-destructive-foreground animate-pulse" };
      borderExtra = "ring-2 ring-destructive/40";
    } else if (daysUntilDue === 1) {
      dueBadge = { text: "Due tomorrow", className: "bg-destructive/80 text-destructive-foreground" };
      borderExtra = "ring-1 ring-destructive/30";
    } else if (daysUntilDue === 2) {
      dueBadge = { text: "Due in 2 days", className: "bg-warning text-warning-foreground" };
      borderExtra = "ring-1 ring-warning/30";
    }
  }

  const opacity =
    lockState === "future"
      ? "opacity-50"
      : lockState === "tomorrow"
      ? "opacity-70"
      : "opacity-100";

  const emoji =
    task?.icon_emoji ||
    DEFAULT_EMOJIS[Math.abs((task?.title || "").charCodeAt(0)) % DEFAULT_EMOJIS.length];

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border-l-4 p-3 transition-all duration-200 select-none",
        PRIORITY_BORDER[priority],
        isCompleted && "opacity-50",
        isLocked ? "bg-muted/40 border-dashed" : "bg-card shadow-sm hover:shadow-md",
        borderExtra,
        opacity
      )}
    >
      {/* Icon */}
      <button
        onClick={() => !isLocked && !isCompleted && onOpenFocus?.(schedule.id)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform active:scale-95"
        style={{ backgroundColor: task?.icon_color || "hsl(var(--secondary))" }}
      >
        {emoji}
      </button>

      {/* Content */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => !isLocked && !isCompleted && onOpenFocus?.(schedule.id)}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className={cn(
              "text-sm font-semibold leading-tight",
              isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {displayTitle}
            {isRecurring && (
              <span className="ml-1.5 inline-flex items-center">
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </p>
          {dueBadge && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", dueBadge.className)}>
              {dueBadge.text}
            </span>
          )}
        </div>

        {/* Parent task subtitle for subtask schedules */}
        {showParentSubtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            ↳ {parentTitle}
          </p>
        )}

        <p className="mt-0.5 text-xs text-muted-foreground">
          {hours}h
          {schedule.start_time && ` · ${formatTime12(schedule.start_time)}`}
        </p>
      </button>

      {/* Checkbox or Lock */}
      {isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground mt-1">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              {lockState === "tomorrow"
                ? "Scheduled for tomorrow. Focus on today!"
                : "Scheduled for a future date."}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCompleted) onComplete(schedule.id);
          }}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 mt-1",
            isCompleted
              ? "border-primary bg-primary text-primary-foreground scale-95"
              : "border-border hover:border-primary hover:scale-110"
          )}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
