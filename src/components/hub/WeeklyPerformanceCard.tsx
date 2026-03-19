import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subWeeks,
  getWeekOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight, TrendingUp } from "lucide-react";

type ViewMode = "week" | "month";

interface WeekSummary {
  label: string;
  routineRate: number;
  tasksCompleted: number;
  totalTasks: number;
}

export function WeeklyPerformanceCard() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("week");
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-performance", view, user?.id],
    queryFn: async () => {
      if (view === "week") {
        // Current week data
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const [routinesRes, completionsRes, tasksRes] = await Promise.all([
          supabase.from("routines").select("id").eq("is_active", true),
          supabase
            .from("routine_completions")
            .select("routine_id, completed_date")
            .gte("completed_date", format(weekStart, "yyyy-MM-dd"))
            .lte("completed_date", format(weekEnd, "yyyy-MM-dd")),
          supabase
            .from("tasks")
            .select("id, completed_at, status")
            .eq("status", "completed")
            .gte("completed_at", format(weekStart, "yyyy-MM-dd"))
            .lte("completed_at", format(weekEnd, "yyyy-MM-dd") + "T23:59:59"),
        ]);

        const totalRoutines = routinesRes.data?.length || 0;
        const completions = completionsRes.data || [];
        const todayStr = format(today, "yyyy-MM-dd");

        const dayData = days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const dayCompletions = completions.filter((c) => c.completed_date === dateStr);
          const rate = totalRoutines > 0 ? Math.round((dayCompletions.length / totalRoutines) * 100) : 0;
          return {
            date: dateStr,
            label: format(d, "EEE"),
            routineRate: dateStr > todayStr ? -1 : rate,
          };
        });

        const pastDays = dayData.filter((d) => d.routineRate >= 0);
        const avgRoutine = pastDays.length > 0
          ? Math.round(pastDays.reduce((s, d) => s + d.routineRate, 0) / pastDays.length)
          : 0;

        return {
          type: "week" as const,
          dayData,
          avgRoutineRate: avgRoutine,
          tasksCompleted: tasksRes.data?.length || 0,
        };
      } else {
        // Monthly view - week by week summary
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const weeks: WeekSummary[] = [];

        let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });

        for (let w = 0; w < 5; w++) {
          const ws = weekStart;
          const we = endOfWeek(ws, { weekStartsOn: 1 });
          if (ws > monthEnd) break;

          const [routinesRes, completionsRes, tasksRes, allTasksRes] = await Promise.all([
            supabase.from("routines").select("id").eq("is_active", true),
            supabase
              .from("routine_completions")
              .select("routine_id, completed_date")
              .gte("completed_date", format(ws, "yyyy-MM-dd"))
              .lte("completed_date", format(we, "yyyy-MM-dd")),
            supabase
              .from("tasks")
              .select("id")
              .eq("status", "completed")
              .gte("completed_at", format(ws, "yyyy-MM-dd"))
              .lte("completed_at", format(we, "yyyy-MM-dd") + "T23:59:59"),
            supabase
              .from("task_schedules")
              .select("id")
              .gte("scheduled_date", format(ws, "yyyy-MM-dd"))
              .lte("scheduled_date", format(we, "yyyy-MM-dd")),
          ]);

          const totalRoutines = routinesRes.data?.length || 0;
          const daysInWeek = eachDayOfInterval({ start: ws, end: we > today ? today : we });
          const completions = completionsRes.data || [];

          let totalRate = 0;
          daysInWeek.forEach((d) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const dayCompletions = completions.filter((c) => c.completed_date === dateStr);
            totalRate += totalRoutines > 0 ? (dayCompletions.length / totalRoutines) * 100 : 0;
          });

          weeks.push({
            label: `Week ${w + 1}`,
            routineRate: daysInWeek.length > 0 ? Math.round(totalRate / daysInWeek.length) : 0,
            tasksCompleted: tasksRes.data?.length || 0,
            totalTasks: allTasksRes.data?.length || 0,
          });

          weekStart = new Date(we);
          weekStart.setDate(weekStart.getDate() + 1);
        }

        const overallRoutine = weeks.length > 0
          ? Math.round(weeks.reduce((s, w) => s + w.routineRate, 0) / weeks.length)
          : 0;
        const totalCompleted = weeks.reduce((s, w) => s + w.tasksCompleted, 0);

        return {
          type: "month" as const,
          weeks,
          avgRoutineRate: overallRoutine,
          tasksCompleted: totalCompleted,
        };
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Performance</h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-0.5">
          {(["week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-secondary" />
          <div className="h-8 animate-pulse rounded-xl bg-secondary" />
        </div>
      ) : data?.type === "week" ? (
        <div className="space-y-4">
          {/* Daily routine bars */}
          <div className="flex gap-1.5">
            {(data.dayData as any[]).map((day: any) => {
              const isFuture = day.routineRate < 0;
              const rate = isFuture ? 0 : day.routineRate;
              const barH = isFuture ? 8 : Math.max(8, (rate / 100) * 100);

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-16 w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all duration-500",
                        isFuture
                          ? "bg-muted"
                          : rate === 100
                          ? "bg-primary"
                          : rate >= 50
                          ? "bg-primary/50"
                          : rate > 0
                          ? "bg-primary/25"
                          : "bg-muted"
                      )}
                      style={{ height: `${barH}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{day.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
            <div>
              <span className="text-xs text-muted-foreground">Routine avg</span>
              <p className="text-lg font-bold text-foreground">{data.avgRoutineRate}%</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Tasks done</span>
              <p className="text-lg font-bold text-primary">{data.tasksCompleted}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.weeks as WeekSummary[])?.map((week, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-14 text-xs font-medium text-muted-foreground">{week.label}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${week.routineRate}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-foreground">
                {week.routineRate}%
              </span>
              <span className="w-12 text-right text-[10px] text-muted-foreground">
                {week.tasksCompleted} tasks
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-secondary p-3 mt-2">
            <div>
              <span className="text-xs text-muted-foreground">Monthly routine avg</span>
              <p className="text-lg font-bold text-foreground">{data?.avgRoutineRate}%</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Total tasks done</span>
              <p className="text-lg font-bold text-primary">{data?.tasksCompleted}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
