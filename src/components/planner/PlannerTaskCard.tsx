import { useState, useRef, useEffect } from "react";
import { Check, Lock, RefreshCw, ChevronDown, ChevronUp, CircleDot, MoreVertical, MessageSquare, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInCalendarDays, parseISO, format, isToday, isTomorrow, addDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-primary",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-primary",
};

interface PlannerTaskCardProps {
  schedule: ScheduleWithTask;
  lockState: "unlocked" | "tomorrow" | "future";
  onComplete: (scheduleId: string) => void;
  onOpenFocus?: (scheduleId: string) => void;
  allTodaySchedules?: ScheduleWithTask[];
  isFocusedProject?: boolean;
  defaultExpanded?: boolean;
  onCompleteSubtask?: (subtaskId: string, taskId: string) => void;
  onEdit?: (task: Tables<"tasks"> & { subtasks?: Tables<"subtasks">[] }) => void;
  onViewNotes?: (task: Tables<"tasks">) => void;
  onSwitchFocus?: (taskId: string) => void;
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
  allTodaySchedules,
  isFocusedProject,
  defaultExpanded,
  onCompleteSubtask,
  onEdit,
  onViewNotes,
  onSwitchFocus,
}: PlannerTaskCardProps) {
  const task = schedule.task;
  const isCompleted = schedule.status === "completed";
  const isLocked = lockState !== "unlocked";
  const priority = task?.priority === "none" || task?.priority === "low" ? "medium" : (task?.priority || "medium");
  const hours = Number(schedule.allocated_hours);
  const isRecurring = (task as any)?.task_type === "recurring";
  const isProject = task?.subtasks && task.subtasks.length > 0;

  const subtaskId = schedule.subtask_id;
  const displayTitle = schedule.display_title || task?.title || "Untitled";
  const parentTitle = task?.title || "";
  const showParentSubtitle = subtaskId && displayTitle !== parentTitle;

  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  useEffect(() => {
    if (defaultExpanded !== undefined) setExpanded(defaultExpanded);
  }, [defaultExpanded]);
  
  // Debounce guard for checkbox clicks
  const completingRef = useRef(false);

  const handleComplete = (scheduleId: string) => {
    if (completingRef.current) return;
    completingRef.current = true;
    onComplete(scheduleId);
    setTimeout(() => { completingRef.current = false; }, 1500);
  };

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
      dueBadge = { text: "Due today", className: "bg-destructive text-destructive-foreground" };
      borderExtra = "ring-2 ring-destructive/40";
    } else if (daysUntilDue === 1) {
      dueBadge = { text: "Due tomorrow", className: "bg-destructive/80 text-destructive-foreground" };
      borderExtra = "ring-1 ring-destructive/30";
    } else if (daysUntilDue === 2) {
      dueBadge = { text: "2 days left", className: "bg-warning text-warning-foreground" };
      borderExtra = "ring-1 ring-warning/30";
    }
  }

  const opacity =
    lockState === "future"
      ? "opacity-50"
      : lockState === "tomorrow"
      ? "opacity-70"
      : "opacity-100";

  // ─── Expanded Project View ──────────────────────────────────────────────
  if (isProject && expanded) {
    const sortedSubtasks = [...allSubtasks].sort((a, b) => a.order_index - b.order_index);

    return (
      <div
        className={cn(
          "relative rounded-xl border-l-4 p-4 transition-all duration-200",
          PRIORITY_BORDER[priority],
          "bg-card shadow-sm",
          borderExtra,
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={() => setExpanded(false)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{parentTitle}</p>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dueDate ? `Due ${format(parseISO(dueDate), "MMM d")}` : "No deadline"} · {doneSteps}/{totalSteps} done
            </p>
          </button>
          {dueBadge && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0", dueBadge.className)}>
              {dueBadge.text}
            </span>
          )}
          {task && !isLocked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => onEdit?.({ ...task, subtasks: task.subtasks || [] })}>
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewNotes?.(task)}>
                  {task.description ? "View Notes" : "Add Notes"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* All subtasks */}
        <div className="space-y-0.5">
          {sortedSubtasks.map((st, i) => {
            const isDone = st.is_completed;
            const isCurrent = st.id === subtaskId && !isDone;
            const priorDone = sortedSubtasks.slice(0, i).every(
              (prev) => prev.is_completed
            );
            // When focused, all uncompleted subtasks are unlocked
            const canCheck = isFocusedProject
              ? !isLocked && !isDone
              : !isLocked && !isDone && (isCurrent || priorDone);
            const isFuture = isFocusedProject
              ? false
              : !isDone && !isCurrent && !priorDone;

            const stSchedule = allTodaySchedules?.find((s) => s.subtask_id === st.id);

            return (
              <div
                key={st.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-all",
                  isCurrent && "bg-primary/5",
                  isDone && "opacity-50",
                  isFuture && "opacity-35",
                )}
              >
                {canCheck ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stSchedule) {
                        handleComplete(stSchedule.id);
                      } else if (onCompleteSubtask) {
                        onCompleteSubtask(st.id, schedule.task_id);
                      }
                    }}
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-border transition-all hover:border-primary hover:scale-110"
                  />
                ) : isDone ? (
                  <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border/60 text-muted-foreground/50">
                    <Lock className="h-2.5 w-2.5" />
                  </div>
                )}

                <span className={cn(
                  "flex-1 min-w-0 truncate text-[13px]",
                  (isCurrent || (isFocusedProject && !isDone)) && "font-medium text-foreground",
                  isDone && "line-through text-muted-foreground",
                  isFuture && "text-muted-foreground",
                )}>
                  {st.title}
                </span>

                {isDone && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Done</span>
                )}
                {isCurrent && !isFocusedProject && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">Today</span>
                )}
                {isFuture && (
                  <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
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
        "group relative flex items-center gap-3 rounded-xl border-l-4 px-3 py-3 transition-all duration-200 select-none",
        PRIORITY_BORDER[priority],
        isCompleted && "opacity-50",
        isLocked ? "bg-muted/30" : "bg-card shadow-sm hover:shadow-md",
        borderExtra,
        opacity
      )}
    >
      {/* Content */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => {
          if (isProject && !isLocked && priority === "high") {
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
              isCompleted && !isProject ? "line-through text-muted-foreground" : 
              isCompleted && isProject && totalSteps > 0 && doneSteps === totalSteps ? "line-through text-muted-foreground" :
              "text-foreground"
            )}
          >
            {isProject ? parentTitle : displayTitle}
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

        {/* Non-project subtitle */}
        {!isProject && showParentSubtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {parentTitle}
          </p>
        )}

        {/* Hours (only for non-project tasks) */}
        {hours > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hours}h
            {schedule.start_time && ` · ${formatTime12(schedule.start_time)}`}
          </p>
        )}
      </button>

      {/* Notes button — dot indicator when notes exist */}
      {!isLocked && task && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewNotes?.(task);
          }}
          className={cn(
            "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            task.description
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {task.description && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      )}

      {/* 3-dot menu */}
      {!isLocked && !isCompleted && task && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {onSwitchFocus && (
              <DropdownMenuItem onClick={() => onSwitchFocus(schedule.task_id)}>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                Switch focus here
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit?.({ ...task, subtasks: task.subtasks || [] })}>
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewNotes?.(task)}>
              {task.description ? "View Notes" : "Add Notes"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Lock icon for future tasks */}
      {isLocked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              {lockState === "tomorrow"
                ? "Scheduled for tomorrow"
                : "Scheduled for a future date"}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
