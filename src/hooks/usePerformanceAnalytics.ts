import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, format, eachDayOfInterval,
} from "date-fns";

export type PeriodFilter = "week" | "month" | "all";

interface DayData {
  date: string;
  label: string;
  completed: number;
  total: number;
  completionRate: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface AnalyticsData {
  chartData: DayData[];
  avgCompletionRate: number;
  onTimeRate: number;
  streak: number;
  mostProductiveDay: string;
  totalCompleted: number;
  totalTasks: number;
  prevAvgCompletionRate: number;
  prevOnTimeRate: number;
  insight: string;
}

function pickInsight(data: Partial<AnalyticsData>): string {
  const rate = data.avgCompletionRate ?? 0;
  const streak = data.streak ?? 0;
  const trend = (data.avgCompletionRate ?? 0) - (data.prevAvgCompletionRate ?? 0);
  const bestDay = data.mostProductiveDay;

  if (streak >= 5) return `🔥 ${streak}-day streak! You're on fire — keep this momentum going!`;
  if (streak >= 3) return `🔥 You've got a ${streak}-day streak! Consistency is building your best habits.`;
  if (trend >= 15) return `📈 Your completion rate improved by ${Math.round(trend)}% this period. Amazing progress!`;
  if (trend >= 5) return `✨ You're improving! Completion rate is up ${Math.round(trend)}% vs the previous period.`;
  if (bestDay) return `💡 You're most productive on ${bestDay}s. Try scheduling your hardest tasks then!`;
  if (rate >= 80) return `🌟 Excellent! You're completing ${Math.round(rate)}% of your tasks. You're crushing it!`;
  if (rate >= 60) return `👍 Good work! You're completing ${Math.round(rate)}% of tasks. A little push can get you to 80%!`;
  if (rate > 0) return `💪 Every task completed is progress. Try breaking large tasks into smaller steps to boost your rate.`;
  return `🚀 Start completing tasks to see your performance trends here. You've got this!`;
}

const db = supabase as any;

export function usePerformanceAnalytics(period: PeriodFilter = "week") {
  const { user } = useAuth();
  const today = new Date();

  return useQuery<AnalyticsData>({
    queryKey: ["performance-analytics", period, user?.id],
    queryFn: async () => {
      let start: Date, end: Date, prevStart: Date, prevEnd: Date;
      if (period === "week") {
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        prevStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
      } else if (period === "month") {
        start = startOfMonth(today);
        end = endOfMonth(today);
        prevStart = startOfMonth(subMonths(today, 1));
        prevEnd = endOfMonth(subMonths(today, 1));
      } else {
        start = subMonths(today, 3);
        end = today;
        prevStart = subMonths(today, 6);
        prevEnd = subMonths(today, 3);
      }

      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");
      const prevStartStr = format(prevStart, "yyyy-MM-dd");
      const prevEndStr = format(prevEnd, "yyyy-MM-dd");

      const [currentRes, prevRes, onTimeRes, prevOnTimeRes] = await Promise.all([
        db.from("task_schedules").select("id, scheduled_date, status, end_time").gte("scheduled_date", startStr).lte("scheduled_date", endStr),
        db.from("task_schedules").select("id, scheduled_date, status").gte("scheduled_date", prevStartStr).lte("scheduled_date", prevEndStr),
        db.from("task_schedules").select("id, scheduled_date, status, end_time").gte("scheduled_date", startStr).lte("scheduled_date", endStr).eq("status", "completed"),
        db.from("task_schedules").select("id, status").gte("scheduled_date", prevStartStr).lte("scheduled_date", prevEndStr).eq("status", "completed"),
      ]);

      const current = currentRes.data ?? [];
      const prev = prevRes.data ?? [];

      const days = period === "all"
        ? eachDayOfInterval({ start, end }).filter((_: any, i: number) => i % 7 === 0)
        : eachDayOfInterval({ start, end });

      const byDay: Record<string, { completed: number; total: number }> = {};
      current.forEach((ts: any) => {
        const d = ts.scheduled_date;
        if (!byDay[d]) byDay[d] = { completed: 0, total: 0 };
        byDay[d].total++;
        if (ts.status === "completed") byDay[d].completed++;
      });

      const todayStr = format(today, "yyyy-MM-dd");
      const chartData: DayData[] = days.map((d: Date) => {
        const key = format(d, "yyyy-MM-dd");
        const entry = byDay[key] ?? { completed: 0, total: 0 };
        const future = key > todayStr;
        return {
          date: key,
          label: period === "week" ? format(d, "EEE") : period === "month" ? format(d, "d") : format(d, "MMM d"),
          completed: entry.completed,
          total: entry.total,
          completionRate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
          isToday: key === todayStr,
          isFuture: future,
        };
      });

      const activeDays = chartData.filter((d) => !d.isFuture && d.total > 0);
      const avgCompletionRate = activeDays.length > 0
        ? activeDays.reduce((sum, d) => sum + d.completionRate, 0) / activeDays.length
        : 0;

      const prevByDay: Record<string, { completed: number; total: number }> = {};
      prev.forEach((ts: any) => {
        const d = ts.scheduled_date;
        if (!prevByDay[d]) prevByDay[d] = { completed: 0, total: 0 };
        prevByDay[d].total++;
        if (ts.status === "completed") prevByDay[d].completed++;
      });
      const prevActiveDays = Object.values(prevByDay).filter((d) => d.total > 0);
      const prevAvgCompletionRate = prevActiveDays.length > 0
        ? prevActiveDays.reduce((sum, d) => sum + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / prevActiveDays.length
        : 0;

      const completedItems = onTimeRes.data ?? [];
      const totalCompleted = completedItems.length;
      const prevTotalCompleted = prevOnTimeRes.data?.length ?? 0;
      const onTimeRate = totalCompleted > 0 ? Math.round((totalCompleted / Math.max(current.length, 1)) * 100) : 0;
      const prevOnTimeRate = prevTotalCompleted > 0 ? Math.round((prevTotalCompleted / Math.max(prev.length, 1)) * 100) : 0;

      let streak = 0;
      const allTimeRes = await db.from("task_schedules").select("scheduled_date, status").lte("scheduled_date", todayStr).order("scheduled_date", { ascending: false });

      if (allTimeRes.data) {
        const allByDay: Record<string, { completed: number; total: number }> = {};
        allTimeRes.data.forEach((ts: any) => {
          const d = ts.scheduled_date;
          if (!allByDay[d]) allByDay[d] = { completed: 0, total: 0 };
          allByDay[d].total++;
          if (ts.status === "completed") allByDay[d].completed++;
        });

        let checkDate = new Date(today);
        for (let i = 0; i < 365; i++) {
          const key = format(checkDate, "yyyy-MM-dd");
          const entry = allByDay[key];
          if (!entry || entry.total === 0) {
            if (i === 0) { checkDate = new Date(checkDate.setDate(checkDate.getDate() - 1)); continue; }
            break;
          }
          const rate = entry.completed / entry.total;
          if (rate >= 0.7) {
            streak++;
            checkDate = new Date(checkDate.setDate(checkDate.getDate() - 1));
          } else {
            break;
          }
        }
      }

      const dayOfWeekStats: Record<string, { total: number; completed: number; count: number }> = {};
      if (allTimeRes.data) {
        allTimeRes.data.forEach((ts: any) => {
          const dayName = format(new Date(ts.scheduled_date), "EEEE");
          if (!dayOfWeekStats[dayName]) dayOfWeekStats[dayName] = { total: 0, completed: 0, count: 0 };
          dayOfWeekStats[dayName].total++;
          if (ts.status === "completed") dayOfWeekStats[dayName].completed++;
        });
      }
      const bestDay = Object.entries(dayOfWeekStats)
        .filter(([, v]) => v.total >= 3)
        .sort((a, b) => b[1].completed / b[1].total - a[1].completed / a[1].total)[0]?.[0] ?? "";

      const result: AnalyticsData = {
        chartData,
        avgCompletionRate: Math.round(avgCompletionRate),
        onTimeRate,
        streak,
        mostProductiveDay: bestDay,
        totalCompleted,
        totalTasks: current.length,
        prevAvgCompletionRate: Math.round(prevAvgCompletionRate),
        prevOnTimeRate,
        insight: "",
      };
      result.insight = pickInsight(result);

      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
