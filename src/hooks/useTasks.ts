import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  estimated_hours: number;
  due_date: string;
  preferred_time: string | null;
  priority: "high" | "medium" | "low" | "none";
  status: "pending" | "in_progress" | "completed" | "skipped";
  tags: string[] | null;
  icon_emoji: string | null;
  icon_color: string | null;
  image_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TaskSchedule {
  id: string;
  task_id: string;
  user_id: string;
  scheduled_date: string;
  allocated_hours: number;
  start_time: string | null;
  end_time: string | null;
  status: string;
  is_locked: boolean;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  estimated_hours: number;
  due_date: string;
  preferred_time?: string;
  priority: "high" | "medium" | "low" | "none";
  tags?: string[];
  subtasks?: string[];
}

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = Math.floor(totalMinutes % 60);
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function useTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_schedules", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Task[];
    },
    enabled: !!user,
  });

  const schedulesQuery = useQuery({
    queryKey: ["task_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_schedules")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as unknown as TaskSchedule[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error("Not authenticated");

      // Insert task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          estimated_hours: input.estimated_hours,
          due_date: input.due_date,
          preferred_time: input.preferred_time || null,
          priority: input.priority,
          tags: input.tags && input.tags.length > 0 ? input.tags : null,
        } as any)
        .select()
        .single();

      if (taskError) throw taskError;
      const createdTask = task as unknown as Task;

      // Insert subtasks
      if (input.subtasks && input.subtasks.length > 0) {
        const subtaskRows = input.subtasks.map((title, i) => ({
          task_id: createdTask.id,
          title,
          order_index: i,
        }));
        const { error: subError } = await supabase.from("subtasks").insert(subtaskRows as any);
        if (subError) console.error("Subtask insert error:", subError);
      }

      // Auto-distribution: schedule across days
      await autoDistributeTask(createdTask, user.id);

      return createdTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      toast({ title: "Task created!", description: "Your task has been scheduled automatically." });
    },
    onError: (error) => {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    },
  });

  async function autoDistributeTask(task: Task, userId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.due_date + "T00:00:00");
    
    // Calculate days available
    const days: string[] = [];
    const current = new Date(tomorrow);
    while (current <= dueDate) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    if (days.length === 0) {
      // Due date is today or past, schedule everything for tomorrow
      days.push(tomorrow.toISOString().split("T")[0]);
    }

    const hoursPerDay = task.estimated_hours / days.length;

    // Get existing schedules for these days
    const { data: existingSchedules } = await supabase
      .from("task_schedules")
      .select("scheduled_date, allocated_hours")
      .eq("user_id", userId)
      .in("scheduled_date", days);

    const existingHoursMap: Record<string, number> = {};
    (existingSchedules as any[] || []).forEach((s: any) => {
      existingHoursMap[s.scheduled_date] = (existingHoursMap[s.scheduled_date] || 0) + Number(s.allocated_hours);
    });

    // Get user's daily hour limit (default 8)
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_hour_limit")
      .eq("id", userId)
      .single();
    const dailyLimit = (profile as any)?.daily_hour_limit || 8;

    const scheduleRows: any[] = [];
    let remainingHours = task.estimated_hours;
    let hasOverflow = false;

    for (const day of days) {
      if (remainingHours <= 0) break;
      const existingHours = existingHoursMap[day] || 0;
      const available = Math.max(0, dailyLimit - existingHours);
      const allocate = Math.min(hoursPerDay, available, remainingHours);

      if (allocate > 0) {
        const today = new Date().toISOString().split("T")[0];
        const row: any = {
          task_id: task.id,
          user_id: userId,
          scheduled_date: day,
          allocated_hours: Math.round(allocate * 100) / 100,
          status: "scheduled",
          is_locked: day !== today,
        };

        if (task.preferred_time) {
          row.start_time = task.preferred_time;
          row.end_time = addHoursToTime(task.preferred_time, allocate);
        }

        scheduleRows.push(row);
        remainingHours -= allocate;
      } else if (available <= 0) {
        // Day is full, try to push remaining hours
        hasOverflow = true;
      }
    }

    // If there are still remaining hours, try extra days after due date
    if (remainingHours > 0) {
      hasOverflow = true;
    }

    if (scheduleRows.length > 0) {
      const { error } = await supabase.from("task_schedules").insert(scheduleRows);
      if (error) console.error("Schedule insert error:", error);
    }

    if (hasOverflow) {
      toast({
        title: "Schedule is packed!",
        description: "Consider extending the deadline or removing other tasks.",
        variant: "destructive",
      });
    }
  }

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", taskId);
      if (error) throw error;

      // Also complete all schedules for this task
      await supabase
        .from("task_schedules")
        .update({ status: "completed" } as any)
        .eq("task_id", taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uncompleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "pending", completed_at: null } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      toast({ title: "Task deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    tasks: tasksQuery.data || [],
    schedules: schedulesQuery.data || [],
    isLoading: tasksQuery.isLoading,
    createTask,
    completeTask,
    uncompleteTask,
    deleteTask,
  };
}
