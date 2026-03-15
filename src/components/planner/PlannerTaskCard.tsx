import { Check, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_EMOJIS = ["📋", "✏️", "📌", "🎯", "💡", "🔧", "📝", "🚀"];

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
  none: "border-l-gray-300 dark:border-l-gray-600",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
  none: "bg-gray-300",
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
  const subtasks = task?.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;
  const isRecurring = (task as any)?.task_type === "recurring";

  const opacity =
    lockState === "future"
      ? "opacity-50"
      : lockState === "tomorrow"
      ? "opacity-70"
      : "opacity-100";

  // Determine display title — use task title (display_title column not in schema)
  const displayTitle = task?.title || "Untitled";

  // Sub-label: show parent task hint if subtask name differs from task title
  const subLabel = (() => {
    if (hours > 0 && schedule.start_time) return null; // handled inline
    return null;
  })();

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

        <p className="mt-0.5 text-xs text-muted-foreground">
          {hours}h
          {schedule.start_time && ` · ${formatTime12(schedule.start_time)}`}
        </p>

        {/* Subtask progress */}
        {subtasks.length > 0 && !isCompleted && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {completedSubtasks}/{subtasks.length}
            </span>
          </div>
        )}
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
