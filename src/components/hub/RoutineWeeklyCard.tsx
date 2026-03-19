import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isToday as checkIsToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export function RoutineWeeklyCard() {
  const { user } = useAuth();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: routines = [] } = useQuery({
    queryKey: ["routines-hub"],
    queryFn: async () => {
      const { data } = await supabase
        .from("routines")
        .select("id")
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["routine-completions-week", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await supabase
        .from("routine_completions")
        .select("routine_id, completed_date")
        .gte("completed_date", format(weekStart, "yyyy-MM-dd"))
        .lte("completed_date", format(weekEnd, "yyyy-MM-dd"));
      return data || [];
    },
    enabled: !!user,
  });

  const totalRoutines = routines.length;

  const getDayCompletion = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayCompletions = completions.filter((c) => c.completed_date === dateStr);
    if (totalRoutines === 0) return 0;
    return Math.round((dayCompletions.length / totalRoutines) * 100);
  };

  const todayStr = format(today, "yyyy-MM-dd");

  // Weekly average
  const pastDays = days.filter((d) => format(d, "yyyy-MM-dd") <= todayStr);
  const avgRate = totalRoutines > 0 && pastDays.length > 0
    ? Math.round(pastDays.reduce((sum, d) => sum + getDayCompletion(d), 0) / pastDays.length)
    : 0;

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Daily Routine</h3>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {avgRate}% this week
        </span>
      </div>

      {totalRoutines === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No routines set up yet. Go to Planner to create your daily routine!
        </p>
      ) : (
        <div className="flex gap-1.5">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = checkIsToday(day);
            const isFuture = dateStr > todayStr;
            const rate = getDayCompletion(day);
            const isComplete = rate === 100;
            const barHeight = isFuture ? 8 : Math.max(8, (rate / 100) * 80);

            return (
              <div key={dateStr} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-20 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500",
                      isFuture
                        ? "bg-muted"
                        : isComplete
                        ? "bg-primary"
                        : rate >= 50
                        ? "bg-primary/60"
                        : rate > 0
                        ? "bg-primary/30"
                        : "bg-muted"
                    )}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                {isComplete && !isFuture ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Circle className={cn("h-3.5 w-3.5", isFuture ? "text-muted" : "text-muted-foreground/40")} />
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEE")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
