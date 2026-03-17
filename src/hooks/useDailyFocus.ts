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

// Get unique project schedules (not yet completed in focus flow)
function getUniqueProjects(schedules: ScheduleWithTask[], completedFocusIds: string[]) {
  const seen = new Set<string>();
  return schedules.filter((s) => {
    if (!s.task) return false;
    if (s.status === "completed" || s.status === "skipped") return false;
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

  // Check if ALL subtasks of focused project are completed
  const focusedAllSubtasksDone = useMemo(() => {
    if (!state.focusedTaskId) return false;
    const focusedSchedule = schedules.find((s) => s.task_id === state.focusedTaskId && s.task);
    if (!focusedSchedule?.task) return false;
    const subtasks = focusedSchedule.task.subtasks || [];
    if (subtasks.length === 0) {
      // No subtasks — check if the schedule itself is done
      const focusedSchedules = schedules.filter((s) => s.task_id === state.focusedTaskId);
      return focusedSchedules.length > 0 && focusedSchedules.every(
        (s) => s.status === "completed" || s.status === "skipped"
      );
    }
    return subtasks.every((st) => st.is_completed);
  }, [schedules, state.focusedTaskId]);

  // Should show prompt? Only when no focus selected (never auto-transition)
  const needsPrompt = useMemo(() => {
    if (allProjects.length === 0 && !state.focusedTaskId) return false;
    if (!state.focusedTaskId) return true;
    return false;
  }, [allProjects, state.focusedTaskId]);

  const isWhatsNext = state.completedFocusIds.length > 0 && !state.focusedTaskId;

  const selectFocus = useCallback(
    (taskId: string) => {
      const next: DailyFocusState = {
        focusedTaskId: taskId,
        completedFocusIds: state.completedFocusIds,
      };
      setState(next);
      saveState(date, next);
      setShowAll(false);
    },
    [date, state.completedFocusIds]
  );

  // User explicitly marks focus as done
  const markFocusDone = useCallback(() => {
    if (!state.focusedTaskId) return;
    const next: DailyFocusState = {
      focusedTaskId: null,
      completedFocusIds: [...state.completedFocusIds, state.focusedTaskId],
    };
    setState(next);
    saveState(date, next);
  }, [date, state]);

  const clearFocus = useCallback(() => {
    const next: DailyFocusState = { focusedTaskId: null, completedFocusIds: [] };
    setState(next);
    saveState(date, next);
  }, [date]);

  const toggleShowAll = useCallback(() => setShowAll((p) => !p), []);

  // Filter schedules: if focused, ONLY show focused project
  const filteredSchedules = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return schedules;
    return schedules.filter((s) => {
      if (s.task_id === state.focusedTaskId) return true;
      return false;
    });
  }, [schedules, state, needsPrompt]);

  // Completed/done items today (hidden behind toggle when focused)
  const completedTodaySchedules = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return [];
    return schedules.filter((s) => {
      if (s.task_id === state.focusedTaskId) return false;
      return true;
    });
  }, [schedules, state, needsPrompt]);

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
    focusedAllSubtasksDone,
    availableProjects,
    otherProjects,
    filteredSchedules,
    completedTodaySchedules,
    hiddenProjects,
    showAll,
    selectFocus,
    markFocusDone,
    clearFocus,
    toggleShowAll,
  };
}
