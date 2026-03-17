import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import type { ScheduleWithTask } from "@/hooks/usePlanner";

interface DailyFocusState {
  focusedTaskId: string | null;
  completedFocusIds: string[];
}

function getStorageKey(date: Date) {
  return `dailyFocus_${format(date, "yyyy-MM-dd")}`;
}

function loadState(date: Date): DailyFocusState {
  try {
    const raw = localStorage.getItem(getStorageKey(date));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { focusedTaskId: null, completedFocusIds: [] };
}

function saveState(date: Date, state: DailyFocusState) {
  localStorage.setItem(getStorageKey(date), JSON.stringify(state));
}

// Get unique project schedules (has subtasks, not completed/skipped)
function getUniqueProjects(schedules: ScheduleWithTask[], completedFocusIds: string[]) {
  const seen = new Set<string>();
  return schedules.filter((s) => {
    if (!s.task) return false;
    if (!s.task.subtasks || s.task.subtasks.length === 0) {
      // Also include projects without subtasks
      if (s.status === "completed" || s.status === "skipped") return false;
    } else {
      if (s.status === "completed" || s.status === "skipped") return false;
    }
    if (completedFocusIds.includes(s.task_id)) return false;
    if (seen.has(s.task_id)) return false;
    seen.add(s.task_id);
    return true;
  });
}

export function useDailyFocus(date: Date, schedules: ScheduleWithTask[]) {
  const [state, setState] = useState<DailyFocusState>(() => loadState(date));
  const [showAll, setShowAll] = useState(false);

  // All project schedules not yet completed in focus flow
  const allProjects = useMemo(() => {
    return getUniqueProjects(schedules, state.completedFocusIds);
  }, [schedules, state.completedFocusIds]);

  // High-priority projects (shown prominently)
  const availableProjects = useMemo(
    () => allProjects.filter((s) => s.task?.priority === "high"),
    [allProjects]
  );

  // Non-high priority projects (collapsible section)
  const otherProjects = useMemo(
    () => allProjects.filter((s) => s.task?.priority !== "high"),
    [allProjects]
  );

  // Check if focused project's today schedule is done
  const focusedTaskDoneToday = useMemo(() => {
    if (!state.focusedTaskId) return false;
    const focusedSchedules = schedules.filter(
      (s) => s.task_id === state.focusedTaskId
    );
    return focusedSchedules.length > 0 && focusedSchedules.every(
      (s) => s.status === "completed" || s.status === "skipped"
    );
  }, [schedules, state.focusedTaskId]);

  // Should show prompt?
  const needsPrompt = useMemo(() => {
    if (allProjects.length === 0) return false;
    if (!state.focusedTaskId) return true;
    if (focusedTaskDoneToday) return true;
    return false;
  }, [allProjects, state.focusedTaskId, focusedTaskDoneToday]);

  const isWhatsNext = state.focusedTaskId !== null && focusedTaskDoneToday;

  const selectFocus = useCallback(
    (taskId: string) => {
      const newCompleted = focusedTaskDoneToday && state.focusedTaskId
        ? [...state.completedFocusIds, state.focusedTaskId]
        : state.completedFocusIds;
      const next: DailyFocusState = {
        focusedTaskId: taskId,
        completedFocusIds: newCompleted,
      };
      setState(next);
      saveState(date, next);
      setShowAll(false);
    },
    [date, state, focusedTaskDoneToday]
  );

  const clearFocus = useCallback(() => {
    const next: DailyFocusState = { focusedTaskId: null, completedFocusIds: [] };
    setState(next);
    saveState(date, next);
  }, [date]);

  const toggleShowAll = useCallback(() => setShowAll((p) => !p), []);

  // Filter schedules: if focused, only show focused project + non-project items
  const filteredSchedules = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return schedules;
    return schedules.filter((s) => {
      if (!s.task?.subtasks || s.task.subtasks.length === 0) return true;
      if (s.task_id === state.focusedTaskId) return true;
      if (state.completedFocusIds.includes(s.task_id)) return true;
      if (showAll) return true;
      return false;
    });
  }, [schedules, state, needsPrompt, showAll]);

  // Hidden project schedules (for locked display)
  const hiddenProjects = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return [];
    const seen = new Set<string>();
    return schedules.filter((s) => {
      if (!s.task?.subtasks || s.task.subtasks.length === 0) return false;
      if (s.task_id === state.focusedTaskId) return false;
      if (state.completedFocusIds.includes(s.task_id)) return false;
      if (seen.has(s.task_id)) return false;
      seen.add(s.task_id);
      return true;
    });
  }, [schedules, state, needsPrompt]);

  return {
    focusedTaskId: state.focusedTaskId,
    needsPrompt,
    isWhatsNext,
    availableProjects,
    otherProjects,
    filteredSchedules,
    hiddenProjects,
    showAll,
    selectFocus,
    clearFocus,
    toggleShowAll,
  };
}
