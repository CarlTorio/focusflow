import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ScheduleWithTask = Tables<"task_schedules"> & {
  task: Tables<"tasks"> | null;
};

export interface CreatePlannerInput {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  allocated_hours: number;
  priority?: string;
  subtasks?: string[];
}

export function usePlanner(startDate: string, endDate: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ["planner_schedules", startDate, endDate],
    queryFn: async () => {
      // Fetch schedules in date range
      const { data: schedules, error } = await supabase
        .from("task_schedules")
        .select("*")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("start_time", { ascending: true, nullsFirst: true });
      if (error) throw error;

      // Fetch associated tasks
      const taskIds = [...new Set(schedules.map(s => s.task_id))];
      if (taskIds.length === 0) return [] as ScheduleWithTask[];

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);
      if (tasksError) throw tasksError;

      const taskMap = new Map(tasks.map(t => [t.id, t]));
      return schedules.map(s => ({
        ...s,
        task: taskMap.get(s.task_id) || null,
      })) as ScheduleWithTask[];
    },
    enabled: !!user,
  });

  const completeSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const schedule = schedulesQuery.data?.find(s => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found");

      // Update this schedule
      const { error } = await supabase
        .from("task_schedules")
        .update({ status: "completed" })
        .eq("id", scheduleId);
      if (error) throw error;

      // Check if all schedules for parent task are completed
      const { data: remaining } = await supabase
        .from("task_schedules")
        .select("id")
        .eq("task_id", schedule.task_id)
        .neq("status", "completed")
        .neq("id", scheduleId);

      if (!remaining || remaining.length === 0) {
        // All schedules completed, complete the parent task
        await supabase
          .from("tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", schedule.task_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlannerTask = useMutation({
    mutationFn: async (input: CreatePlannerInput) => {
      if (!user) throw new Error("Not authenticated");

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          estimated_hours: input.allocated_hours,
          due_date: input.scheduled_date,
          preferred_time: input.start_time || null,
          priority: input.priority || "none",
        })
        .select()
        .single();
      if (taskError) throw taskError;

      // Create a single schedule for the chosen date/time
      const today = new Date().toISOString().split("T")[0];
      const { error: schedError } = await supabase
        .from("task_schedules")
        .insert({
          task_id: task.id,
          user_id: user.id,
          scheduled_date: input.scheduled_date,
          allocated_hours: input.allocated_hours,
          start_time: input.start_time || null,
          end_time: input.end_time || null,
          status: "scheduled",
          is_locked: input.scheduled_date !== today,
        });
      if (schedError) throw schedError;

      // Insert subtasks
      if (input.subtasks && input.subtasks.length > 0) {
        const subtaskRows: TablesInsert<"subtasks">[] = input.subtasks.map((title, i) => ({
          task_id: task.id,
          title,
          order_index: i,
        }));
        await supabase.from("subtasks").insert(subtaskRows);
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      toast({ title: "Task added to planner!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    completeSchedule,
    createPlannerTask,
  };
}
