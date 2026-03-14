import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type FocusSchedule = Tables<"task_schedules"> & {
  task: Tables<"tasks">;
  subtasks: Tables<"subtasks">[];
};

export function useFocusTask() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const schedulesQuery = useQuery({
    queryKey: ["focus_schedules", today],
    queryFn: async () => {
      const { data: schedules, error } = await supabase
        .from("task_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .eq("scheduled_date", today)
        .in("status", ["scheduled", "in_progress"])
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      if (!schedules || schedules.length === 0) return [];

      const taskIds = [...new Set(schedules.map((s) => s.task_id))];
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      const { data: subtasks } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });

      const taskMap = new Map((tasks || []).map((t) => [t.id, t]));
      const subtaskMap = new Map<string, Tables<"subtasks">[]>();
      (subtasks || []).forEach((s) => {
        const arr = subtaskMap.get(s.task_id) || [];
        arr.push(s);
        subtaskMap.set(s.task_id, arr);
      });

      // Sort: in_progress first, then by start_time, then priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };

      return schedules
        .map((s) => ({
          ...s,
          task: taskMap.get(s.task_id)!,
          subtasks: subtaskMap.get(s.task_id) || [],
        }))
        .filter((s) => s.task)
        .sort((a, b) => {
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

      await supabase
        .from("task_schedules")
        .update({ status: "completed" })
        .eq("id", scheduleId);

      // Check if all schedules for the task are completed
      const { data: remaining } = await supabase
        .from("task_schedules")
        .select("id")
        .eq("task_id", schedule.task_id)
        .in("status", ["scheduled", "in_progress"]);

      // Only the current one was remaining (now completed)
      if (!remaining || remaining.length === 0 || (remaining.length === 1 && remaining[0].id === scheduleId)) {
        await supabase
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
      await supabase
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
