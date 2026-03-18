import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, isToday, isPast, startOfDay, differenceInCalendarDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, ClipboardList } from "lucide-react";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { cn } from "@/lib/utils";
import { DayColumn } from "@/components/planner/DayColumn";
import { DailySummaryBanner } from "@/components/planner/DailySummaryBanner";

import { DailyRoutineSection } from "@/components/planner/DailyRoutineSection";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanner, ScheduleWithTask } from "@/hooks/usePlanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const MAIN_TASKS_LIMIT = 1;
const OTHER_TASKS_LIMIT = 3;

const isDoneStatus = (status: string | null) => status === "completed" || status === "skipped";

const getTaskPriority = (schedule: ScheduleWithTask) =>
  schedule.task?.priority === "none" || schedule.task?.priority === "low"
    ? "medium"
    : (schedule.task?.priority || "medium");

const dedupeByTask = (items: ScheduleWithTask[]) => {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.task_id)) return false;
    seen.add(s.task_id);
    return true;
  });
};

const mergeCarryAndRaw = (carry: ScheduleWithTask[], raw: ScheduleWithTask[]) => {
  const merged = [...carry];
  const byTask = new Map<string, number>();
  merged.forEach((s, i) => byTask.set(s.task_id, i));

  raw.forEach((s) => {
    const idx = byTask.get(s.task_id);
    if (idx === undefined) {
      merged.push(s);
      byTask.set(s.task_id, merged.length - 1);
    } else {
      merged[idx] = s;
    }
  });

  return merged;
};

const sortMediumByUrgency = (items: ScheduleWithTask[], referenceDate: Date) => {
  return [...items].sort((a, b) => {
    const daysA = a.task?.due_date ? differenceInCalendarDays(parseISO(a.task.due_date), referenceDate) : 999;
    const daysB = b.task?.due_date ? differenceInCalendarDays(parseISO(b.task.due_date), referenceDate) : 999;
    const urgentA = daysA <= 3 ? 0 : 1;
    const urgentB = daysB <= 3 ? 0 : 1;

    if (urgentA !== urgentB) return urgentA - urgentB;
    if (urgentA === 0 && urgentB === 0) return daysA - daysB;
    return (a.created_at || "").localeCompare(b.created_at || "");
  });
};

/**
 * Daily planner projection:
 * - Main Tasks: max 1 active/day
 * - Other Tasks: max 3 active/day
 * - Unfinished tasks continue to next day until done
 * - Done tasks stay only on the day they were completed (not shown on future days)
 */
function computeSpillover(
  schedulesByDate: Record<string, ScheduleWithTask[]>,
  sortedDates: string[]
): Record<string, ScheduleWithTask[]> {
  const result: Record<string, ScheduleWithTask[]> = {};
  const todayStart = startOfDay(new Date());

  let highCarry: ScheduleWithTask[] = [];
  let mediumCarry: ScheduleWithTask[] = [];
  const doneTaskIds = new Set<string>();

  for (const dateStr of sortedDates) {
    const dayDate = startOfDay(parseISO(dateStr));
    const isFutureDay = dayDate > todayStart;
    const isToday = dayDate.getTime() === todayStart.getTime();
    const isPastDay = dayDate < todayStart;

    // Filter out tasks already done on a previous day
    const rawAll = (schedulesByDate[dateStr] || []).filter((s) => !doneTaskIds.has(s.task_id));

    // Dedup per task_id: if ANY schedule for a task is completed, treat the task as done
    const taskStatusMap = new Map<string, { hasCompleted: boolean; schedules: ScheduleWithTask[] }>();
    rawAll.forEach((s) => {
      const entry = taskStatusMap.get(s.task_id) || { hasCompleted: false, schedules: [] };
      if (isDoneStatus(s.status)) entry.hasCompleted = true;
      entry.schedules.push(s);
      taskStatusMap.set(s.task_id, entry);
    });

    const rawDone: ScheduleWithTask[] = [];
    const rawActive: ScheduleWithTask[] = [];
    taskStatusMap.forEach((entry, taskId) => {
      const rep = entry.schedules[0];
      if (entry.hasCompleted) {
        doneTaskIds.add(taskId);
        rawDone.push(rep);
      } else {
        rawActive.push(rep);
      }
    });

    highCarry = highCarry.filter((s) => !doneTaskIds.has(s.task_id));
    mediumCarry = mediumCarry.filter((s) => !doneTaskIds.has(s.task_id));

    const rawHighActive = rawActive.filter((s) => getTaskPriority(s) === "high");
    const rawMediumActive = rawActive.filter((s) => getTaskPriority(s) !== "high");

    const rawHighDone = rawDone.filter((s) => getTaskPriority(s) === "high");
    const rawMediumDone = rawDone.filter((s) => getTaskPriority(s) !== "high");

    const highCandidates = mergeCarryAndRaw(highCarry, rawHighActive).filter((s) => !doneTaskIds.has(s.task_id));
    const mediumCandidates = sortMediumByUrgency(
      mergeCarryAndRaw(mediumCarry, rawMediumActive).filter((s) => !doneTaskIds.has(s.task_id)),
      dayDate
    );

    // Today & past: show ALL tasks (no limit). Future: apply limits for spillover.
    let visibleHigh: ScheduleWithTask[];
    let visibleMedium: ScheduleWithTask[];

    if (isFutureDay) {
      visibleHigh = highCandidates.slice(0, MAIN_TASKS_LIMIT);
      visibleMedium = mediumCandidates.slice(0, OTHER_TASKS_LIMIT);
    } else {
      // Today/past: show everything scheduled for this day
      visibleHigh = highCandidates;
      visibleMedium = mediumCandidates;
    }

    // All unfinished continue to next day until marked done
    highCarry = highCandidates;
    mediumCarry = mediumCandidates;

    const doneForDisplay = isFutureDay ? [] : [...rawHighDone, ...rawMediumDone];
    result[dateStr] = [...visibleHigh, ...visibleMedium, ...doneForDisplay];
  }

  return result;
}

