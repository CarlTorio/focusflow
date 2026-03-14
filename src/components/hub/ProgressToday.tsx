import { CheckCircle2, CalendarX2, ListChecks, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function ProgressToday() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: taskCounts } = useQuery({
    queryKey: ["progress-today", today],
    queryFn: async () => {
      const [completedRes, outstandingRes, todosRes, notesRes] = await Promise.all([
        supabase
          .from("task_schedules")
          .select("id", { count: "exact", head: true })
          .eq("scheduled_date", today)
          .eq("status", "completed"),
        supabase
          .from("task_schedules")
          .select("id", { count: "exact", head: true })
          .eq("scheduled_date", today)
          .neq("status", "completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .neq("status", "completed"),
        supabase
          .from("notes" as any)
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${today}T23:59:59`),
      ]);
      return {
        completed: completedRes.count || 0,
        outstanding: outstandingRes.count || 0,
        todos: todosRes.count || 0,
        notes: notesRes.count || 0,
      };
    },
    enabled: !!user,
  });

  const cards = [
    { label: "Completed", sub: "Activities", count: taskCounts?.completed || 0, icon: CheckCircle2, color: "text-success", action: undefined },
    { label: "Outstanding", sub: "Activities", count: taskCounts?.outstanding || 0, icon: CalendarX2, color: "text-destructive", action: undefined },
    { label: "Todos", sub: "Outstanding", count: taskCounts?.todos || 0, icon: ListChecks, color: "text-primary", action: undefined },
    { label: "Notes", sub: "Today", count: taskCounts?.notes || 0, icon: FileText, color: "text-primary-dark", action: () => navigate("/notes") },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">Progress Today</h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            className="flex flex-col items-center rounded-2xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <card.icon className={`mb-2 h-8 w-8 ${card.color}`} />
            <p className="text-2xl font-bold text-foreground">{card.count}</p>
            <p className="text-sm font-medium text-foreground">{card.label}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
