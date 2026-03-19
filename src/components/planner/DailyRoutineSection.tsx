import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoutines, Routine } from "@/hooks/useRoutines";
import { format, isToday, parseISO } from "date-fns";

interface DailyRoutineSectionProps {
  onEditRoutine: (routine: Routine) => void;
  selectedDate?: Date;
}

function getCountdown(deadlineTime: string | null): {
  text: string;
  color: string;
  expired: boolean;
} | null {
  if (!deadlineTime) return null;
  const now = new Date();
  const [h, m] = deadlineTime.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);

  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "Expired", color: "text-destructive", expired: true };

  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  let text: string;
  let color = "text-muted-foreground";

  if (hours > 0) {
    text = `${hours}h ${mins}m left`;
  } else {
    text = `${totalMin}m left`;
  }

  if (totalMin < 5) color = "text-destructive font-semibold";
  else if (totalMin < 10) color = "text-orange-500 font-medium";

  return { text, color, expired: false };
}

// ─── Single Routine Item ──────────────────────────────────────────────────────
function RoutineItem({
  routine,
  isCompleted,
  countdown,
  isInteractive,
  onToggle,
}: {
  routine: Routine;
  isCompleted: boolean;
  countdown: ReturnType<typeof getCountdown>;
  isInteractive: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expired = countdown?.expired ?? false;
  const canToggle = isInteractive && (!expired || isCompleted);

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-card/60">
        {/* Checkbox */}
        <button
          onClick={canToggle ? onToggle : undefined}
          disabled={!canToggle}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
            isCompleted
              ? "border-primary bg-primary text-primary-foreground"
              : expired
              ? "border-muted-foreground/30 bg-muted/50 cursor-not-allowed"
              : !isInteractive
              ? "border-muted-foreground/30 cursor-default"
              : "border-border hover:border-primary cursor-pointer"
          )}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>

        {/* Title (tappable for description expand) */}
        <div
          className={cn(
            "flex-1 min-w-0",
            routine.description && "cursor-pointer"
          )}
          onClick={() => routine.description && setExpanded(!expanded)}
        >
          <span
            className={cn(
              "text-sm font-medium transition-all truncate block",
              isCompleted && "line-through opacity-50",
              expired && !isCompleted && "opacity-40"
            )}
          >
            {routine.title}
          </span>
        </div>

        {/* Right side: countdown or Done */}
        <div className="shrink-0 text-right">
          {isCompleted ? (
            <span className="text-xs font-medium text-primary">Done ✓</span>
          ) : countdown ? (
            <span className={cn("text-xs whitespace-nowrap", countdown.color)}>
              {countdown.text}
            </span>
          ) : null}
        </div>
      </div>

      {/* Expandable description */}
      {routine.description && expanded && (
        <div className="px-12 pb-2 animate-in slide-in-from-top-1 fade-in-0 duration-200">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {routine.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export function DailyRoutineSection({ onEditRoutine, selectedDate }: DailyRoutineSectionProps) {
  const { routines, completions, toggleCompletion, getCompletionsForDate } = useRoutines();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("routine_collapsed");
    return saved === "true";
  });
  const [, setTick] = useState(0);

  const viewingDate = selectedDate || new Date();
  const viewingToday = isToday(viewingDate);
  const viewingDateStr = format(viewingDate, "yyyy-MM-dd");

  // Re-check countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("routine_collapsed", String(collapsed));
  }, [collapsed]);

  // For past dates, fetch completions
  const pastCompletions = getCompletionsForDate?.(viewingDateStr);

  // Filter routines that existed on the selected date
  const visibleRoutines = useMemo(() => {
    return routines.filter((r) => {
      const createdDate = r.created_at ? r.created_at.slice(0, 10) : "2000-01-01";
      return createdDate <= viewingDateStr;
    });
  }, [routines, viewingDateStr]);

  // Determine completions for the viewed date
  const completionSet = useMemo(() => {
    if (viewingToday) {
      return new Set(completions.map((c) => c.routine_id));
    }
    if (pastCompletions) {
      return new Set(pastCompletions.map((c: any) => c.routine_id));
    }
    return new Set<string>();
  }, [completions, pastCompletions, viewingToday]);

  const completedCount = useMemo(
    () => visibleRoutines.filter((r) => completionSet.has(r.id)).length,
    [visibleRoutines, completionSet]
  );

  const allDone = completedCount === visibleRoutines.length && visibleRoutines.length > 0;

  if (visibleRoutines.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Header - matches task section headers */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center gap-2 text-xs"
      >
        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
        <span className="font-bold uppercase tracking-wider text-primary">
          Daily Routine ({completedCount}/{visibleRoutines.length})
          {allDone && " ✓"}
        </span>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        )}
      </button>

      {/* Routine list */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-0.5 animate-in fade-in-0 duration-150">
          {visibleRoutines.map((routine) => {
            const completed = completionSet.has(routine.id);
            const countdown = viewingToday ? getCountdown(routine.deadline_time) : null;

            return (
              <RoutineItem
                key={routine.id}
                routine={routine}
                isCompleted={completed}
                countdown={countdown}
                isInteractive={viewingToday}
                onToggle={() =>
                  toggleCompletion.mutate({
                    routineId: routine.id,
                    isCompleted: completed,
                  })
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
