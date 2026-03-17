import { useState, useMemo } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ChevronDown, ChevronRight, Plus, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { FocusPrompt } from "./FocusPrompt";
import { useDailyFocus } from "@/hooks/useDailyFocus";
import type { ScheduleWithTask } from "@/hooks/usePlanner";

const PRIORITY_ORDER = ["high", "medium", "low", "none"];

const PRIORITY_META: Record<string, { label: string; dot: string; header: string }> = {
  high: { label: "HIGH", dot: "bg-red-500", header: "text-red-600 dark:text-red-400" },
  medium: { label: "MED", dot: "bg-amber-500", header: "text-amber-600 dark:text-amber-400" },
  low: { label: "LOW", dot: "bg-emerald-500", header: "text-emerald-600 dark:text-emerald-400" },
  none: { label: "NONE", dot: "bg-gray-400", header: "text-muted-foreground" },
};

interface DayColumnProps {
  date: Date;
  schedules: ScheduleWithTask[];
  onComplete: (scheduleId: string) => void;
  onAddTask: () => void;
  onOpenFocus: (scheduleId: string) => void;
  userName?: string;
  onCompleteSubtask?: (subtaskId: string, taskId: string) => void;
}

export function DayColumn({ date, schedules, onComplete, onAddTask, onOpenFocus, userName, onCompleteSubtask }: DayColumnProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    completed: true,
  });

  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);
  const lockState = isCurrentDay ? "unlocked" as const : isTomorrowDay ? "tomorrow" as const : "future" as const;

  // Daily focus system (only for today)
  const {
    focusedTaskId,
    needsPrompt,
    isWhatsNext,
    availableProjects,
    filteredSchedules,
    hiddenProjects,
    showAll,
    selectFocus,
    toggleShowAll,
  } = useDailyFocus(date, schedules);

  const activeSchedules = isCurrentDay ? filteredSchedules : schedules;

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Group schedules by priority (use filtered schedules for today)
  const grouped = useMemo(() => {
    const groups: Record<string, ScheduleWithTask[]> = {
      high: [], medium: [], low: [], none: [], completed: [],
    };
    activeSchedules.forEach((s) => {
      const isProjectSubtask = s.task?.subtasks && s.task.subtasks.length > 0 && s.subtask_id;
      if ((s.status === "completed" || s.status === "skipped") && !isProjectSubtask) {
        groups.completed.push(s);
      } else {
        const p = s.task?.priority || "none";
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
      {isCurrentDay && needsPrompt && availableProjects.length > 0 && (
        <FocusPrompt
          userName={userName || "there"}
          projects={availableProjects}
          isWhatsNext={isWhatsNext}
          onSelect={selectFocus}
        />
      )}

      {/* Priority Groups */}
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
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Completed */}
        {totalCompleted > 0 && (
          <div>
            <button
              onClick={() => toggleGroup("completed")}
              className="mb-2 flex w-full items-center gap-2 text-xs"
            >
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                DONE ({totalCompleted})
              </span>
              <div className="flex-1" />
              {collapsedGroups.completed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {!collapsedGroups.completed && (
              <div className="space-y-2 animate-in fade-in-0 duration-150">
                {grouped.completed.map((s) => (
                  <PlannerTaskCard
                    key={s.id}
                    schedule={s}
                    lockState={lockState}
                    onComplete={onComplete}
                    onOpenFocus={onOpenFocus}
                    allTodaySchedules={activeSchedules}
                    isFocusedProject={isCurrentDay && s.task_id === focusedTaskId}
                    onCompleteSubtask={onCompleteSubtask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hidden Projects Toggle (when focused) */}
        {isCurrentDay && focusedTaskId && hiddenProjects.length > 0 && (
          <div>
            <button
              onClick={toggleShowAll}
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-muted/50"
            >
              {showAll ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="font-medium text-muted-foreground">
                {showAll ? "Hide other projects" : `Show ${hiddenProjects.length} other project${hiddenProjects.length > 1 ? "s" : ""}`}
              </span>
            </button>

            {showAll && (
              <div className="space-y-2 animate-in fade-in-0 duration-150">
                {hiddenProjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border-l-4 border-l-border px-3 py-3 bg-muted/20 opacity-50 cursor-not-allowed select-none"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-muted-foreground truncate">
                        {s.task?.title || "Untitled"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        Locked — finish your current focus first
                      </p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
