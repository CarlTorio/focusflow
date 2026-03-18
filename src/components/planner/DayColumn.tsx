import { useState, useMemo } from "react";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { HighFocusSection } from "./HighFocusSection";
import { EditProjectSheet } from "./EditProjectSheet";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const PRIORITY_ORDER = ["high", "medium"];

const PRIORITY_META: Record<string, { label: string; dot: string; header: string }> = {
  high: { label: "MAIN TASK", dot: "bg-red-500", header: "text-red-600 dark:text-red-400" },
  medium: { label: "OTHER TASKS", dot: "bg-primary", header: "text-primary" },
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
  onDeleteTask?: (taskId: string) => void;
}

export function DayColumn({ date, schedules, onComplete, onAddTask, onOpenFocus, userName, onCompleteSubtask, onUpdateTask, onDeleteTask }: DayColumnProps) {
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

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Always use the incoming schedules so low/medium tasks remain visible
  const activeSchedules = schedules;

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
        return;
      }

      const isProject = s.task?.subtasks && s.task.subtasks.length > 0;
      if (isProject) {
        if (seenProjectIds.has(s.task_id)) return;
        seenProjectIds.add(s.task_id);
      }

      const priority = s.task?.priority === "none" ? "low" : (s.task?.priority || "low");
      groups[priority] = groups[priority] || [];
      groups[priority].push(s);
    });

    return groups;
  }, [activeSchedules]);

  const totalActive = activeSchedules.filter(
    (s) => s.status !== "completed" && s.status !== "skipped"
  ).length;
  const totalCompleted = grouped.completed.length;

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
          {isPastDay && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Past
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {PRIORITY_ORDER.map((priority) => {
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
                priority === "high" ? (
                  <HighFocusSection
                    items={items}
                    lockState={lockState}
                    isToday={isCurrentDay}
                    onComplete={onComplete}
                    onOpenFocus={onOpenFocus}
                    allTodaySchedules={activeSchedules}
                    onCompleteSubtask={onCompleteSubtask}
                    onEdit={(t) => setEditTask(t)}
                    onViewNotes={(t) => { setNotesTask(t); setNotesText(t.description || ""); }}
                  />
                ) : (
                  <div className="space-y-2 animate-in fade-in-0 duration-150">
                    {items.map((s) => (
                      <PlannerTaskCard
                        key={s.id}
                        schedule={s}
                        lockState={lockState}
                        onComplete={onComplete}
                        onOpenFocus={onOpenFocus}
                        allTodaySchedules={activeSchedules}
                        isFocusedProject={false}
                        onCompleteSubtask={onCompleteSubtask}
                        onEdit={(t) => setEditTask(t)}
                        onViewNotes={(t) => { setNotesTask(t); setNotesText(t.description || ""); }}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}

        {schedules.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">Nothing planned</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a task to get started</p>
          </div>
        )}

        {totalActive === 0 && totalCompleted > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-semibold text-primary">All done for today</p>
          </div>
        )}
      </div>

      {editTask && (
        <EditProjectSheet
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          task={editTask}
          onSave={(input) => onUpdateTask?.(input)}
          onDelete={(taskId) => onDeleteTask?.(taskId)}
        />
      )}

      <Dialog open={!!notesTask} onOpenChange={(open) => !open && setNotesTask(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Notes — {notesTask?.title}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add notes about this project..."
            className="rounded-xl min-h-[120px] text-sm"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
