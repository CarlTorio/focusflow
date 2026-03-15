import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO, differenceInCalendarDays } from "date-fns";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduleWithTask = Tables<"task_schedules"> & {
  task: (Tables<"tasks"> & { subtasks?: Tables<"subtasks">[] }) | null;
  subtask?: Tables<"subtasks"> | null;
};

export interface SubtaskInput {
  title: string;
  estimated_hours?: number | null;
}

export interface CreateProjectInput {
  kind: "project";
  title: string;
  description?: string;
  estimated_hours: number;
  due_date: string;
  priority: string;
  icon_emoji?: string;
  icon_color?: string;
  preferred_time?: string;
  tags?: string[];
  subtasks?: SubtaskInput[];
}

export interface CreateRecurringInput {
  kind: "recurring";
  title: string;
  duration_hours: number;
  recurrence_pattern: "daily" | "weekly" | "custom";
  recurrence_days?: number[];
  preferred_time?: string;
  priority: string;
  icon_emoji?: string;
}

export interface CreateSimpleInput {
  kind: "simple";
  title: string;
  estimated_hours: number;
  priority: string;
  scheduled_date: string;
  preferred_time?: string;
}

export type CreateTaskInput = CreateProjectInput | CreateRecurringInput | CreateSimpleInput;

// ─── Distribution Algorithm ───────────────────────────────────────────────────

interface DistributeOptions {
  startDate: string;
  dueDate: string;
  dailyLimit: number;
  existingHoursByDate: Record<string, number>;
}

interface ScheduleSlot {
  date: string;
  hours: number;
  displayTitle: string;
  subtaskIndex?: number;
  subtaskId?: string;
}

