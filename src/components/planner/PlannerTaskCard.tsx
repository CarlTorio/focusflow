import { useState } from "react";
import { Check, Lock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInCalendarDays, parseISO, format, isToday, isTomorrow, addDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { Tables } from "@/integrations/supabase/types";

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
  /** All schedules for today (for advancing) */
  allTodaySchedules?: ScheduleWithTask[];
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export function PlannerTaskCard({
  schedule,
  lockState,
  onComplete,
  onOpenFocus,
  allTodaySchedules,
}: PlannerTaskCardProps) {
  const task = schedule.task;
  const isCompleted = schedule.status === "completed";
  const isLocked = lockState !== "unlocked";
  const priority = task?.priority || "none";
  const hours = Number(schedule.allocated_hours);
  const isRecurring = (task as any)?.task_type === "recurring";
  const isProject = task?.subtasks && task.subtasks.length > 0;

  const subtaskId = schedule.subtask_id;
  const displayTitle = schedule.display_title || task?.title || "Untitled";
  const parentTitle = task?.title || "";
  const showParentSubtitle = subtaskId && displayTitle !== parentTitle;

  const [expanded, setExpanded] = useState(false);

  // Project progress
  const allSubtasks = task?.subtasks || [];
  const completedSubtasks = allSubtasks.filter((st) => st.is_completed);
  const totalSteps = allSubtasks.length;
  const doneSteps = completedSubtasks.length;
  const progressPct = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;
  const progressColor = progressPct > 60 ? "bg-emerald-500" : progressPct >= 30 ? "bg-amber-500" : "bg-red-500";

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

  // ─── Expanded Project View ──────────────────────────────────────────────
  if (isProject && expanded) {
    const sortedSubtasks = [...allSubtasks].sort((a, b) => a.order_index - b.order_index);

    return (
      <div
        className={cn(
          "relative rounded-xl border-l-4 p-3 transition-all duration-200",
          PRIORITY_BORDER[priority],
          "bg-card shadow-sm",
          borderExtra,
        )}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(false)}
          className="flex items-start gap-3 w-full text-left mb-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: task?.icon_color || "hsl(var(--secondary))" }}>
            {emoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{parentTitle}</p>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Due: {dueDate ? format(parseISO(dueDate), "MMM d") : "—"} · {doneSteps}/{totalSteps} subtasks done
            </p>
          </div>
          {dueBadge && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0", dueBadge.className)}>
              {dueBadge.text}
            </span>
          )}
        </button>

        {/* Progress bar */}
        <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* All subtasks */}
        <div className="space-y-1.5">
          {sortedSubtasks.map((st, i) => {
            const isDone = st.is_completed;
            // Find the schedule for this subtask to get date info
            const isCurrent = st.id === subtaskId && !isDone;
            // Check if all prior subtasks are done (for advancing)
            const priorDone = sortedSubtasks.slice(0, i).every(
              (prev) => prev.is_completed
            );
            const canCheck = !isLocked && !isDone && (isCurrent || priorDone);
            const isFuture = !isDone && !isCurrent && !priorDone;

            // Find this subtask's schedule to get date
            const stSchedule = allTodaySchedules?.find((s) => s.subtask_id === st.id);

            return (
              <div
                key={st.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all",
                  isCurrent && "bg-primary/5 font-semibold",
                  isDone && "opacity-50",
                  isFuture && "opacity-40",
                )}
              >
                {/* Checkbox */}
                {canCheck ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stSchedule) {
                        onComplete(stSchedule.id);
                      }
                    }}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      "border-border hover:border-primary hover:scale-110"
                    )}
                  />
                ) : isDone ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                  </div>
                )}

                {/* Title */}
                <span className={cn(
                  "flex-1 min-w-0 truncate",
                  isDone && "line-through text-muted-foreground",
                )}>
                  {i + 1}. {st.title}
                </span>

                {/* Status badge */}
                {isDone && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Done ✓</span>
                )}
                {isCurrent && (
                  <span className="text-[10px] font-bold text-primary shrink-0">Today</span>
                )}
                {isFuture && (
                  <span className="text-[10px] text-muted-foreground shrink-0">🔒</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Collapsed View ─────────────────────────────────────────────────────
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
        onClick={() => {
          if (isProject && !isLocked) {
            setExpanded(true);
          } else if (!isLocked && !isCompleted) {
            onOpenFocus?.(schedule.id);
          }
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform active:scale-95"
        style={{ backgroundColor: task?.icon_color || "hsl(var(--secondary))" }}
      >
        {emoji}
      </button>

      {/* Content */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => {
          if (isProject && !isLocked) {
            setExpanded(true);
          } else if (!isLocked && !isCompleted) {
            onOpenFocus?.(schedule.id);
          }
        }}
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

        {/* Project subtitle with progress */}
        {isProject && showParentSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">
              ↳ {parentTitle}
            </p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {doneSteps}/{totalSteps} steps
            </span>
          </div>
        )}

        {/* Non-project subtitle */}
        {!isProject && showParentSubtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            ↳ {parentTitle}
          </p>
        )}

        {/* Hours (only for non-project tasks) */}
        {hours > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hours}h
            {schedule.start_time && ` · ${formatTime12(schedule.start_time)}`}
          </p>
        )}

        {/* Expand hint for projects */}
        {isProject && !isLocked && !isCompleted && (
          <div className="flex items-center gap-1 mt-1">
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Tap to see all steps</span>
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
