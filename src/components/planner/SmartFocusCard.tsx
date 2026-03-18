import { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Clock, ArrowRight, Coffee, Check, Lock, MoreVertical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import type { EnergyLevel } from "./EnergyLevelPrompt";

const SMART_FOCUS_KEY = "smart_focus_selected";

type TaskWithSubtasks = Tables<"tasks"> & {
  subtasks: Tables<"subtasks">[];
};

function getDifficultyFromTags(tags: string[] | null): number {
  if (!tags) return 5;
  const tag = tags.find((t) => t.startsWith("difficulty:"));
  if (!tag) return 5;
  const val = parseInt(tag.split(":")[1], 10);
  return isNaN(val) ? 5 : val;
}

interface SmartFocusCardProps {
  tasks: TaskWithSubtasks[];
  energyLevel: EnergyLevel;
  onCompleteSubtask: (subtaskId: string, taskId: string) => void;
  onChangeEnergy: () => void;
}

// ─── Urgency Scoring ───────────────────────────────────────────────────────
function calculateUrgencyScore(task: TaskWithSubtasks): number {
  const daysUntilDue = differenceInCalendarDays(parseISO(task.due_date), new Date());
  const subtasks = task.subtasks || [];
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.is_completed).length;
  const remaining = total - completed;
  const progressPct = total > 0 ? completed / total : 0;

  let dueDateScore: number;
  if (daysUntilDue <= 0) dueDateScore = 100;
  else if (daysUntilDue === 1) dueDateScore = 90;
  else if (daysUntilDue <= 3) dueDateScore = 70;
  else if (daysUntilDue <= 7) dueDateScore = 40;
  else dueDateScore = 20;

  const progressPenalty = (1 - progressPct) * 30;

  let almostDoneBonus = 0;
  if (remaining <= 2 && remaining > 0) almostDoneBonus = 25;

  return dueDateScore + progressPenalty + almostDoneBonus;
}

function sortByEnergyLevel(
  tasks: { task: TaskWithSubtasks; score: number }[],
  energyLevel: EnergyLevel
): { task: TaskWithSubtasks; score: number }[] {
  return [...tasks].sort((a, b) => {
    const scoreDiff = Math.abs(a.score - b.score);
    if (scoreDiff <= 10) {
      const diffA = getDifficultyFromTags(a.task.tags);
      const diffB = getDifficultyFromTags(b.task.tags);
      if (energyLevel === "high") return diffB - diffA; // hardest first
      // Low energy: boost almost-done tasks
      const remA = a.task.subtasks.filter((s) => !s.is_completed).length;
      const remB = b.task.subtasks.filter((s) => !s.is_completed).length;
      if (remA <= 2 && remA > 0 && remB > 2) return -1;
      if (remB <= 2 && remB > 0 && remA > 2) return 1;
      return diffA - diffB; // easiest first
    }
    return b.score - a.score;
  });
}

function getStoredFocus(): string | null {
  try {
    const stored = localStorage.getItem(SMART_FOCUS_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.date !== format(new Date(), "yyyy-MM-dd")) {
      localStorage.removeItem(SMART_FOCUS_KEY);
      return null;
    }
    return parsed.taskId;
  } catch {
    return null;
  }
}

function setStoredFocus(taskId: string) {
  localStorage.setItem(
    SMART_FOCUS_KEY,
    JSON.stringify({ date: format(new Date(), "yyyy-MM-dd"), taskId })
  );
}

function clearStoredFocus() {
  localStorage.removeItem(SMART_FOCUS_KEY);
}

function getDueLabel(dueDate: string): { text: string; color: string } {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  const isNoDueDate = days >= 360;
  if (isNoDueDate) return { text: "No Due Date", color: "text-muted-foreground" };
  if (days < 0) return { text: "OVERDUE", color: "text-destructive" };
  if (days === 0) return { text: "Due today!", color: "text-destructive" };
  if (days === 1) return { text: "Due tomorrow", color: "text-orange-500" };
  if (days <= 3) return { text: `${days} days left`, color: "text-orange-500" };
  return { text: `${days} days left`, color: "text-muted-foreground" };
}

