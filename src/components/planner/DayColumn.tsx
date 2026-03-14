import { useState, useMemo } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlannerTaskCard } from "./PlannerTaskCard";
import type { ScheduleWithTask } from "@/hooks/usePlanner";

interface DayColumnProps {
  date: Date;
  schedules: ScheduleWithTask[];
  onComplete: (scheduleId: string) => void;
  onAddAnytime: () => void;
  onAddPlanned: () => void;
}

export function DayColumn({ date, schedules, onComplete, onAddAnytime, onAddPlanned }: DayColumnProps) {
  const [anytimeOpen, setAnytimeOpen] = useState(true);
  const [plannedOpen, setPlannedOpen] = useState(true);

  const today = new Date();
  const isCurrentDay = isToday(date);
  const isTomorrowDay = isTomorrow(date);

  const lockState = isCurrentDay ? "unlocked" as const : isTomorrowDay ? "tomorrow" as const : "future" as const;

  const { anytime, planned } = useMemo(() => {
    const anytime = schedules.filter(s => !s.start_time);
    const planned = schedules.filter(s => !!s.start_time).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return { anytime, planned };
  }, [schedules]);

  return (
    <div className="flex-1 min-w-0">
      {/* Day Header */}
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground font-heading">{format(date, "d")}</span>
        <span className="text-sm font-medium uppercase text-muted-foreground">{format(date, "EEE")}</span>
        {isCurrentDay && <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary">Today</span>}
        {isTomorrowDay && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Tomorrow</span>}
      </div>

      {/* Anytime Section */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <button onClick={() => setAnytimeOpen(!anytimeOpen)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {anytimeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Anytime ({anytime.length})
          </button>
          <button onClick={onAddAnytime} className="ml-auto flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {anytimeOpen && (
          <div className="space-y-2 animate-in fade-in-0 duration-150">
            {anytime.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">No anytime tasks</p>
              </div>
            ) : (
              anytime.map(s => (
                <PlannerTaskCard key={s.id} schedule={s} lockState={lockState} onComplete={onComplete} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Planned Section */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <button onClick={() => setPlannedOpen(!plannedOpen)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {plannedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Planned ({planned.length})
          </button>
        </div>
        {plannedOpen && (
          <div className="space-y-2 animate-in fade-in-0 duration-150">
            {planned.length === 0 ? (
              <button
                onClick={onAddPlanned}
                className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-4 text-center transition-colors hover:border-primary/30 hover:bg-primary-light/30"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Tap to add a routine or appointment</span>
              </button>
            ) : (
              planned.map(s => (
                <PlannerTaskCard key={s.id} schedule={s} lockState={lockState} onComplete={onComplete} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
