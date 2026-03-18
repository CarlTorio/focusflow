import { useState, useMemo, useEffect } from "react";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { ChevronDown, ChevronRight, ClipboardList, Check, X, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { HighFocusSection } from "./HighFocusSection";
import { QuickTasksSection } from "./QuickTasksSection";
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

const OTHER_TASKS_LIMIT = 3;

function OtherTasksList({
  items,
  lockState,
  onComplete,
  onOpenFocus,
  activeSchedules,
  onCompleteSubtask,
  onEdit,
  onViewNotes,
}: {
  items: ScheduleWithTask[];
  lockState: "unlocked" | "tomorrow" | "future" | "past";
  onComplete: (scheduleId: string) => void;
  onOpenFocus: (scheduleId: string) => void;
  activeSchedules: ScheduleWithTask[];
  onCompleteSubtask?: (subtaskId: string, taskId: string) => void;
  onEdit: (t: any) => void;
  onViewNotes: (t: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, OTHER_TASKS_LIMIT);
  const hiddenCount = items.length - OTHER_TASKS_LIMIT;

  return (
    <div className="space-y-2 animate-in fade-in-0 duration-150">
      {visible.map((s) => (
        <PlannerTaskCard
          key={s.id}
          schedule={s}
          lockState={lockState}
          onComplete={onComplete}
          onOpenFocus={onOpenFocus}
          allTodaySchedules={activeSchedules}
          isFocusedProject={false}
          onCompleteSubtask={onCompleteSubtask}
          onEdit={onEdit}
          onViewNotes={onViewNotes}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 rotate-180" />
              Hide tasks
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show {hiddenCount} more {hiddenCount === 1 ? "task" : "tasks"}
            </>
          )}
        </button>
      )}
    </div>
  );
}

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
  externalOpenSummary?: boolean;
  onSummaryOpenChange?: (open: boolean) => void;
}