type ViewState = "picking" | "focused" | "celebrating" | "break";

export function SmartFocusCard({
  tasks,
  energyLevel,
  onCompleteSubtask,
  onChangeEnergy,
}: SmartFocusCardProps) {
  const [viewState, setViewState] = useState<ViewState>("picking");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showSwap, setShowSwap] = useState(false);
  const [celebratingTaskName, setCelebratingTaskName] = useState("");

  // Calculate ranked tasks
  const rankedTasks = useMemo(() => {
    const scored = tasks
      .filter((t) => {
        const remaining = (t.subtasks || []).filter((s) => !s.is_completed).length;
        const total = (t.subtasks || []).length;
        // Include tasks with subtasks remaining, or tasks without subtasks that aren't completed
        return total === 0 || remaining > 0;
      })
      .map((task) => ({
        task,
        score: calculateUrgencyScore(task),
      }));
    return sortByEnergyLevel(scored, energyLevel);
  }, [tasks, energyLevel]);

  const top3 = rankedTasks.slice(0, 3);
  const rest = rankedTasks.slice(3);

  // Restore focus from localStorage
  useEffect(() => {
    const storedId = getStoredFocus();
    if (storedId && rankedTasks.some((r) => r.task.id === storedId)) {
      setSelectedTaskId(storedId);
      setViewState("focused");
    }
  }, [rankedTasks]);

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setStoredFocus(taskId);
    setViewState("focused");
    setShowSwap(false);
  }, []);

  const swapFocus = useCallback(() => {
    clearStoredFocus();
    setSelectedTaskId(null);
    setViewState("picking");
  }, []);

  const handleSubtaskComplete = useCallback(
    (subtaskId: string, taskId: string, task: TaskWithSubtasks) => {
      onCompleteSubtask(subtaskId, taskId);

      // Check if this was the last subtask
      const remaining = task.subtasks.filter(
        (s) => !s.is_completed && s.id !== subtaskId
      ).length;

      if (remaining === 0) {
        setCelebratingTaskName(task.title);
        setViewState("celebrating");
        clearStoredFocus();
      }
    },
    [onCompleteSubtask]
  );

  const startNextTask = useCallback(() => {
    // Find next best task (excluding completed one)
    const nextTask = rankedTasks.find(
      (r) => r.task.id !== selectedTaskId && r.task.subtasks.filter((s) => !s.is_completed).length > 0
    );
    if (nextTask) {
      selectTask(nextTask.task.id);
    } else {
      setViewState("picking");
      setSelectedTaskId(null);
    }
  }, [rankedTasks, selectedTaskId, selectTask]);

  if (rankedTasks.length === 0) return null;

  // ─── Celebrating View ──────────────────────────────────────────────────
  if (viewState === "celebrating") {
    return (
      <div className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 text-center animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="text-5xl mb-3 animate-bounce">🎉</div>
        <h3 className="text-lg font-bold text-foreground mb-1">Project complete!</h3>
        <p className="text-sm text-muted-foreground mb-5">
          "{celebratingTaskName}" — Great work!
        </p>
        <div className="flex gap-3">
          <button
            onClick={startNextTask}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
          >
            <ArrowRight className="h-4 w-4" />
            Start Next Task
          </button>
          <button
            onClick={() => setViewState("break")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]"
          >
            <Coffee className="h-4 w-4" />
            Take a Break
          </button>
        </div>
      </div>
    );
  }

  // ─── Break View ──────────────────────────────────────────────────────────
  if (viewState === "break") {
    return (
      <div className="mb-5 rounded-2xl border border-border bg-card p-6 text-center animate-in fade-in-0 duration-300">
        <div className="text-4xl mb-3">☕</div>
        <h3 className="text-base font-bold text-foreground mb-1">Taking a breather</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Take your time. Come back when you're ready.
        </p>
        <button
          onClick={startNextTask}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
        >
          Ready to continue
        </button>
      </div>
    );
  }

  // ─── Focused View ──────────────────────────────────────────────────────
  if (viewState === "focused" && selectedTaskId) {
    const activeTask = rankedTasks.find((r) => r.task.id === selectedTaskId)?.task;
    if (!activeTask) {
      // Task no longer available, go back to picking
      setViewState("picking");
      setSelectedTaskId(null);
      return null;
    }

    const sortedSubtasks = [...activeTask.subtasks].sort(
      (a, b) => a.order_index - b.order_index
    );
    const doneCount = sortedSubtasks.filter((s) => s.is_completed).length;
    const totalCount = sortedSubtasks.length;
    const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    const progressColor =
      progressPct > 60 ? "bg-emerald-500" : progressPct >= 30 ? "bg-amber-500" : "bg-red-500";
    const due = getDueLabel(activeTask.due_date);

    const secondaryTasks = top3
      .filter((r) => r.task.id !== selectedTaskId)
      .slice(0, 2);

    return (
      <div className="mb-5 space-y-3 animate-in fade-in-0 duration-300">
        {/* Active task header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Current focus
            </span>
          </div>
          <button
            onClick={swapFocus}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Swap
          </button>
        </div>

        {/* Active task card with subtasks */}
        <div className="rounded-xl border-l-4 border-l-red-500 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{activeTask.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[11px] font-medium flex items-center gap-1", due.color)}>
                  <Clock className="h-3 w-3" />
                  {due.text}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · {doneCount}/{totalCount} done
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* Subtasks */}
          {totalCount > 0 && (
            <div className="space-y-0.5">
              {sortedSubtasks.map((st, i) => {
                const isDone = st.is_completed;
                const priorAllDone = sortedSubtasks
                  .slice(0, i)
                  .every((prev) => prev.is_completed);
                const isCurrent = !isDone && priorAllDone;
                const isFuture = !isDone && !isCurrent;

                return (
                  <div
                    key={st.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-all",
                      isCurrent && "bg-primary/5",
                      isDone && "opacity-50",
                      isFuture && "opacity-35"
                    )}
                  >
                    {isCurrent ? (
                      <button
                        onClick={() =>
                          handleSubtaskComplete(st.id, activeTask.id, activeTask)
                        }
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

                    <span
                      className={cn(
                        "flex-1 min-w-0 truncate text-[13px]",
                        isCurrent && "font-medium text-foreground",
                        isDone && "line-through text-muted-foreground",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {st.title}
                    </span>

                    {isDone && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">
                        Current
                      </span>
                    )}
                    {isFuture && (
                      <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Secondary tasks (muted) */}
        {secondaryTasks.length > 0 && (
          <div className="space-y-2 opacity-60">
            {secondaryTasks.map(({ task }) => {
              const d = getDueLabel(task.due_date);
              const done = task.subtasks.filter((s) => s.is_completed).length;
              const total = task.subtasks.length;
              return (
                <button
                  key={task.id}
                  onClick={() => selectTask(task.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-left transition-all hover:bg-card hover:opacity-100"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate flex-1">
                    {task.title}
                  </span>
                  <span className={cn("text-[10px] shrink-0", d.color)}>{d.text}</span>
                  {total > 0 && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {done}/{total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Picking View (Top 3) ──────────────────────────────────────────────
  return (
    <div className="mb-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Your focus today</span>
          </div>
          {rest.length > 0 && (
            <button
              onClick={() => setShowSwap(!showSwap)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showSwap ? "Show top picks" : "Swap"}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {(showSwap ? rankedTasks : top3).map(({ task, score }, index) => {
            const due = getDueLabel(task.due_date);
            const done = task.subtasks.filter((s) => s.is_completed).length;
            const total = task.subtasks.length;
            const progressPct = total > 0 ? (done / total) * 100 : 0;

            return (
              <button
                key={task.id}
                onClick={() => selectTask(task.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {total > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {done}/{total} subtasks done
                      </span>
                    )}
                  </div>
                  {total > 0 && (
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          progressPct > 60
                            ? "bg-emerald-500"
                            : progressPct >= 30
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium shrink-0 flex items-center gap-1",
                    due.color
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {due.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
