import { useState, useCallback, useMemo, useEffect } from "react";
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

  // Validate focusedTaskId — if it doesn't exist in current schedules, auto-clear it
  const validFocusedTaskId = useMemo(() => {
    if (!state.focusedTaskId) return null;
    const exists = schedules.some((s) => s.task_id === state.focusedTaskId);
    return exists ? state.focusedTaskId : null;
  }, [state.focusedTaskId, schedules]);

  // Auto-clear invalid focus from state/storage
  if (state.focusedTaskId && !validFocusedTaskId && schedules.length > 0) {
    const next: DailyFocusState = { focusedTaskId: null, completedFocusIds: state.completedFocusIds };
    setState(next);
    saveState(date, next);
  }

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

  // Should show prompt? Only when no focus selected AND there are high-priority projects
  const needsPrompt = useMemo(() => {
    if (availableProjects.length === 0) return false;
    if (!state.focusedTaskId) return true;
    return false;
  }, [availableProjects, state.focusedTaskId]);

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

  // Filter schedules: show focused project + all non-high priority (medium/low always visible)
  const filteredSchedules = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return schedules;
    return schedules.filter((s) => {
      // Always show focused project
      if (s.task_id === state.focusedTaskId) return true;
      // Always show medium/low priority tasks
      const priority = s.task?.priority === "none" ? "low" : (s.task?.priority || "low");
      if (priority !== "high") return true;
      return false;
    });
  }, [schedules, state, needsPrompt]);

  // Other HIGH priority projects (locked/collapsed when one is focused)
  const lockedHighProjects = useMemo(() => {
    if (!state.focusedTaskId || needsPrompt) return [];
    const seen = new Set<string>();
    return schedules.filter((s) => {
      if (!s.task) return false;
      const priority = s.task.priority === "none" ? "low" : (s.task.priority || "low");
      if (priority !== "high") return false;
      if (s.task_id === state.focusedTaskId) return false;
      if (state.completedFocusIds.includes(s.task_id)) return false;
      if (s.status === "completed" || s.status === "skipped") return false;
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
    lockedHighProjects,
    showAll,
    selectFocus,
    markFocusDone,
    clearFocus,
    toggleShowAll,
  };
}
