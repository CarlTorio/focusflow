import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskSchedule = Tables<"task_schedules">;
export type Subtask = Tables<"subtasks">;

export interface CreateTaskInput {
  title: string;
  description?: string;
  estimated_hours: number;
  due_date: string;
  preferred_time?: string;
  priority: string;
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

function subtractMinutesFromTime(date: string, time: string, minutes: number): string {
  const d = new Date(`${date}T${time}:00`);
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
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
      console.log("[Tasks] Fetching tasks...");
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Tasks] Fetch error:", error);
        toast({ title: "Failed to load tasks", description: "Please try again.", variant: "destructive" });
        throw error;
      }
      console.log("[Tasks] Loaded", data?.length, "tasks");
      return data;
    },
    enabled: !!user,
  });

  const schedulesQuery = useQuery({
    queryKey: ["task_schedules"],
    queryFn: async () => {
      console.log("[Tasks] Fetching schedules...");
      const { data, error } = await supabase
        .from("task_schedules")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (error) {
        console.error("[Tasks] Schedules fetch error:", error);
        throw error;
      }
      console.log("[Tasks] Loaded", data?.length, "schedules");
      return data;
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error("Not authenticated");

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
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Insert subtasks
      if (input.subtasks && input.subtasks.length > 0) {
        const subtaskRows: TablesInsert<"subtasks">[] = input.subtasks.map((title, i) => ({
          task_id: task.id,
          title,
          order_index: i,
        }));
        const { error: subError } = await supabase.from("subtasks").insert(subtaskRows);
        if (subError) console.error("Subtask insert error:", subError);
      }

      // Auto-distribution
      const schedules = await autoDistributeTask(task, user.id);

      // Auto-generate alarms for schedules with start_time
      await autoCreateTaskAlarms(task, schedules, user.id);

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      toast({ title: "Task created!", description: "Your task has been scheduled automatically." });
    },
    onError: (error) => {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    },
  });

  async function autoCreateTaskAlarms(task: Task, schedules: TablesInsert<"task_schedules">[], userId: string) {
    const alarmRows: any[] = [];

    // Create task_reminder alarms for schedules with start_time
    for (const sched of schedules) {
      if (sched.start_time && sched.scheduled_date) {
        alarmRows.push({
          user_id: userId,
          alarm_type: "task_reminder",
          title: task.title,
          alarm_time: subtractMinutesFromTime(sched.scheduled_date, sched.start_time, 5),
          sound_type: "default",
          is_active: true,
        });
      }
    }

    // Create due_warning alarms for tasks with estimated_hours > 2
    if (Number(task.estimated_hours) > 2) {
      const dueDate = task.due_date;
      const dayBefore = new Date(dueDate + "T00:00:00");
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);

      const dayOf = new Date(dueDate + "T00:00:00");
      dayOf.setHours(8, 0, 0, 0);

      if (dayBefore > new Date()) {
        alarmRows.push({
          user_id: userId,
          alarm_type: "due_warning",
          title: `Deadline tomorrow: ${task.title}`,
          alarm_time: dayBefore.toISOString(),
          sound_type: "default",
          is_active: true,
        });
      }

      if (dayOf > new Date()) {
        alarmRows.push({
          user_id: userId,
          alarm_type: "due_warning",
          title: `Deadline today: ${task.title}`,
          alarm_time: dayOf.toISOString(),
          sound_type: "default",
          is_active: true,
        });
      }
    }

    if (alarmRows.length > 0) {
      const { error } = await supabase.from("alarms").insert(alarmRows);
      if (error) console.error("Alarm insert error:", error);
    }
  }

  async function autoDistributeTask(task: Task, userId: string): Promise<TablesInsert<"task_schedules">[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.due_date + "T00:00:00");

    const days: string[] = [];
    const current = new Date(tomorrow);
    while (current <= dueDate) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    if (days.length === 0) {
      days.push(tomorrow.toISOString().split("T")[0]);
    }

    const hoursPerDay = Number(task.estimated_hours) / days.length;

    // Get existing schedules
    const { data: existingSchedules } = await supabase
      .from("task_schedules")
      .select("scheduled_date, allocated_hours")
      .eq("user_id", userId)
      .in("scheduled_date", days);

    const existingHoursMap: Record<string, number> = {};
    (existingSchedules || []).forEach(s => {
      existingHoursMap[s.scheduled_date] = (existingHoursMap[s.scheduled_date] || 0) + Number(s.allocated_hours);
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_hour_limit")
      .eq("id", userId)
      .single();
    const dailyLimit = profile?.daily_hour_limit || 8;

    const scheduleRows: TablesInsert<"task_schedules">[] = [];
    let remainingHours = Number(task.estimated_hours);
    let hasOverflow = false;
    const nowLocal = new Date();
    const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}-${String(nowLocal.getDate()).padStart(2, "0")}`;

    for (const day of days) {
      if (remainingHours <= 0) break;
      const existingHours = existingHoursMap[day] || 0;
      const available = Math.max(0, dailyLimit - existingHours);
      const allocate = Math.min(hoursPerDay, available, remainingHours);

      if (allocate > 0) {
        const row: TablesInsert<"task_schedules"> = {
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
        hasOverflow = true;
      }
    }

    if (remainingHours > 0) hasOverflow = true;

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

    return scheduleRows;
  }

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;

      await supabase
        .from("task_schedules")
        .update({ status: "completed" })
        .eq("task_id", taskId);

      // Deactivate associated alarms
      await supabase
        .from("alarms")
        .update({ is_active: false } as any)
        .eq("user_id", user!.id)
        .eq("alarm_type", "task_reminder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uncompleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "pending", completed_at: null })
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
      // Alarms linked to task_schedules will cascade delete
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
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
