import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, db } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { DbTask, DbTaskSchedule, DbSubtask } from "@/types/database";

export type FocusSchedule = DbTaskSchedule & {
  task: DbTask;
  subtasks: DbSubtask[];
};

export function useFocusTask() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const schedulesQuery = useQuery({
    queryKey: ["focus_schedules", today],
    queryFn: async () => {
      const { data: schedules, error } = await db
        .from("task_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .eq("scheduled_date", today)
        .in("status", ["scheduled", "in_progress"])
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (!schedules || schedules.length === 0) return [];

      const taskIds = [...new Set(schedules.map((s: any) => s.task_id))];
      const { data: tasks } = await db
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      const { data: subtasks } = await db
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });

      const taskMap = new Map((tasks || []).map((t: any) => [t.id, t]));
      const subtaskMap = new Map<string, DbSubtask[]>();
      (subtasks || []).forEach((s: any) => {
        const arr = subtaskMap.get(s.task_id) || [];
        arr.push(s);
        subtaskMap.set(s.task_id, arr);
      });

      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 1, none: 2 };

      return schedules
        .map((s: any) => ({
          ...s,
          task: taskMap.get(s.task_id)!,
          subtasks: subtaskMap.get(s.task_id) || [],
        }))
        .filter((s: any) => s.task)
        .sort((a: any, b: any) => {
          if (a.status === "in_progress" && b.status !== "in_progress") return -1;
          if (b.status === "in_progress" && a.status !== "in_progress") return 1;
          const pa = priorityOrder[a.task.priority] ?? 3;
          const pb = priorityOrder[b.task.priority] ?? 3;
          return pa - pb;
        }) as FocusSchedule[];
    },
    enabled: !!user,
  });

  const completeSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const schedule = schedulesQuery.data?.find((s) => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found");

      await db
        .from("task_schedules")
        .update({ status: "completed" })
        .eq("id", scheduleId);

      const { data: remaining } = await db
        .from("task_schedules")
        .select("id")
        .eq("task_id", schedule.task_id)
        .in("status", ["scheduled", "in_progress"]);

      if (!remaining || remaining.length === 0 || (remaining.length === 1 && remaining[0].id === scheduleId)) {
        await db
          .from("tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", schedule.task_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focus_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      toast({ title: "Task completed! 🎉" });
    },
  });

  const skipSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      await db
        .from("task_schedules")
        .update({ status: "skipped" })
        .eq("id", scheduleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focus_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      toast({ title: "Task skipped" });
    },
  });

  const schedules = schedulesQuery.data || [];
  const currentSchedule = schedules[0] || null;
  const nextSchedule = schedules[1] || null;
  const remainingSchedules = schedules.slice(1);

  return {
    isLoading: schedulesQuery.isLoading,
    currentSchedule,
    nextSchedule,
    remainingSchedules,
    allDone: !schedulesQuery.isLoading && schedules.length === 0,
    completeSchedule,
    skipSchedule,
  };
}
