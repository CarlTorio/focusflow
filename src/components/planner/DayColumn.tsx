import { useState, useMemo } from "react";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { ChevronDown, ChevronRight, Plus, Eye, EyeOff, Lock, CheckCircle2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { FocusPrompt } from "./FocusPrompt";
import { EditProjectSheet } from "./EditProjectSheet";
import { useDailyFocus } from "@/hooks/useDailyFocus";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import type { Tables } from "@/integrations/supabase/types";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const PRIORITY_ORDER = ["high", "medium", "low"];

const PRIORITY_META: Record<string, { label: string; dot: string; header: string }> = {
  high: { label: "HIGH", dot: "bg-red-500", header: "text-red-600 dark:text-red-400" },
  medium: { label: "MED", dot: "bg-amber-500", header: "text-amber-600 dark:text-amber-400" },
  low: { label: "LOW", dot: "bg-emerald-500", header: "text-emerald-600 dark:text-emerald-400" },
};

interface DayColumnProps {
  date: Date;
  schedules: ScheduleWithTask[];
  onComplete: (scheduleId: string) => void;
  onAddTask: () => void;
  onOpenFocus: (scheduleId: string) => void;
  userName?: string;
  onCompleteSubtask?: (subtaskId: string, taskId: string) => void;
  onUpdateTask?: (input: {
    taskId: string;
    title?: string;
    priority?: string;
    due_date?: string;
    description?: string;
    addSubtasks?: { title: string }[];
    removeSubtaskIds?: string[];
  }) => void;
}

export function DayColumn({ date, schedules, onComplete, onAddTask, onOpenFocus, userName, onCompleteSubtask, onUpdateTask }: DayColumnProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    completed: true,
  });
  const [editTask, setEditTask] = useState<(Tables<"tasks"> & { subtasks?: Tables<"subtasks">[] }) | null>(null);
  const [notesTask, setNotesTask] = useState<Tables<"tasks"> | null>(null);
  const [notesText, setNotesText] = useState("");

  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);
  const isPastDay = !isCurrentDay && isPast(startOfDay(date));
  const lockState = isCurrentDay ? "unlocked" as const : isTomorrowDay ? "tomorrow" as const : "future" as const;

  // Daily focus system (only for today)
  const {
    focusedTaskId,
    needsPrompt,
    isWhatsNext,
    focusedAllSubtasksDone,
    availableProjects,
    otherProjects,
    filteredSchedules,
    completedTodaySchedules,
    hiddenProjects,
    showAll,
    selectFocus,
    markFocusDone,
    toggleShowAll,
  } = useDailyFocus(date, schedules);
  const [showOtherTasks, setShowOtherTasks] = useState(false);

  const activeSchedules = isCurrentDay ? filteredSchedules : schedules;

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Group schedules by priority, deduplicating project tasks by task_id
  const grouped = useMemo(() => {
    const groups: Record<string, ScheduleWithTask[]> = {
      high: [], medium: [], low: [], completed: [],
    };
    const seenProjectIds = new Set<string>();
    activeSchedules.forEach((s) => {
      const isProjectSubtask = s.task?.subtasks && s.task.subtasks.length > 0 && s.subtask_id;
      if ((s.status === "completed" || s.status === "skipped") && !isProjectSubtask) {
        groups.completed.push(s);
      } else {
        // Deduplicate: only show one card per project task
        const isProject = s.task?.subtasks && s.task.subtasks.length > 0;
        if (isProject) {
          if (seenProjectIds.has(s.task_id)) return;
          seenProjectIds.add(s.task_id);
        }
        const p = s.task?.priority === "none" ? "low" : (s.task?.priority || "low");
        groups[p] = groups[p] || [];
        groups[p].push(s);
      }
    });
    return groups;
  }, [activeSchedules]);

  const totalActive = activeSchedules.filter(
    (s) => s.status !== "completed" && s.status !== "skipped"
  ).length;
  const totalCompleted = grouped.completed.length;

  const promptActive = isCurrentDay && needsPrompt;

  return (
    <div className="flex-1 min-w-0">
      {/* Day Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-heading text-foreground">
            {format(date, "d")}
          </span>
          <span className="text-sm font-medium uppercase text-muted-foreground">
            {format(date, "EEE")}
          </span>
          {isCurrentDay && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Today
            </span>
          )}
          {isTomorrowDay && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Tomorrow
            </span>
          )}
        </div>
      </div>

      {/* Focus Selection Prompt (only today) */}
      {promptActive && (availableProjects.length > 0 || otherProjects.length > 0) && (
        <FocusPrompt
          userName={userName || "there"}
          projects={availableProjects}
          otherProjects={otherProjects}
          isWhatsNext={isWhatsNext}
          onSelect={selectFocus}
        />
      )}

      {/* Priority Groups — hidden when focus prompt is active */}
      <div className="space-y-4">
        {!promptActive && PRIORITY_ORDER.map((priority) => {
          const items = grouped[priority] || [];
          if (items.length === 0) return null;
          const meta = PRIORITY_META[priority];
          const isCollapsed = collapsedGroups[priority];

          return (
            <div key={priority}>
              <button
                onClick={() => toggleGroup(priority)}
                className="mb-2 flex w-full items-center gap-2 text-xs"
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", meta.dot)} />
                <span className={cn("font-bold uppercase tracking-wider", meta.header)}>
                  {meta.label} ({items.length})
                </span>
                <div className="flex-1" />
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {!isCollapsed && (
                <div className="space-y-2 animate-in fade-in-0 duration-150">
                  {items.map((s) => (
                    <PlannerTaskCard
                      key={s.id}
                      schedule={s}
                      lockState={lockState}
                      onComplete={onComplete}
                      onOpenFocus={onOpenFocus}
                      allTodaySchedules={activeSchedules}
                      isFocusedProject={isCurrentDay && s.task_id === focusedTaskId}
                      onCompleteSubtask={onCompleteSubtask}
                      onEdit={(t) => setEditTask(t)}
                      onViewNotes={(t) => { setNotesTask(t); setNotesText(t.description || ""); }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Other tasks toggle (when focused, not during prompt) */}
        {isCurrentDay && focusedTaskId && !needsPrompt && completedTodaySchedules.length > 0 && (
          <div>
            <button
              onClick={() => setShowOtherTasks((p) => !p)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-muted/50"
            >
              {showOtherTasks ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="font-medium text-muted-foreground">
                {showOtherTasks ? "Hide other tasks" : `Show ${completedTodaySchedules.length} other task${completedTodaySchedules.length > 1 ? "s" : ""} today`}
              </span>
            </button>

            {showOtherTasks && (
              <div className="space-y-2 animate-in fade-in-0 duration-150">
                {completedTodaySchedules.map((s) => {
                  const isDone = s.status === "completed" || s.status === "skipped";
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-l-4 px-3 py-3 select-none",
                        isDone
                          ? "border-l-primary/30 bg-primary/5 opacity-60"
                          : "border-l-border bg-muted/20 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isDone ? "text-muted-foreground line-through" : "text-muted-foreground")}>
                          {s.task?.title || "Untitled"}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {isDone ? "Completed" : "Queued — finish your focus first"}
                        </p>
                      </div>
                      {!isDone && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalActive === 0 && totalCompleted === 0 && !needsPrompt && (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">Nothing planned</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a task to get started</p>
          </div>
        )}

        {/* All done */}
        {totalActive === 0 && totalCompleted > 0 && !needsPrompt && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold text-primary">All done for today</p>
          </div>
        )}

        {/* Add task */}
        <button
          onClick={onAddTask}
          className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Tap to add a routine or appointment</span>
        </button>
      </div>

      {/* Edit Project Sheet */}
      {editTask && (
        <EditProjectSheet
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          task={editTask}
          onSave={(input) => onUpdateTask?.(input)}
        />
      )}

      {/* Notes Sheet */}
      <Sheet open={!!notesTask} onOpenChange={(open) => !open && setNotesTask(null)}>
        <SheetContent side="bottom" className="max-h-[60vh] rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base font-bold">
              Notes — {notesTask?.title}
            </SheetTitle>
          </SheetHeader>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add notes about this project..."
            className="rounded-xl min-h-[120px] text-sm mb-4"
          />
          <Button
            onClick={() => {
              if (notesTask) {
                onUpdateTask?.({ taskId: notesTask.id, description: notesText });
                setNotesTask(null);
              }
            }}
            className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Notes
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