export function DayColumn({ date, schedules, onComplete, onAddTask, onOpenFocus, userName, onCompleteSubtask, onUpdateTask, onDeleteTask, externalOpenSummary, onSummaryOpenChange }: DayColumnProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    completed: true,
  });
  const [editTask, setEditTask] = useState<(Tables<"tasks"> & { subtasks?: Tables<"subtasks">[] }) | null>(null);
  const [notesTask, setNotesTask] = useState<Tables<"tasks"> | null>(null);
  const [notesText, setNotesText] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const summaryOpen = externalOpenSummary !== undefined ? externalOpenSummary : showSummary;
  const setSummaryOpen = (open: boolean) => {
    if (onSummaryOpenChange) onSummaryOpenChange(open);
    setShowSummary(open);
  };

  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);
  const isPastDay = !isCurrentDay && isPast(startOfDay(date));
  const lockState = isPastDay ? "past" as const : isCurrentDay ? "unlocked" as const : isTomorrowDay ? "tomorrow" as const : "future" as const;

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

      const priority = s.task?.priority === "none" || s.task?.priority === "low" ? "medium" : (s.task?.priority || "medium");
      groups[priority] = groups[priority] || [];
      groups[priority].push(s);
    });

    // Sort "Other Tasks" by due date ascending (earliest due date first)
    groups.medium.sort((a, b) => {
      const dateA = a.task?.due_date || "9999-12-31";
      const dateB = b.task?.due_date || "9999-12-31";
      return dateA.localeCompare(dateB);
    });

    return groups;
  }, [activeSchedules]);

  const totalActive = activeSchedules.filter(
    (s) => s.status !== "completed" && s.status !== "skipped"
  ).length;
  const totalCompleted = grouped.completed.length;

  // Routine data for past date summary
  const [routineSummary, setRoutineSummary] = useState<{ completed: string[]; missed: string[] } | null>(null);

  useEffect(() => {
    if (!summaryOpen || !isPastDay) return;
    const dateStr = format(date, "yyyy-MM-dd");
    (async () => {
      const { data: routines } = await supabase
        .from("routines")
        .select("id, title")
        .eq("is_active", true);
      const { data: completions } = await supabase
        .from("routine_completions")
        .select("routine_id")
        .eq("completed_date", dateStr);
      const completedIds = new Set((completions || []).map(c => c.routine_id));
      const allRoutines = routines || [];
      setRoutineSummary({
        completed: allRoutines.filter(r => completedIds.has(r.id)).map(r => r.title),
        missed: allRoutines.filter(r => !completedIds.has(r.id)).map(r => r.title),
      });
    })();
  }, [summaryOpen, isPastDay, date]);

  // Summary data for past dates
  const summaryData = useMemo(() => {
    if (!isPastDay) return null;
    
    const completedTasks = activeSchedules.filter(s => s.status === "completed");
    
    // Group completed by priority
    const completedMain = completedTasks.filter(s => {
      const p = s.task?.priority === "none" || s.task?.priority === "low" ? "medium" : (s.task?.priority || "medium");
      return p === "high";
    });
    const completedOther = completedTasks.filter(s => {
      const p = s.task?.priority === "none" || s.task?.priority === "low" ? "medium" : (s.task?.priority || "medium");
      return p !== "high";
    });
    
    // Completed subtasks across all projects
    const allSubtasksDone: { taskTitle: string; subtaskTitle: string }[] = [];
    const seenTasks = new Set<string>();
    activeSchedules.forEach(s => {
      if (seenTasks.has(s.task_id) || !s.task?.subtasks) return;
      seenTasks.add(s.task_id);
      s.task.subtasks.filter(st => st.is_completed).forEach(st => {
        allSubtasksDone.push({ taskTitle: s.task!.title, subtaskTitle: st.title });
      });
    });

    return {
      completedMain,
      completedOther,
      allSubtasksDone,
      totalCompleted: completedTasks.length,
    };
  }, [isPastDay, activeSchedules]);

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
                  <OtherTasksList
                    items={items}
                    lockState={lockState}
                    onComplete={onComplete}
                    onOpenFocus={onOpenFocus}
                    activeSchedules={activeSchedules}
                    onCompleteSubtask={onCompleteSubtask}
                    onEdit={(t) => setEditTask(t)}
                    onViewNotes={(t) => { setNotesTask(t); setNotesText(t.description || ""); }}
                  />
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

      {/* Past Day Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              📋 Summary — {format(date, "EEEE, MMMM d")}
            </DialogTitle>
          </DialogHeader>
          
          {summaryData && (
            <div className="space-y-4">
              {/* Stats overview */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-primary/10 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{summaryData.totalCompleted}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Tasks Done</p>
                </div>
                <div className="flex-1 rounded-xl bg-primary/10 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{summaryData.allSubtasksDone.length}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Subtasks Done</p>
                </div>
              </div>

              {/* Main Tasks completed */}
              {summaryData.completedMain.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-xs font-bold uppercase tracking-wider text-destructive">Main Tasks Done</span>
                  </div>
                  <div className="space-y-1">
                    {summaryData.completedMain.map(s => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{s.display_title || s.task?.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Tasks completed */}
              {summaryData.completedOther.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Other Tasks Done</span>
                  </div>
                  <div className="space-y-1">
                    {summaryData.completedOther.map(s => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{s.display_title || s.task?.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks completed */}
              {summaryData.allSubtasksDone.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Subtasks Completed</span>
                  </div>
                  <div className="space-y-1">
                    {summaryData.allSubtasksDone.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-foreground block truncate">{item.subtaskTitle}</span>
                          <span className="text-[10px] text-muted-foreground">{item.taskTitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Routine Summary */}
              {routineSummary && (routineSummary.completed.length > 0 || routineSummary.missed.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-3.5 w-3.5 text-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Daily Routine</span>
                  </div>
                  <div className="space-y-1">
                    {routineSummary.completed.map((title, i) => (
                      <div key={`rc-${i}`} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{title}</span>
                      </div>
                    ))}
                    {routineSummary.missed.map((title, i) => (
                      <div key={`rm-${i}`} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                        <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summaryData.totalCompleted === 0 && summaryData.allSubtasksDone.length === 0 && (!routineSummary || (routineSummary.completed.length === 0 && routineSummary.missed.length === 0)) && (
                <p className="text-sm text-muted-foreground text-center py-4">No activity recorded for this day.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

