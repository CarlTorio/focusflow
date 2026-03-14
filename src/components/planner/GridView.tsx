import { useMemo, useState, useEffect, useRef } from "react";
import { format, addDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/80 border-red-600",
  medium: "bg-amber-500/80 border-amber-600",
  low: "bg-emerald-500/80 border-emerald-600",
  none: "bg-primary/70 border-primary",
};

interface GridViewProps {
  weekStart: Date;
  schedules: ScheduleWithTask[];
  workStart?: number;
  workEnd?: number;
  onCellClick: (date: Date, time: string) => void;
  isMobile?: boolean;
  selectedMobileDay?: Date;
  onMobileDayChange?: (day: Date) => void;
}

export function GridView({
  weekStart,
  schedules,
  workStart = 8,
  workEnd = 18,
  onCellClick,
  isMobile = false,
  selectedMobileDay,
  onMobileDayChange,
}: GridViewProps) {
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const hours = useMemo(() => {
    return Array.from({ length: workEnd - workStart }, (_, i) => workStart + i);
  }, [workStart, workEnd]);

  const totalSlots = workEnd - workStart;
  const slotHeight = isMobile ? 52 : 60;

  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleWithTask[]> = {};
    schedules.forEach(s => {
      if (s.start_time) {
        const key = s.scheduled_date;
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
    });
    return map;
  }, [schedules]);

  const currentHourInRange = currentMinute / 60;
  const showTimeLine = currentHourInRange >= workStart && currentHourInRange <= workEnd;
  const timeLineTop = ((currentHourInRange - workStart) / totalSlots) * (totalSlots * slotHeight);

  // ── MOBILE: single-day view ──────────────────────────────────────
  if (isMobile) {
    const activeDay = selectedMobileDay ?? days[0];
    const dateKey = format(activeDay, "yyyy-MM-dd");
    const daySchedules = schedulesByDate[dateKey] || [];
    const current = isToday(activeDay);

    return (
      <div className="flex flex-col h-full" ref={gridRef}>
        {/* Day navigator */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-border">
          <button
            onClick={() => onMobileDayChange?.(addDays(activeDay, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>

          <div className="text-center">
            <p className={cn("text-xs uppercase font-semibold", current ? "text-primary" : "text-muted-foreground")}>
              {format(activeDay, "EEEE")}
            </p>
            <p className={cn("text-xl font-bold leading-none", current ? "text-primary" : "text-foreground")}>
              {format(activeDay, "d")}
            </p>
          </div>

          <button
            onClick={() => onMobileDayChange?.(addDays(activeDay, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {/* Scrollable time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative flex">
            {/* Time labels */}
            <div className="w-14 flex-shrink-0">
              {hours.map(h => (
                <div key={h} className="flex items-start justify-end pr-2" style={{ height: slotHeight }}>
                  <span className="text-[10px] text-muted-foreground -mt-1.5">
                    {h % 12 || 12}{h < 12 ? " AM" : " PM"}
                  </span>
                </div>
              ))}
            </div>

            {/* Single day column */}
            <div className="relative flex-1 border-l border-border">
              {hours.map(h => (
                <div
                  key={h}
                  className="border-b border-border/50 cursor-pointer hover:bg-primary/5 transition-colors"
                  style={{ height: slotHeight }}
                  onClick={() => onCellClick(activeDay, `${String(h).padStart(2, "0")}:00`)}
                />
              ))}

              {/* Task blocks */}
              {daySchedules.map(s => {
                if (!s.start_time) return null;
                const [sh, sm] = s.start_time.split(":").map(Number);
                const durationHours = Number(s.allocated_hours);
                const top = ((sh + sm / 60 - workStart) / totalSlots) * (totalSlots * slotHeight);
                const height = Math.max((durationHours / totalSlots) * (totalSlots * slotHeight), 24);
                const priority = s.task?.priority || "none";

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "absolute left-1 right-1 rounded-lg border px-2 py-1 text-xs font-medium text-white overflow-hidden cursor-pointer shadow-sm",
                      PRIORITY_COLORS[priority]
                    )}
                    style={{ top, height }}
                    title={s.task?.title}
                  >
                    <span className="truncate block">{s.task?.title}</span>
                  </div>
                );
              })}

              {/* Current time indicator */}
              {current && showTimeLine && (
                <div
                  className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                  style={{ top: timeLineTop }}
                >
                  <div className="h-2 w-2 rounded-full bg-destructive -ml-1" />
                  <div className="flex-1 h-[2px] bg-destructive" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP: 7-day grid ──────────────────────────────────────────
  return (
    <div className="overflow-x-auto" ref={gridRef}>
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border mb-1">
          <div />
          {days.map(day => {
            const current = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={cn("py-2 text-center", current && "border-t-2 border-t-primary")}
              >
                <p className={cn("text-xs uppercase", current ? "text-primary font-bold" : "text-muted-foreground")}>
                  {format(day, "EEE")}
                </p>
                <p className={cn("text-lg font-bold", current ? "text-primary" : "text-foreground")}>
                  {format(day, "d")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time labels */}
          <div className="relative">
            {hours.map(h => (
              <div key={h} className="flex items-start justify-end pr-2" style={{ height: slotHeight }}>
                <span className="text-[10px] text-muted-foreground -mt-1.5">
                  {h % 12 || 12}{h < 12 ? " AM" : " PM"}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dKey = format(day, "yyyy-MM-dd");
            const daySchedules = schedulesByDate[dKey] || [];
            const current = isToday(day);

            return (
              <div key={dKey} className="relative border-l border-border">
                {hours.map(h => (
                  <div
                    key={h}
                    className="border-b border-border/50 cursor-pointer hover:bg-primary/5 transition-colors"
                    style={{ height: slotHeight }}
                    onClick={() => onCellClick(day, `${String(h).padStart(2, "0")}:00`)}
                  />
                ))}

                {daySchedules.map(s => {
                  if (!s.start_time) return null;
                  const [sh, sm] = s.start_time.split(":").map(Number);
                  const durationHours = Number(s.allocated_hours);
                  const top = ((sh + sm / 60 - workStart) / totalSlots) * (totalSlots * slotHeight);
                  const height = Math.max((durationHours / totalSlots) * (totalSlots * slotHeight), 24);
                  const priority = s.task?.priority || "none";

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border px-1.5 py-0.5 text-xs font-medium text-white overflow-hidden cursor-pointer shadow-sm transition-shadow hover:shadow-md",
                        PRIORITY_COLORS[priority]
                      )}
                      style={{ top, height }}
                      title={s.task?.title}
                    >
                      <span className="truncate block">{s.task?.title}</span>
                    </div>
                  );
                })}

                {current && showTimeLine && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                    style={{ top: timeLineTop }}
                  >
                    <div className="h-2 w-2 rounded-full bg-destructive -ml-1" />
                    <div className="flex-1 h-[2px] bg-destructive" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
