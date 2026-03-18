import { useState, useEffect } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ChevronDown, ChevronRight, Target, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import type { Tables } from "@/integrations/supabase/types";

const FOCUS_STORAGE_KEY = "planner_high_focus";

function getTodayFocus(): string | null {
  try {
    const stored = localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.date !== format(new Date(), "yyyy-MM-dd")) {
      localStorage.removeItem(FOCUS_STORAGE_KEY);
      return null;
    }
    return parsed.taskId;
  } catch {
    return null;
  }
}

function setTodayFocus(taskId: string) {
  localStorage.setItem(
    FOCUS_STORAGE_KEY,
    JSON.stringify({ date: format(new Date(), "yyyy-MM-dd"), taskId })
  );
}

interface HighFocusSectionProps {
  items: ScheduleWithTask[];
  lockState: "unlocked" | "tomorrow" | "future" | "past";
  isToday: boolean;
  onComplete: (scheduleId: string) => void;
  onOpenFocus: (scheduleId: string) => void;
  allTodaySchedules: ScheduleWithTask[];
  onCompleteSubtask?: (subtaskId: string, taskId: string) => void;
  onEdit?: (task: Tables<"tasks"> & { subtasks?: Tables<"subtasks">[] }) => void;
  onViewNotes?: (task: Tables<"tasks">) => void;
  onUpdateStatus?: (scheduleId: string, status: string) => void;
}

export function HighFocusSection({
  items,
  lockState,
  isToday: isTodayColumn,
  onComplete,
  onOpenFocus,
  allTodaySchedules,
  onCompleteSubtask,
  onEdit,
  onViewNotes,
  onUpdateStatus,
}: HighFocusSectionProps) {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    if (isTodayColumn) {
      setFocusedTaskId(getTodayFocus());
    }
  }, [isTodayColumn]);

  // Not today → show all normally (no focus filtering)
  if (!isTodayColumn || lockState === "past") {
    return (
      <div className="space-y-2 animate-in fade-in-0 duration-150">
        {items.map((s) => (
          <PlannerTaskCard
            key={s.id}
            schedule={s}
            lockState={lockState}
            onComplete={onComplete}
            onOpenFocus={onOpenFocus}
            allTodaySchedules={allTodaySchedules}
            isFocusedProject={false}
            onCompleteSubtask={onCompleteSubtask}
            onEdit={onEdit}
            onViewNotes={onViewNotes}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>
    );
  }

  // Deduplicate by task_id for focus selection
  const uniqueTasks = new Map<string, ScheduleWithTask>();
  items.forEach((s) => {
    if (!uniqueTasks.has(s.task_id)) uniqueTasks.set(s.task_id, s);
  });
  const uniqueItems = Array.from(uniqueTasks.values()).sort((a, b) => {
    const dueDateA = a.task?.due_date ? parseISO(a.task.due_date).getTime() : Infinity;
    const dueDateB = b.task?.due_date ? parseISO(b.task.due_date).getTime() : Infinity;
    return dueDateA - dueDateB;
  });

  // Validate that focusedTaskId still exists in current items
  const focusValid = focusedTaskId && uniqueItems.some((s) => s.task_id === focusedTaskId);

  // ── No focus selected → show picker ──
  if (!focusValid) {
    return (
      <div className="space-y-2 animate-in fade-in-0 duration-150">
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">What's your focus today?</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pick one high-priority task to focus on. The rest will be hidden.
          </p>
          <div className="space-y-2">
            {uniqueItems.map((s) => {
              const dueDate = s.task?.due_date;
              const daysLeft = dueDate ? differenceInCalendarDays(parseISO(dueDate), new Date()) : null;
              const isNoDueDate = daysLeft === null || daysLeft >= 360;
              const dueLabel = isNoDueDate ? "No Due Date"
                : daysLeft < 0 ? "Overdue"
                : daysLeft === 0 ? "Due today"
                : daysLeft === 1 ? "Due tomorrow"
                : `${daysLeft}d left`;
              const dueColor = isNoDueDate ? "text-muted-foreground"
                : daysLeft! <= 0 ? "text-destructive"
                : daysLeft! <= 2 ? "text-orange-500"
                : "text-muted-foreground";

              return (
                <button
                  key={s.task_id}
                  onClick={() => {
                    setTodayFocus(s.task_id);
                    setFocusedTaskId(s.task_id);
                    // Auto-set to in_progress when selected as focus
                    if (onUpdateStatus) {
                      const schedulesForTask = items.filter((item) => item.task_id === s.task_id);
                      schedulesForTask.forEach((item) => {
                        if (item.status !== "in_progress" && item.status !== "completed") {
                          onUpdateStatus(item.id, "in_progress");
                        }
                      });
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate flex-1">
                    {s.task?.title || s.display_title || "Untitled"}
                  </span>
                  {dueLabel && (
                    <span className={cn("text-[11px] font-medium shrink-0 flex items-center gap-1", dueColor)}>
                      <Clock className="h-3 w-3" />
                      {dueLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Focus selected → show focused + collapsible others ──
  const focusedItems = items.filter((s) => s.task_id === focusedTaskId);
  const otherItems = items.filter((s) => s.task_id !== focusedTaskId);
  // Deduplicate others by task_id
  const otherUnique = new Map<string, ScheduleWithTask>();
  otherItems.forEach((s) => {
    if (!otherUnique.has(s.task_id)) otherUnique.set(s.task_id, s);
  });
  const otherUniqueItems = Array.from(otherUnique.values());

  const handleSwitchFocus = (taskId: string) => {
    setTodayFocus(taskId);
    setFocusedTaskId(taskId);
    setShowOthers(false);
    // Auto-set to in_progress when switched as focus
    if (onUpdateStatus) {
      const schedulesForTask = items.filter((item) => item.task_id === taskId);
      schedulesForTask.forEach((item) => {
        if (item.status !== "in_progress" && item.status !== "completed") {
          onUpdateStatus(item.id, "in_progress");
        }
      });
    }
  };

  return (
    <div className="space-y-2 animate-in fade-in-0 duration-150">
      {/* Focused task — auto-expanded */}
      {focusedItems.map((s) => (
        <PlannerTaskCard
          key={s.id}
          schedule={s}
          lockState={lockState}
          onComplete={onComplete}
          onOpenFocus={onOpenFocus}
          allTodaySchedules={allTodaySchedules}
          isFocusedProject={true}
          defaultExpanded={true}
          onCompleteSubtask={onCompleteSubtask}
          onEdit={onEdit}
          onViewNotes={onViewNotes}
          onUpdateStatus={onUpdateStatus}
        />
      ))}

      {/* Collapsible others */}
      {otherUniqueItems.length > 0 && (
        <div>
          {showOthers && (
            <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150 mb-1.5">
              {otherItems.map((s) => (
                <div key={s.id} className="opacity-60">
                  <PlannerTaskCard
                    schedule={s}
                    lockState={lockState}
                    onComplete={onComplete}
                    onOpenFocus={onOpenFocus}
                    allTodaySchedules={allTodaySchedules}
                    isFocusedProject={false}
                    onCompleteSubtask={onCompleteSubtask}
                    onEdit={onEdit}
                    onViewNotes={onViewNotes}
                    onSwitchFocus={handleSwitchFocus}
                    onUpdateStatus={onUpdateStatus}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowOthers((prev) => !prev)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showOthers ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                Hide main tasks
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show {otherUniqueItems.length} more main {otherUniqueItems.length === 1 ? "task" : "tasks"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
