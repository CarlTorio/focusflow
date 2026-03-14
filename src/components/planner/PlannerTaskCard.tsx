import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_EMOJIS = ["📋", "✏️", "📌", "🎯", "💡", "🔧", "📝", "🚀"];

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
  none: "border-l-gray-400",
};

interface PlannerTaskCardProps {
  schedule: ScheduleWithTask;
  lockState: "unlocked" | "tomorrow" | "future";
  onComplete: (scheduleId: string) => void;
}

export function PlannerTaskCard({ schedule, lockState, onComplete }: PlannerTaskCardProps) {
  const task = schedule.task;
  const isCompleted = schedule.status === "completed";
  const isLocked = lockState !== "unlocked";
  const emoji = task?.icon_emoji || DEFAULT_EMOJIS[Math.abs((task?.title || "").charCodeAt(0)) % DEFAULT_EMOJIS.length];
  const priority = task?.priority || "none";
  const hours = Number(schedule.allocated_hours);

  const opacity = lockState === "future" ? "opacity-50" : lockState === "tomorrow" ? "opacity-70" : "opacity-100";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-l-4 p-3 transition-all duration-200",
        PRIORITY_BORDER[priority],
        isCompleted && "opacity-60",
        isLocked ? "bg-muted/50 border-dashed" : "bg-card shadow-sm",
        opacity
      )}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: task?.icon_color || "hsl(var(--primary-light))" }}
      >
        {emoji}
      </div>

      {/* Title + hours */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
          {task?.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground">
          {schedule.start_time ? `${formatTime12(schedule.start_time)} · ` : ""}{hours}h
        </p>
      </div>

      {/* Checkbox or Lock */}
      {isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              {lockState === "tomorrow"
                ? "This task is scheduled for tomorrow. Focus on today!"
                : "This task is scheduled for a future date."}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => !isCompleted && onComplete(schedule.id)}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
            isCompleted
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary"
          )}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
