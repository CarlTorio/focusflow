import { CheckCircle2, CalendarX2, Clock, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function ProgressToday() {
  const { user } = useAuth();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: stats } = useQuery({
    queryKey: ["progress-today", today],
    queryFn: async () => {
      const [completedRes, outstandingRes, completedDetailsRes] = await Promise.all([
        (((supabase as any).from(".select("id", { count: "exact", head: true }).eq("scheduled_date", today).eq("status", "completed") as any),
        (((supabase as any).from(".select("id", { count: "exact", head: true }).eq("scheduled_date", today).neq("status", "completed") as any),
        (((supabase as any).from(".select("allocated_hours, actual_hours_spent, status, end_time").eq("scheduled_date", today).eq("status", "completed") as any),
      ]);

      const { count: routinesDone } = await (supabase
        .from("routine_completions")
        .select("id", { count: "exact", head: true })
        .eq("completed_date", today) as any);

      const completedCount = (completedRes.count || 0) + (routinesDone || 0);
      const outstandingCount = outstandingRes.count || 0;

      const completedDetails = completedDetailsRes.data || [];
      const hoursWorked = completedDetails.reduce(
        (sum: number, s: any) => sum + Number(s.actual_hours_spent || s.allocated_hours || 0),
        0
      );

      const totalToday = (completedRes.count || 0) + outstandingCount;
      const onTimeRate = totalToday > 0
        ? Math.round(((completedRes.count || 0) / totalToday) * 100)
        : 0;

      return { completed: completedCount, outstanding: outstandingCount, onTimeRate, hoursWorked: Math.round(hoursWorked * 10) / 10 };
    },
    enabled: !!user,
  });

  const cards = [
    { label: "Completed", sub: "Activities", count: stats?.completed || 0, icon: CheckCircle2, color: "text-success" },
    { label: "Outstanding", sub: "Activities", count: stats?.outstanding || 0, icon: CalendarX2, color: "text-destructive" },
    { label: "On Time", sub: "Rate", count: stats?.onTimeRate !== undefined ? `${stats.onTimeRate}%` : "—", icon: Clock, color: "text-primary" },
    { label: "Hours Today", sub: "Worked", count: stats?.hoursWorked !== undefined ? `${stats.hoursWorked}h` : "0h", icon: Zap, color: "text-primary" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">Progress Today</h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col items-center rounded-2xl bg-card p-5 shadow-sm"
          >
            <card.icon className={`mb-2 h-8 w-8 ${card.color}`} />
            <p className="text-2xl font-bold text-foreground">{card.count}</p>
            <p className="text-sm font-medium text-foreground">{card.label}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