function distributeTasks(
  subtasks: SubtaskInput[],
  taskHours: number,
  taskTitle: string,
  opts: DistributeOptions
): ScheduleSlot[] {
  const { startDate, dueDate, dailyLimit, existingHoursByDate } = opts;
  const slots: ScheduleSlot[] = [];

  const start = parseISO(startDate);
  const end = parseISO(dueDate);
  const days: string[] = [];
  let d = start;
  while (d <= end) {
    days.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }

  if (days.length === 0) return [];

  const hasSubtasks = subtasks.length > 0 && subtasks[0].title !== taskTitle;

  const resolved = subtasks.map((st, i) => ({
    index: i,
    title: st.title,
    hours:
      st.estimated_hours && st.estimated_hours > 0
        ? st.estimated_hours
        : taskHours / subtasks.length,
  }));

  let dayIdx = 0;
  const remainingPerDay: number[] = days.map(
    (d) => dailyLimit - (existingHoursByDate[d] || 0)
  );

  for (let si = 0; si < resolved.length; si++) {
    let remaining = resolved[si].hours;
    let part = 1;

    while (remaining > 0.01) {
      while (dayIdx < days.length && remainingPerDay[dayIdx] <= 0) {
        dayIdx++;
      }
      if (dayIdx >= days.length) {
        const lastIdx = days.length - 1;
        slots.push({
          date: days[lastIdx],
          hours: Math.round(remaining * 100) / 100,
          displayTitle:
            part > 1
              ? `${resolved[si].title} (pt ${part})`
              : resolved[si].title,
          subtaskIndex: hasSubtasks ? resolved[si].index : undefined,
        });
        remaining = 0;
      } else {
        const canFit = Math.min(remainingPerDay[dayIdx], remaining);
        const isPartial = remaining - canFit > 0.01;

        slots.push({
          date: days[dayIdx],
          hours: Math.round(canFit * 100) / 100,
          displayTitle: isPartial
            ? `${resolved[si].title} (pt ${part})`
            : part > 1
            ? `${resolved[si].title} (pt ${part})`
            : resolved[si].title,
          subtaskIndex: hasSubtasks ? resolved[si].index : undefined,
        });

        remainingPerDay[dayIdx] -= canFit;
        remaining -= canFit;
        part++;
      }
    }
  }

  return slots;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanner(startDate: string, endDate: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ["planner_schedules", startDate, endDate],
    queryFn: async () => {
      const { data: schedules, error } = await supabase
        .from("task_schedules")
        .select("*")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("start_time", { ascending: true, nullsFirst: true });
      if (error) throw error;

      const taskIds = [...new Set(schedules.map((s) => s.task_id))];
      if (taskIds.length === 0) return [] as ScheduleWithTask[];

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);
      if (tasksError) throw tasksError;

      const { data: subtaskRows } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });

      const taskMap = new Map((tasks || []).map((t) => [t.id, t]));
      const subtasksByTask = new Map<string, Tables<"subtasks">[]>();
      (subtaskRows || []).forEach((st) => {
        const arr = subtasksByTask.get(st.task_id) || [];
        arr.push(st);
        subtasksByTask.set(st.task_id, arr);
      });

      // Build subtask map by id for linking
      const subtaskMap = new Map<string, Tables<"subtasks">>();
      (subtaskRows || []).forEach((st) => subtaskMap.set(st.id, st));

      return schedules.map((s) => {
        const task = taskMap.get(s.task_id) || null;
        const subtask = (s as any).subtask_id ? subtaskMap.get((s as any).subtask_id) || null : null;
        return {
          ...s,
          task: task
            ? {
                ...task,
                subtasks: subtasksByTask.get(task.id) || [],
              }
            : null,
          subtask,
        };
      }) as ScheduleWithTask[];
    },
    enabled: !!user,
  });

  // ─── Missed tasks query (yesterday's incomplete) ────────────────────────────
  const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd");
  const missedQuery = useQuery({
    queryKey: ["missed_schedules", yesterday],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_schedules")
        .select("*")
        .eq("scheduled_date", yesterday)
        .in("status", ["scheduled", "in_progress"]);

      if (!data || data.length === 0) return [];

      const taskIds = [...new Set(data.map((s) => s.task_id))];
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);
      const taskMap = new Map((tasks || []).map((t) => [t.id, t]));

      // Get subtasks for display
      const subtaskIds = data.map((s) => (s as any).subtask_id).filter(Boolean);
      const subtaskMap = new Map<string, Tables<"subtasks">>();
      if (subtaskIds.length > 0) {
        const { data: sts } = await supabase.from("subtasks").select("*").in("id", subtaskIds);
        (sts || []).forEach((st) => subtaskMap.set(st.id, st));
      }

      return data.map((s) => ({
        ...s,
        task: taskMap.get(s.task_id) || null,
        subtask: (s as any).subtask_id ? subtaskMap.get((s as any).subtask_id) || null : null,
      })) as ScheduleWithTask[];
    },
    enabled: !!user,
  });

  // ─── Due date warnings query ──────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd");
  const dueSoonQuery = useQuery({
    queryKey: ["due_soon_tasks"],
    queryFn: async () => {
      const twoDaysOut = format(addDays(new Date(), 2), "yyyy-MM-dd");
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .neq("status", "completed")
        .lte("due_date", twoDaysOut);

      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map((t) => t.id);
      const { data: schedules } = await supabase
        .from("task_schedules")
        .select("*")
        .in("task_id", taskIds);

      return tasks.map((t) => {
        const taskSchedules = (schedules || []).filter((s) => s.task_id === t.id);
        const completedHours = taskSchedules
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => sum + Number(s.allocated_hours), 0);
        const remainingHours = Number(t.estimated_hours) - completedHours;
        const daysUntilDue = differenceInCalendarDays(parseISO(t.due_date), new Date());

        return {
          ...t,
          remainingHours: Math.max(0, remainingHours),
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
          isDueToday: daysUntilDue === 0,
          isDueTomorrow: daysUntilDue === 1,
          isDueIn2Days: daysUntilDue === 2,
        };
      }).filter((t) => t.remainingHours > 0);
    },
    enabled: !!user,
  });

  // ─── Complete schedule ─────────────────────────────────────────────────────
  const completeSchedule = useMutation({
    mutationFn: async ({
      scheduleId,
      actualHours,
    }: {
      scheduleId: string;
      actualHours?: number;
    }) => {
      const schedule = schedulesQuery.data?.find((s) => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found");

      await supabase
        .from("task_schedules")
        .update({
          status: "completed",
          actual_hours_spent: actualHours ?? schedule.allocated_hours,
        } as any)
        .eq("id", scheduleId);

      // If this schedule has a subtask_id, check if all schedules for that subtask are done
      const subtaskId = (schedule as any).subtask_id;
      if (subtaskId) {
        const { data: subtaskSchedules } = await supabase
          .from("task_schedules")
          .select("id, status")
          .eq("subtask_id", subtaskId)
          .neq("id", scheduleId);

        const allDone = !subtaskSchedules || subtaskSchedules.every((s) => s.status === "completed");
        if (allDone) {
          await supabase
            .from("subtasks")
            .update({ is_completed: true })
            .eq("id", subtaskId);
        }
      }

      // Check if ALL task schedules are completed
      const { data: remaining } = await supabase
        .from("task_schedules")
        .select("id")
        .eq("task_id", schedule.task_id)
        .neq("status", "completed")
        .neq("id", scheduleId);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from("tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", schedule.task_id);
      }

      // Get display title for toast
      const displayTitle = (schedule as any).display_title || schedule.task?.title || "Task";
      return displayTitle;
    },
    onSuccess: (displayTitle) => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["focus_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
      queryClient.invalidateQueries({ queryKey: ["priority_tasks_overview"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      toast({ title: `✓ ${displayTitle} done!` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── Handle missed task ────────────────────────────────────────────────────
  const handleMissed = useMutation({
    mutationFn: async ({
      scheduleId,
      action,
    }: {
      scheduleId: string;
      action: "tonight" | "adjust" | "skip";
    }) => {
      const missed = missedQuery.data?.find((s) => s.id === scheduleId);
      if (!missed) return;

      if (action === "skip") {
        await supabase
          .from("task_schedules")
          .update({ status: "skipped" })
          .eq("id", scheduleId);
        return;
      }

      const todayStr = format(new Date(), "yyyy-MM-dd");

      if (action === "tonight") {
        await supabase
          .from("task_schedules")
          .update({ status: "missed" })
          .eq("id", scheduleId);

        await supabase.from("task_schedules").insert({
          task_id: missed.task_id,
          user_id: missed.user_id,
          scheduled_date: todayStr,
          allocated_hours: missed.allocated_hours,
          start_time: missed.start_time,
          end_time: missed.end_time,
          status: "scheduled",
          is_locked: false,
          subtask_id: (missed as any).subtask_id || null,
          display_title: (missed as any).display_title || missed.task?.title || "",
        } as any);
      } else if (action === "adjust") {
        await supabase
          .from("task_schedules")
          .update({ status: "missed" })
          .eq("id", scheduleId);

        const subtaskId = (missed as any).subtask_id;

        if (subtaskId) {
          // Smart adjust: shift this and all future subtask schedules forward by 1 day
          const { data: futureSchedules } = await supabase
            .from("task_schedules")
            .select("*")
            .eq("task_id", missed.task_id)
            .in("status", ["scheduled", "in_progress"])
            .neq("id", scheduleId)
            .gte("scheduled_date", yesterday)
            .order("scheduled_date", { ascending: true });

          // Create new schedule for missed subtask today
          await supabase.from("task_schedules").insert({
            task_id: missed.task_id,
            user_id: missed.user_id,
            scheduled_date: todayStr,
            allocated_hours: missed.allocated_hours,
            status: "scheduled",
            is_locked: false,
            subtask_id: subtaskId,
            display_title: (missed as any).display_title || "",
          } as any);

          // Shift all future schedules forward by 1 day
          if (futureSchedules && futureSchedules.length > 0) {
            for (const fs of futureSchedules) {
              const newDate = format(addDays(parseISO(fs.scheduled_date), 1), "yyyy-MM-dd");
              // Check if shifting past due date — compress if needed
              await supabase
                .from("task_schedules")
                .update({ scheduled_date: newDate })
                .eq("id", fs.id);
            }
          }
        } else {
          // No subtasks — redistribute remaining hours evenly
          const { data: allSchedules } = await supabase
            .from("task_schedules")
            .select("*")
            .eq("task_id", missed.task_id);

          const completedHours = (allSchedules || [])
            .filter((s) => s.status === "completed")
            .reduce((sum, s) => sum + Number(s.allocated_hours), 0);
          const totalHours = Number(missed.task?.estimated_hours || 0);
          const remainingHours = totalHours - completedHours;

          if (missed.task?.due_date) {
            const daysLeft = Math.max(1, differenceInCalendarDays(parseISO(missed.task.due_date), new Date()));
            const newDailyHours = remainingHours / daysLeft;

            // Update future schedules
            const futureSchedules = (allSchedules || []).filter(
              (s) => s.status === "scheduled" && s.scheduled_date >= todayStr && s.id !== scheduleId
            );

            for (const fs of futureSchedules) {
              await supabase
                .from("task_schedules")
                .update({ allocated_hours: Math.round(newDailyHours * 100) / 100 })
                .eq("id", fs.id);
            }

            // Also add today's portion
            await supabase.from("task_schedules").insert({
              task_id: missed.task_id,
              user_id: missed.user_id,
              scheduled_date: todayStr,
              allocated_hours: Math.round(newDailyHours * 100) / 100,
              status: "scheduled",
              is_locked: false,
              display_title: (missed as any).display_title || missed.task?.title || "",
            } as any);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missed_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      toast({ title: "Schedule updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── Create task ───────────────────────────────────────────────────────────
  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error("Not authenticated");

      const todayStr = format(new Date(), "yyyy-MM-dd");

      if (input.kind === "simple") {
        const { data: task, error: tErr } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: input.title,
            estimated_hours: input.estimated_hours,
            due_date: input.scheduled_date,
            priority: input.priority,
            preferred_time: input.preferred_time || null,
            status: "pending",
          })
          .select()
          .single();
        if (tErr) throw tErr;

        await supabase.from("task_schedules").insert({
          task_id: task.id,
          user_id: user.id,
          scheduled_date: input.scheduled_date,
          allocated_hours: input.estimated_hours,
          start_time: input.preferred_time || null,
          status: "scheduled",
          is_locked: input.scheduled_date !== todayStr,
          display_title: input.title,
        } as any);
        return task;
      }

      if (input.kind === "recurring") {
        const { data: task, error: tErr } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: input.title,
            estimated_hours: input.duration_hours,
            due_date: format(addDays(new Date(), 28), "yyyy-MM-dd"),
            priority: input.priority,
            preferred_time: input.preferred_time || null,
            status: "pending",
            icon_emoji: input.icon_emoji || null,
          })
          .select()
          .single();
        if (tErr) throw tErr;

        const schedules: any[] = [];
        for (let i = 0; i < 28; i++) {
          const d = addDays(new Date(), i + 1);
          const dayOfWeek = d.getDay();
          const dateStr = format(d, "yyyy-MM-dd");

          let include = false;
          if (input.recurrence_pattern === "daily") include = true;
          else if (input.recurrence_pattern === "weekly" && input.recurrence_days)
            include = input.recurrence_days.includes(dayOfWeek);

          if (include) {
            schedules.push({
              task_id: task.id,
              user_id: user.id,
              scheduled_date: dateStr,
              allocated_hours: input.duration_hours,
              start_time: input.preferred_time || null,
              status: "scheduled",
              is_locked: dateStr !== todayStr,
              display_title: input.title,
            });
          }
        }

        if (schedules.length > 0) {
          await supabase.from("task_schedules").insert(schedules);
        }
        return task;
      }

      if (input.kind === "project") {
        const { data: task, error: tErr } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: input.title,
            description: input.description || null,
            estimated_hours: input.estimated_hours,
            due_date: input.due_date,
            priority: input.priority,
            preferred_time: input.preferred_time || null,
            icon_emoji: input.icon_emoji || null,
            icon_color: input.icon_color || null,
            tags: input.tags || null,
            status: "pending",
          })
          .select()
          .single();
        if (tErr) throw tErr;

        // Insert subtasks
        let insertedSubtasks: Tables<"subtasks">[] = [];
        if (input.subtasks && input.subtasks.length > 0) {
          const { data: sts } = await supabase
            .from("subtasks")
            .insert(
              input.subtasks.map((st, i) => ({
                task_id: task.id,
                title: st.title,
                estimated_hours: st.estimated_hours ?? null,
                order_index: i,
              }))
            )
            .select();
          insertedSubtasks = sts || [];
        }

        // Fetch user's daily hour limit
        const { data: profile } = await supabase
          .from("profiles")
          .select("daily_hour_limit")
          .eq("id", user.id)
          .single();
        const dailyLimit = Number(profile?.daily_hour_limit) || 8;

        // Fetch existing hours on each day
        const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
        const { data: existingSchedules } = await supabase
          .from("task_schedules")
          .select("scheduled_date, allocated_hours")
          .gte("scheduled_date", tomorrow)
          .lte("scheduled_date", input.due_date)
          .eq("user_id", user.id);

        const existingByDate: Record<string, number> = {};
        (existingSchedules || []).forEach((s) => {
          existingByDate[s.scheduled_date] =
            (existingByDate[s.scheduled_date] || 0) + Number(s.allocated_hours);
        });

        // Run distribution
        const subtasksToDistribute =
          input.subtasks && input.subtasks.length > 0
            ? input.subtasks
            : [{ title: task.title, estimated_hours: input.estimated_hours }];

        const slots = distributeTasks(subtasksToDistribute, input.estimated_hours, task.title, {
          startDate: tomorrow,
          dueDate: input.due_date,
          dailyLimit,
          existingHoursByDate: existingByDate,
        });

        if (slots.length > 0) {
          const scheduleRows: any[] = slots.map((slot) => {
            const matchedSubtask =
              slot.subtaskIndex !== undefined
                ? insertedSubtasks[slot.subtaskIndex]
                : undefined;

            return {
              task_id: task.id,
              user_id: user.id,
              scheduled_date: slot.date,
              allocated_hours: slot.hours,
              start_time: input.preferred_time || null,
              status: "scheduled",
              is_locked: slot.date !== todayStr,
              display_title: slot.displayTitle,
              subtask_id: matchedSubtask?.id || null,
            };
          });

          await supabase.from("task_schedules").insert(scheduleRows);
        }

        return task;
      }
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["priority_tasks_overview"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      toast({
        title:
          input.kind === "project"
            ? "Project scheduled! 🗓️"
            : input.kind === "recurring"
            ? "Routine added! 🔄"
            : "Task added! ✅",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    missedSchedules: missedQuery.data || [],
    dueSoonTasks: dueSoonQuery.data || [],
    completeSchedule,
    handleMissed,
    createTask,
    createPlannerTask: createTask,
  };
}
