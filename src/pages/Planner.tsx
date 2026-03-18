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

const MAX_PER_SECTION = 3;

/**
 * Distribute schedules across visible days with a max of 3 per priority section.
 * Overflow (non-done/non-skipped only) spills to the next day.
 */
function computeSpillover(
  schedulesByDate: Record<string, ScheduleWithTask[]>,
  sortedDates: string[]
): Record<string, ScheduleWithTask[]> {
  const result: Record<string, ScheduleWithTask[]> = {};
  // Carry-over queues per priority group
  let highOverflow: ScheduleWithTask[] = [];
  let mediumOverflow: ScheduleWithTask[] = [];

  for (const dateStr of sortedDates) {
    const daySchedules = [...(schedulesByDate[dateStr] || [])];

    // Add overflow from previous day (avoid duplicates by task_id)
    const existingTaskIds = new Set(daySchedules.map((s) => s.task_id));
    highOverflow.forEach((s) => {
      if (!existingTaskIds.has(s.task_id)) {
        daySchedules.push(s);
        existingTaskIds.add(s.task_id);
      }
    });
    mediumOverflow.forEach((s) => {
      if (!existingTaskIds.has(s.task_id)) {
        daySchedules.push(s);
        existingTaskIds.add(s.task_id);
      }
    });

    // Categorize into high/medium, dedup projects
    const high: ScheduleWithTask[] = [];
    const medium: ScheduleWithTask[] = [];
    const others: ScheduleWithTask[] = []; // completed/skipped go through as-is
    const seenProjectIds = new Set<string>();

    daySchedules.forEach((s) => {
      const isProject = s.task?.subtasks && s.task.subtasks.length > 0;
      if (isProject) {
        if (seenProjectIds.has(s.task_id)) return;
        seenProjectIds.add(s.task_id);
      }

      const isDone = s.status === "completed" || s.status === "skipped";
      const priority = s.task?.priority === "none" || s.task?.priority === "low"
        ? "medium"
        : (s.task?.priority || "medium");

      if (priority === "high") {
        high.push(s);
      } else {
        medium.push(s);
      }
    });

    // Sort medium by urgency then created_at
    const today = new Date();
    medium.sort((a, b) => {
      const daysA = a.task?.due_date ? differenceInCalendarDays(parseISO(a.task.due_date), today) : 999;
      const daysB = b.task?.due_date ? differenceInCalendarDays(parseISO(b.task.due_date), today) : 999;
      const urgentA = daysA <= 3 ? 0 : 1;
      const urgentB = daysB <= 3 ? 0 : 1;
      if (urgentA !== urgentB) return urgentA - urgentB;
      if (urgentA === 0 && urgentB === 0) return daysA - daysB;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    // Split into kept (max 3) and overflow (only non-done spill)
    const keepHigh: ScheduleWithTask[] = [];
    const newHighOverflow: ScheduleWithTask[] = [];
    high.forEach((s) => {
      const isDone = s.status === "completed" || s.status === "skipped";
      if (isDone) {
        // Done tasks always stay on their day, don't count toward limit
        keepHigh.push(s);
      } else if (keepHigh.filter((k) => k.status !== "completed" && k.status !== "skipped").length < MAX_PER_SECTION) {
        keepHigh.push(s);
      } else {
        newHighOverflow.push(s);
      }
    });

    const keepMedium: ScheduleWithTask[] = [];
    const newMediumOverflow: ScheduleWithTask[] = [];
    medium.forEach((s) => {
      const isDone = s.status === "completed" || s.status === "skipped";
      if (isDone) {
        keepMedium.push(s);
      } else if (keepMedium.filter((k) => k.status !== "completed" && k.status !== "skipped").length < MAX_PER_SECTION) {
        keepMedium.push(s);
      } else {
        newMediumOverflow.push(s);
      }
    });

    highOverflow = newHighOverflow;
    mediumOverflow = newMediumOverflow;

    result[dateStr] = [...keepHigh, ...keepMedium];
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

  // Expand date range to include spillover days (fetch a wider window)
  const dateRange = useMemo(() => {
    const start = isMobile ? selectedMobileDay : baseDate;
    // Fetch extra days ahead to accommodate spillover
    const end = isMobile ? addDays(selectedMobileDay, 6) : addDays(baseDate, 7);
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
    // Build sorted list of dates in the range
    const dates: string[] = [];
    const start = isMobile ? selectedMobileDay : baseDate;
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
