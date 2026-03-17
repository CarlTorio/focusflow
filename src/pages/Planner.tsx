import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { cn } from "@/lib/utils";
import { DayColumn } from "@/components/planner/DayColumn";
import { MissedTaskBanner } from "@/components/planner/MissedTaskBanner";

import { FocusMode } from "@/components/planner/FocusMode";
import { DailyRoutineSection } from "@/components/planner/DailyRoutineSection";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanner } from "@/hooks/usePlanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

export default function Planner() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "";
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState(new Date());
  const [focusScheduleId, setFocusScheduleId] = useState<string | null>(null);

  // Date range calculations
  const dateRange = useMemo(() => {
    const start = isMobile ? selectedMobileDay : baseDate;
    const end = isMobile ? selectedMobileDay : addDays(baseDate, 1);
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
    missedSchedules,
    dueSoonTasks,
    completeSchedule,
    handleMissed,
  } = usePlanner(dateRange.startStr, dateRange.endStr);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map: Record<string, typeof schedules> = {};
    schedules.forEach((s) => {
      if (!map[s.scheduled_date]) map[s.scheduled_date] = [];
      map[s.scheduled_date].push(s);
    });
    return map;
  }, [schedules]);

  // Navigation
  const navDate = (dir: number) => {
    setBaseDate((prev) => addDays(prev, dir * (isMobile ? 1 : 2)));
    if (isMobile) setSelectedMobileDay((prev) => addDays(prev, dir));
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
  const focusSchedule = focusScheduleId ? schedules.find((s) => s.id === focusScheduleId) ?? null : null;
  const focusIdx = focusScheduleId ? schedules.findIndex((s) => s.id === focusScheduleId) : -1;
  const nextFocusSchedule = focusIdx >= 0 && focusIdx < schedules.length - 1 ? schedules[focusIdx + 1] : null;

  const selectedDate = isMobile ? selectedMobileDay : new Date();

  return (
    <>
      {focusSchedule && (
        <FocusMode
          schedule={focusSchedule}
          nextSchedule={nextFocusSchedule}
          onBack={() => setFocusScheduleId(null)}
          onDone={(id, hours) => { completeSchedule.mutate({ scheduleId: id, actualHours: hours }); setFocusScheduleId(null); }}
          onSkip={(id) => { completeSchedule.mutate({ scheduleId: id }); setFocusScheduleId(null); }}
        />
      )}

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
                      <button key={day.toISOString()} onClick={() => setSelectedMobileDay(day)} className="flex flex-col items-center gap-0.5 px-1">
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

              <MissedTaskBanner missed={missedSchedules} onAction={(id, action) => handleMissed.mutate({ scheduleId: id, action })} />
              
              <DailyRoutineSection onEditRoutine={handleEditRoutine} selectedDate={selectedDate} />

              <div className={cn("flex gap-6", isMobile && "flex-col")}>
                {isMobile ? (
                  <DayColumn
                    date={selectedMobileDay}
                    schedules={schedulesByDate[format(selectedMobileDay, "yyyy-MM-dd")] || []}
                    onComplete={(id) => completeSchedule.mutate({ scheduleId: id })}
                    onAddTask={() => openAddTask(selectedMobileDay)}
                    onOpenFocus={(id) => setFocusScheduleId(id)}
                  />
                ) : (
                  <>
                    <DayColumn date={baseDate} schedules={schedulesByDate[format(baseDate, "yyyy-MM-dd")] || []} onComplete={(id) => completeSchedule.mutate({ scheduleId: id })} onAddTask={() => openAddTask(baseDate)} onOpenFocus={(id) => setFocusScheduleId(id)} />
                    <div className="w-px bg-border hidden md:block" />
                    <DayColumn date={addDays(baseDate, 1)} schedules={schedulesByDate[format(addDays(baseDate, 1), "yyyy-MM-dd")] || []} onComplete={(id) => completeSchedule.mutate({ scheduleId: id })} onAddTask={() => openAddTask(addDays(baseDate, 1))} onOpenFocus={(id) => setFocusScheduleId(id)} />
                  </>
                )}
              </div>
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
