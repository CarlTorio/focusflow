import { useState, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { DayColumn } from "@/components/planner/DayColumn";
import { GridView } from "@/components/planner/GridView";
import { AddTaskModal } from "@/components/planner/AddTaskModal";
import { PriorityOverview } from "@/components/planner/PriorityOverview";
import { MissedTaskBanner } from "@/components/planner/MissedTaskBanner";
import { FocusMode } from "@/components/planner/FocusMode";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanner } from "@/hooks/usePlanner";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Planner() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"columns" | "grid">("columns");
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date>(new Date());
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [focusScheduleId, setFocusScheduleId] = useState<string | null>(null);

  // Date range calculations
  const dateRange = useMemo(() => {
    if (viewMode === "columns") {
      const start = isMobile ? selectedMobileDay : baseDate;
      const end = isMobile ? selectedMobileDay : addDays(baseDate, 1);
      return {
        start,
        end,
        startStr: format(start, "yyyy-MM-dd"),
        endStr: format(end, "yyyy-MM-dd"),
      };
    } else {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = endOfWeek(baseDate, { weekStartsOn: 1 });
      return {
        start,
        end,
        startStr: format(start, "yyyy-MM-dd"),
        endStr: format(end, "yyyy-MM-dd"),
      };
    }
  }, [viewMode, baseDate, selectedMobileDay, isMobile]);

  const {
    schedules,
    isLoading,
    missedSchedules,
    priorityTasks,
    completeSchedule,
    handleMissed,
    createTask,
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
  const navigate = (dir: number) => {
    if (viewMode === "columns") {
      setBaseDate((prev) => addDays(prev, dir * (isMobile ? 1 : 2)));
      if (isMobile) setSelectedMobileDay((prev) => addDays(prev, dir));
    } else {
      setBaseDate((prev) => addDays(prev, dir * 7));
    }
  };

  // Date header text
  const headerText = useMemo(() => {
    if (viewMode === "columns") {
      if (isMobile) return format(selectedMobileDay, "MMMM d, yyyy");
      return `${format(baseDate, "MMM d")} — ${format(addDays(baseDate, 1), "MMM d, yyyy")}`;
    } else {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = endOfWeek(baseDate, { weekStartsOn: 1 });
      return start.getMonth() === end.getMonth()
        ? `${format(start, "MMMM d")} — ${format(end, "d")}`
        : `${format(start, "MMM d")} — ${format(end, "MMM d")}`;
    }
  }, [viewMode, baseDate, selectedMobileDay, isMobile]);

  // Mobile day bar
  const mobileDays = useMemo(() => {
    const start = startOfWeek(selectedMobileDay, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedMobileDay]);

  const openAddModal = useCallback((date?: Date, time?: string) => {
    setModalDefaultDate(date || new Date());
    setModalDefaultTime(time);
    setModalOpen(true);
  }, []);

  // Focus mode schedule
  const focusSchedule = focusScheduleId
    ? schedules.find((s) => s.id === focusScheduleId) ?? null
    : null;

  const focusIdx = focusScheduleId
    ? schedules.findIndex((s) => s.id === focusScheduleId)
    : -1;
  const nextFocusSchedule =
    focusIdx >= 0 && focusIdx < schedules.length - 1 ? schedules[focusIdx + 1] : null;

  return (
    <>
      {/* Focus Mode Overlay */}
      {focusSchedule && (
        <FocusMode
          schedule={focusSchedule}
          nextSchedule={nextFocusSchedule}
          onBack={() => setFocusScheduleId(null)}
          onDone={(id, hours) => {
            completeSchedule.mutate({ scheduleId: id, actualHours: hours });
            setFocusScheduleId(null);
          }}
          onSkip={(id) => {
            completeSchedule.mutate({ scheduleId: id });
            setFocusScheduleId(null);
          }}
        />
      )}

      <div className="pb-20 md:pb-8">
        <MobileHeader title="Planner" />

        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Top Bar */}
          <div className="mb-5 flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex rounded-xl border border-border p-1 bg-muted/30">
              <button
                onClick={() => setViewMode("columns")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === "columns"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Columns className="h-3.5 w-3.5" />
                Columns
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === "grid"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex flex-1 items-center justify-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground font-heading whitespace-nowrap">
                {headerText}
              </span>
              <button
                onClick={() => navigate(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => openAddModal()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : viewMode === "columns" ? (
            <>
              {/* Mobile Day Selector */}
              {isMobile && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/30 p-2">
                  {mobileDays.map((day) => {
                    const selected =
                      format(day, "yyyy-MM-dd") ===
                      format(selectedMobileDay, "yyyy-MM-dd");
                    const current = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedMobileDay(day)}
                        className="flex flex-col items-center gap-0.5 px-1"
                      >
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {format(day, "EEE")}
                        </span>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : current
                              ? "bg-primary/10 text-primary"
                              : "text-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {current && (
                          <span className="text-[8px] font-semibold text-primary">Today</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Missed task banners */}
              <MissedTaskBanner
                missed={missedSchedules}
                onAction={(id, action) =>
                  handleMissed.mutate({ scheduleId: id, action })
                }
              />

              {/* Priority Overview (columns view only) */}
              <PriorityOverview tasks={priorityTasks} />

              {/* Day columns */}
              <div className={cn("flex gap-6", isMobile && "flex-col")}>
                {isMobile ? (
                  <DayColumn
                    date={selectedMobileDay}
                    schedules={
                      schedulesByDate[format(selectedMobileDay, "yyyy-MM-dd")] || []
                    }
                    onComplete={(id) => completeSchedule.mutate({ scheduleId: id })}
                    onAddTask={() => openAddModal(selectedMobileDay)}
                    onOpenFocus={(id) => setFocusScheduleId(id)}
                  />
                ) : (
                  <>
                    <DayColumn
                      date={baseDate}
                      schedules={schedulesByDate[format(baseDate, "yyyy-MM-dd")] || []}
                      onComplete={(id) => completeSchedule.mutate({ scheduleId: id })}
                      onAddTask={() => openAddModal(baseDate)}
                      onOpenFocus={(id) => setFocusScheduleId(id)}
                    />
                    <div className="w-px bg-border hidden md:block" />
                    <DayColumn
                      date={addDays(baseDate, 1)}
                      schedules={
                        schedulesByDate[format(addDays(baseDate, 1), "yyyy-MM-dd")] || []
                      }
                      onComplete={(id) => completeSchedule.mutate({ scheduleId: id })}
                      onAddTask={() => openAddModal(addDays(baseDate, 1))}
                      onOpenFocus={(id) => setFocusScheduleId(id)}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <GridView
              weekStart={startOfWeek(baseDate, { weekStartsOn: 1 })}
              schedules={schedules}
              onCellClick={(date, time) => openAddModal(date, time)}
              isMobile={isMobile}
              selectedMobileDay={selectedMobileDay}
              onMobileDayChange={setSelectedMobileDay}
            />
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => openAddModal()}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95 md:bottom-6"
        >
          <Plus className="h-6 w-6" />
        </button>

        <AddTaskModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSave={(input) => createTask.mutate(input)}
          defaultDate={modalDefaultDate}
          defaultTime={modalDefaultTime}
          isSaving={createTask.isPending}
        />
      </div>
    </>
  );
}