export default function Planner() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "";
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState(new Date());
  const [pastRevealed, setPastRevealed] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Always fetch from today so the spillover chain is complete no matter which day is viewed
  const dateRange = useMemo(() => {
    const today = startOfDay(new Date());
    const visibleStart = isMobile ? selectedMobileDay : baseDate;
    const visibleEnd = isMobile ? addDays(selectedMobileDay, 6) : addDays(baseDate, 7);
    // Start from today or visibleStart, whichever is earlier
    const start = today < visibleStart ? today : visibleStart;
    const end = visibleEnd;
    return {
      start,
      end,
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(end, "yyyy-MM-dd"),
    };
  }, [baseDate, selectedMobileDay, isMobile]);

  const {
    schedules,
    isLoading,
    dueSoonTasks,
    carriedCount,
    totalToday,
    completeSchedule,
    completeSubtaskDirect,
    handleMissed,
    updateTask,
    deleteTask,
  } = usePlanner(dateRange.startStr, dateRange.endStr);

  // Group raw schedules by date
  const rawSchedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleWithTask[]> = {};
    schedules.forEach((s) => {
      if (!map[s.scheduled_date]) map[s.scheduled_date] = [];
      map[s.scheduled_date].push(s);
    });
    return map;
  }, [schedules]);

  // Compute spillover-adjusted schedules
  const schedulesByDate = useMemo(() => {
    const dates: string[] = [];
    const visibleStart = isMobile ? selectedMobileDay : baseDate;
    const start = addDays(visibleStart, -1);
    const endDate = isMobile ? addDays(selectedMobileDay, 6) : addDays(baseDate, 7);

    let cur = start;
    while (cur <= endDate) {
      dates.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }

    return computeSpillover(rawSchedulesByDate, dates);
  }, [rawSchedulesByDate, baseDate, selectedMobileDay, isMobile]);

  // Navigation
  const navDate = (dir: number) => {
    setBaseDate((prev) => addDays(prev, dir * (isMobile ? 1 : 2)));
    if (isMobile) {
      setSelectedMobileDay((prev) => addDays(prev, dir));
      setPastRevealed(false);
      setSummaryOpen(false);
    }
  };

  const headerText = useMemo(() => {
    if (isMobile) return format(selectedMobileDay, "MMMM d");
    return `${format(baseDate, "MMM d")} — ${format(addDays(baseDate, 1), "MMM d")}`;
  }, [baseDate, selectedMobileDay, isMobile]);

  const mobileDays = useMemo(() => {
    const start = startOfWeek(selectedMobileDay, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedMobileDay]);

  const openAddTask = useCallback((date?: Date, tab?: string) => {
    const d = date || new Date();
    const params = new URLSearchParams({ date: format(d, "yyyy-MM-dd") });
    if (tab) params.set("tab", tab);
    navigate(`/add-task?${params.toString()}`);
  }, [navigate]);

  const handleEditRoutine = useCallback((routine: { id: string }) => {
    const params = new URLSearchParams({ tab: "routine", editRoutine: routine.id });
    navigate(`/add-task?${params.toString()}`);
  }, [navigate]);

  // Focus mode

  const selectedDate = isMobile ? selectedMobileDay : new Date();
  const isPastSelected = isMobile && !isToday(selectedMobileDay) && isPast(startOfDay(selectedMobileDay));

  return (
    <>

      <div className="pb-20 md:pb-8">
        <MobileHeader title="Planner" />

        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="hidden md:block mb-4 text-center">
            <h1 className="text-xl font-bold uppercase tracking-wider" style={{ color: "#7C4DFF" }}>PLANNER</h1>
          </div>

          {/* Date Navigation */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <button onClick={() => navDate(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-lg font-bold text-foreground whitespace-nowrap">{headerText}</span>
            <button onClick={() => navDate(1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Mobile Day Selector */}
              {isMobile && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/5 p-2">
                  {mobileDays.map((day) => {
                    const selected = format(day, "yyyy-MM-dd") === format(selectedMobileDay, "yyyy-MM-dd");
                    const current = isToday(day);
                    return (
                      <button key={day.toISOString()} onClick={() => { setSelectedMobileDay(day); setPastRevealed(false); setSummaryOpen(false); }} className="flex flex-col items-center gap-0.5 px-1">
                        <span className="text-[10px] uppercase text-muted-foreground">{format(day, "EEE")}</span>
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                          selected ? "bg-primary text-primary-foreground" : current ? "bg-primary/10 text-primary" : "text-foreground"
                        )}>{format(day, "d")}</span>
                        {current && <span className="text-[8px] font-semibold text-primary">Today</span>}
                      </button>
                    );
                  })}
                </div>
              )}




              {/* Blur overlay for past days (mobile) */}
              {isPastSelected && !pastRevealed ? (
                <div className="relative">
                  <div className="blur-[3px] pointer-events-none select-none opacity-50">
                    <DailyRoutineSection onEditRoutine={handleEditRoutine} selectedDate={selectedDate} />
                    <div className="flex flex-col gap-6 mt-4">
                      <DayColumn
                        date={selectedMobileDay}
                        schedules={schedulesByDate[format(selectedMobileDay, "yyyy-MM-dd")] || []}
                        onComplete={() => {}}
                        onAddTask={() => {}}
                        onOpenFocus={() => {}}
                        userName={userName}
                        externalOpenSummary={summaryOpen}
                        onSummaryOpenChange={setSummaryOpen}
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center gap-3" style={{ justifyContent: 'start', paddingTop: '50%' }}>
                    <button
                      onClick={() => setSummaryOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                    >
                      <ClipboardList className="h-4 w-4" />
                      View Summary
                    </button>
                    <button
                      onClick={() => setPastRevealed(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Show tasks instead
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <DailyRoutineSection onEditRoutine={handleEditRoutine} selectedDate={selectedDate} />

                  <div className={cn("flex gap-6", isMobile && "flex-col")}>
                    {isMobile ? (
                      <DayColumn
                        date={selectedMobileDay}
                        schedules={schedulesByDate[format(selectedMobileDay, "yyyy-MM-dd")] || []}
                        onComplete={(id) => completeSchedule.mutate({ scheduleId: id })}
                        onAddTask={() => openAddTask(selectedMobileDay)}
                        onOpenFocus={() => {}}
                        userName={userName}
                        onCompleteSubtask={(sid, tid) => completeSubtaskDirect.mutate({ subtaskId: sid, taskId: tid })}
                        onUpdateTask={(input) => updateTask.mutate(input)}
                        onDeleteTask={(id) => deleteTask.mutate(id)}
                        externalOpenSummary={summaryOpen}
                        onSummaryOpenChange={setSummaryOpen}
                      />
                    ) : (
                      <>
                        <DayColumn date={baseDate} schedules={schedulesByDate[format(baseDate, "yyyy-MM-dd")] || []} onComplete={(id) => completeSchedule.mutate({ scheduleId: id })} onAddTask={() => openAddTask(baseDate)} onOpenFocus={() => {}} userName={userName} onCompleteSubtask={(sid, tid) => completeSubtaskDirect.mutate({ subtaskId: sid, taskId: tid })} onUpdateTask={(input) => updateTask.mutate(input)} onDeleteTask={(id) => deleteTask.mutate(id)} />
                        <div className="w-px bg-border hidden md:block" />
                        <DayColumn date={addDays(baseDate, 1)} schedules={schedulesByDate[format(addDays(baseDate, 1), "yyyy-MM-dd")] || []} onComplete={(id) => completeSchedule.mutate({ scheduleId: id })} onAddTask={() => openAddTask(addDays(baseDate, 1))} onOpenFocus={() => {}} userName={userName} onCompleteSubtask={(sid, tid) => completeSubtaskDirect.mutate({ subtaskId: sid, taskId: tid })} onUpdateTask={(input) => updateTask.mutate(input)} onDeleteTask={(id) => deleteTask.mutate(id)} />
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => openAddTask()}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95 md:bottom-6"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
