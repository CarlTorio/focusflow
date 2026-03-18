import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { DbTask, DbTaskSchedule, DbSubtask } from "@/types/database";

export type Task = DbTask;
export type TaskSchedule = DbTaskSchedule;
export type Subtask = DbSubtask;

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
      const { data, error } = await (supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  const schedulesQuery = useQuery({
    queryKey: ["task_schedules"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("task_schedules")
        .select("*")
        .order("scheduled_date", { ascending: true }) as any);
      if (error) throw error;
      return data as TaskSchedule[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data: task, error: taskError } = await (supabase
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
        .single() as any);

      if (taskError) throw taskError;

      if (input.subtasks && input.subtasks.length > 0) {
        const subtaskRows = input.subtasks.map((title, i) => ({
          task_id: task.id,
          title,
          order_index: i,
        }));
        const { error: subError } = await (((supabase as any).from(".insert(subtaskRows) as any);
        if (subError) console.error("Subtask insert error:", subError);
      }

      const schedules = await autoDistributeTask(task, user.id);
      await autoCreateTaskAlarms(task, schedules, user.id);

      return task as Task;
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

  async function autoCreateTaskAlarms(task: Task, schedules: any[], userId: string) {
    const alarmRows: any[] = [];

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
      const { error } = await (((supabase as any).from(".insert(alarmRows) as any);
      if (error) console.error("Alarm insert error:", error);
    }
  }

  async function autoDistributeTask(task: Task, userId: string): Promise<any[]> {
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

    const { data: existingSchedules } = await (supabase
      .from("task_schedules")
      .select("scheduled_date, allocated_hours")
      .eq("user_id", userId)
      .in("scheduled_date", days) as any);

    const existingHoursMap: Record<string, number> = {};
    (existingSchedules || []).forEach((s: any) => {
      existingHoursMap[s.scheduled_date] = (existingHoursMap[s.scheduled_date] || 0) + Number(s.allocated_hours);
    });

    const { data: profile } = await (supabase
      .from("profiles")
      .select("daily_hour_limit")
      .eq("id", userId)
      .single() as any);
    const dailyLimit = profile?.daily_hour_limit || 8;

    const scheduleRows: any[] = [];
    let remainingHours = Number(task.estimated_hours);
    let hasOverflow = false;
    const nowLocal = new Date();
    const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}-${String(nowLocal.getDate()).padStart(2, "0")}`;

    for (const day of days) {
      if (remainingHours <= 0) break;
      const existingHours = existingHoursMap[day] || 0;
      const available = Math.max(0, dailyLimit - existingHours);
      const allocate = Math.min(hoursPerDay, available, remainingHours);

      if (allocate > 0) {
        const row: any = {
          task_id: task.id,
          user_id: userId,
          scheduled_date: day,
          allocated_hours: Math.round(allocate * 100) / 100,
          status: "scheduled",
          is_locked: day !== todayStr,
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
      const { error } = await (((supabase as any).from(".insert(scheduleRows) as any);
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
      const { error } = await (supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId) as any);
      if (error) throw error;

      await (supabase
        .from("task_schedules")
        .update({ status: "completed" })
        .eq("task_id", taskId) as any);

      await (supabase
        .from("alarms")
        .update({ is_active: false })
        .eq("user_id", user!.id)
        .eq("alarm_type", "task_reminder") as any);
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
      const { error } = await (supabase
        .from("tasks")
        .update({ status: "pending", completed_at: null })
        .eq("id", taskId) as any);
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
      const { error } = await (((supabase as any).from(".delete().eq("id", taskId) as any);
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
