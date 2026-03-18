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
  start_date?: string;
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

// ─── Subtask-based Distribution ───────────────────────────────────────────────

function distributeSubtasks(
  subtasks: { id: string; title: string }[],
  startDate: string,
  dueDate: string
): { subtaskId: string; subtaskTitle: string; scheduledDate: string }[] {
  const start = parseISO(startDate);
  const end = parseISO(dueDate);
  const daysAvailable = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const result: { subtaskId: string; subtaskTitle: string; scheduledDate: string }[] = [];

  if (subtasks.length <= daysAvailable) {
    // Assign one subtask per day, front-loaded
    subtasks.forEach((st, i) => {
      result.push({
        subtaskId: st.id,
        subtaskTitle: st.title,
        scheduledDate: format(addDays(start, i), "yyyy-MM-dd"),
      });
    });
  } else {
    // More subtasks than days — multiple per day
    const perDay = Math.ceil(subtasks.length / daysAvailable);
    let dayIdx = 0;
    let assigned = 0;

    subtasks.forEach((st) => {
      result.push({
        subtaskId: st.id,
        subtaskTitle: st.title,
        scheduledDate: format(addDays(start, Math.min(dayIdx, daysAvailable - 1)), "yyyy-MM-dd"),
      });
      assigned++;
      if (assigned >= perDay) {
        dayIdx++;
        assigned = 0;
      }
    });
  }

  return result;
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

      const subtaskMap = new Map<string, Tables<"subtasks">>();
      (subtaskRows || []).forEach((st) => subtaskMap.set(st.id, st));

      return schedules.map((s) => {
        const task = taskMap.get(s.task_id) || null;
        const subtask = s.subtask_id ? subtaskMap.get(s.subtask_id) || null : null;
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

  // ─── Missed tasks query ────────────────────────────────────────────────────
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

      const subtaskIds = data.map((s) => s.subtask_id).filter(Boolean) as string[];
      const subtaskMap = new Map<string, Tables<"subtasks">>();
      if (subtaskIds.length > 0) {
        const { data: sts } = await supabase.from("subtasks").select("*").in("id", subtaskIds);
        (sts || []).forEach((st) => subtaskMap.set(st.id, st));
      }

      return data.map((s) => ({
        ...s,
        task: taskMap.get(s.task_id) || null,
        subtask: s.subtask_id ? subtaskMap.get(s.subtask_id) || null : null,
      })) as ScheduleWithTask[];
    },
    enabled: !!user,
  });

  // ─── Due date warnings query ──────────────────────────────────────────────
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

      // Get subtasks for projects
      const { data: subtaskRows } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds);

      return tasks.map((t) => {
        const taskSchedules = (schedules || []).filter((s) => s.task_id === t.id);
        const taskSubtasks = (subtaskRows || []).filter((st) => st.task_id === t.id);
        const completedSubtasks = taskSubtasks.filter((st) => st.is_completed);
        const totalSubtasks = taskSubtasks.length;
        const remainingSubtasks = totalSubtasks - completedSubtasks.length;
        const daysUntilDue = differenceInCalendarDays(parseISO(t.due_date), new Date());

        return {
          ...t,
          remainingSubtasks,
          totalSubtasks,
          remainingHours: Math.max(0, Number(t.estimated_hours) - taskSchedules.filter((s) => s.status === "completed").reduce((sum, s) => sum + Number(s.allocated_hours), 0)),
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
          isDueToday: daysUntilDue === 0,
          isDueTomorrow: daysUntilDue === 1,
          isDueIn2Days: daysUntilDue === 2,
        };
      }).filter((t) => t.totalSubtasks > 0 ? t.remainingSubtasks > 0 : t.remainingHours > 0);
    },
    enabled: !!user,
  });

  // ─── All HIGH priority tasks (for smart focus) ────────────────────────────
  const allHighTasksQuery = useQuery({
    queryKey: ["all_high_priority_tasks"],
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("priority", "high")
        .neq("status", "completed");

      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map((t) => t.id);
      const { data: subtasks } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });

      const subtasksByTask = new Map<string, Tables<"subtasks">[]>();
      (subtasks || []).forEach((st) => {
        const arr = subtasksByTask.get(st.task_id) || [];
        arr.push(st);
        subtasksByTask.set(st.task_id, arr);
      });

      return tasks.map((t) => ({
        ...t,
        subtasks: subtasksByTask.get(t.id) || [],
      }));
    },
    enabled: !!user,
  });

  // ─── Complete schedule (with advancing logic) ─────────────────────────────
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

      // Mark schedule as completed
      await supabase
        .from("task_schedules")
        .update({
          status: "completed",
          actual_hours_spent: actualHours ?? schedule.allocated_hours,
        })
        .eq("id", scheduleId);

      // Mark subtask as completed if it has one
      const subtaskId = schedule.subtask_id;
      if (subtaskId) {
        await supabase
          .from("subtasks")
          .update({ is_completed: true })
          .eq("id", subtaskId);

        // Check if there's a next subtask to unlock (advancing feature)
        const task = schedule.task;
        if (task?.subtasks && task.subtasks.length > 0) {
          const allSubtasks = [...task.subtasks].sort((a, b) => a.order_index - b.order_index);
          const currentIdx = allSubtasks.findIndex((st) => st.id === subtaskId);
          
          // Find the next uncompleted subtask
          let nextSubtask: Tables<"subtasks"> | null = null;
          for (let i = currentIdx + 1; i < allSubtasks.length; i++) {
            if (!allSubtasks[i].is_completed) {
              nextSubtask = allSubtasks[i];
              break;
            }
          }

          // Check if ALL subtasks are now done (project complete)
          const completedCount = allSubtasks.filter((st) => st.is_completed || st.id === subtaskId).length;
          
          if (completedCount >= allSubtasks.length) {
            // Project complete!
            await supabase
              .from("tasks")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", task.id);

            // Complete all remaining schedules
            await supabase
              .from("task_schedules")
              .update({ status: "completed" })
              .eq("task_id", task.id)
              .neq("status", "completed");

            return { displayTitle: task.title, projectComplete: true };
          }

          // If there's a next subtask, redistribute remaining
          if (nextSubtask) {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

            // Get remaining uncompleted subtasks
            const remainingSubtasks = allSubtasks.filter(
              (st) => !st.is_completed && st.id !== subtaskId
            );

            // Delete future scheduled schedules for this task
            await supabase
              .from("task_schedules")
              .delete()
              .eq("task_id", task.id)
              .in("status", ["scheduled"])
              .gte("scheduled_date", tomorrowStr);

            // Redistribute remaining subtasks starting from tomorrow
            if (remainingSubtasks.length > 0 && task.due_date) {
              const slots = distributeSubtasks(
                remainingSubtasks.map((st) => ({ id: st.id, title: st.title })),
                tomorrowStr,
                task.due_date
              );

              const newSchedules = slots.map((slot) => ({
                task_id: task.id,
                user_id: schedule.user_id,
                scheduled_date: slot.scheduledDate,
                allocated_hours: 0,
                status: "scheduled",
                is_locked: slot.scheduledDate !== todayStr,
                display_title: slot.subtaskTitle,
                subtask_id: slot.subtaskId,
              }));

              if (newSchedules.length > 0) {
                await supabase.from("task_schedules").insert(newSchedules as any);
              }
            }

            return {
              displayTitle: schedule.display_title || task.title,
              nextSubtaskTitle: nextSubtask.title,
              projectComplete: false,
            };
          }
        }
      }

      // Check if ALL task schedules are completed (non-project tasks)
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

      const displayTitle = schedule.display_title || schedule.task?.title || "Task";
      return { displayTitle, projectComplete: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["focus_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
      queryClient.invalidateQueries({ queryKey: ["priority_tasks_overview"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all_high_priority_tasks"] });

      if (result?.projectComplete) {
        toast({ title: `Project complete — "${result.displayTitle}"` });
      } else if (result?.nextSubtaskTitle) {
        toast({ title: `Done. Next: ${result.nextSubtaskTitle}` });
      } else {
        toast({ title: `${result?.displayTitle || "Task"} completed` });
      }
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
          subtask_id: missed.subtask_id || null,
          display_title: missed.display_title || missed.task?.title || "",
        });
      } else if (action === "adjust") {
        await supabase
          .from("task_schedules")
          .update({ status: "missed" })
          .eq("id", scheduleId);

        const subtaskId = missed.subtask_id;

        if (subtaskId && missed.task) {
          // For project tasks: reschedule missed + shift remaining
          // Get all remaining subtasks for this project
          const { data: allSubtasks } = await supabase
            .from("subtasks")
            .select("*")
            .eq("task_id", missed.task_id)
            .eq("is_completed", false)
            .order("order_index", { ascending: true });

          // Delete future scheduled schedules
          await supabase
            .from("task_schedules")
            .delete()
            .eq("task_id", missed.task_id)
            .in("status", ["scheduled"])
            .gte("scheduled_date", todayStr);

          // Redistribute all remaining subtasks from today
          if (allSubtasks && allSubtasks.length > 0) {
            const slots = distributeSubtasks(
              allSubtasks.map((st) => ({ id: st.id, title: st.title })),
              todayStr,
              missed.task.due_date
            );

            const newSchedules = slots.map((slot) => ({
              task_id: missed.task_id,
              user_id: missed.user_id,
              scheduled_date: slot.scheduledDate,
              allocated_hours: 0,
              status: "scheduled",
              is_locked: slot.scheduledDate !== todayStr,
              display_title: slot.subtaskTitle,
              subtask_id: slot.subtaskId,
            }));

            if (newSchedules.length > 0) {
              await supabase.from("task_schedules").insert(newSchedules as any);
            }
          }
        } else {
          // Non-project task: just reschedule to today
          await supabase.from("task_schedules").insert({
            task_id: missed.task_id,
            user_id: missed.user_id,
            scheduled_date: todayStr,
            allocated_hours: missed.allocated_hours,
            status: "scheduled",
            is_locked: false,
            display_title: missed.display_title || missed.task?.title || "",
          });
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
      const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

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
        });
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
        // Create the task (estimated_hours=0 for subtask-based projects)
        const { data: task, error: tErr } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: input.title,
            description: input.description || null,
            estimated_hours: 0,
            due_date: input.due_date,
            priority: input.priority,
            status: "pending",
            tags: input.tags || null,
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
                order_index: i,
              }))
            )
            .select();
          insertedSubtasks = sts || [];
        }

        // Distribute subtasks across days (or create single schedule if no subtasks)
        const startStr = input.start_date || todayStr;
        if (insertedSubtasks.length > 0) {
          const slots = distributeSubtasks(
            insertedSubtasks.map((st) => ({ id: st.id, title: st.title })),
            startStr,
            input.due_date
          );

          const scheduleRows = slots.map((slot) => ({
            task_id: task.id,
            user_id: user.id,
            scheduled_date: slot.scheduledDate,
            allocated_hours: 0,
            status: "scheduled",
            is_locked: slot.scheduledDate !== todayStr,
            display_title: slot.subtaskTitle,
            subtask_id: slot.subtaskId,
          }));

          if (scheduleRows.length > 0) {
            await supabase.from("task_schedules").insert(scheduleRows as any);
          }
        } else {
          // No subtasks — create a single schedule entry so it appears in planner
          await supabase.from("task_schedules").insert({
            task_id: task.id,
            user_id: user.id,
            scheduled_date: startStr,
            allocated_hours: 0,
            status: "scheduled",
            is_locked: false,
            display_title: input.title,
          });
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
            ? "Project scheduled"
            : input.kind === "recurring"
            ? "Routine added"
            : "Task added",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  // ─── Complete subtask directly (for focus mode - no schedule needed) ──────
  const completeSubtaskDirect = useMutation({
    mutationFn: async ({ subtaskId, taskId }: { subtaskId: string; taskId: string }) => {
      // Mark subtask as completed
      await supabase
        .from("subtasks")
        .update({ is_completed: true })
        .eq("id", subtaskId);

      // Delete any future schedule for this subtask
      await supabase
        .from("task_schedules")
        .delete()
        .eq("subtask_id", subtaskId)
        .in("status", ["scheduled"]);

      // Check if all subtasks are now done
      const { data: remaining } = await supabase
        .from("subtasks")
        .select("id")
        .eq("task_id", taskId)
        .eq("is_completed", false);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from("tasks")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", taskId);

        await supabase
          .from("task_schedules")
          .update({ status: "completed" })
          .eq("task_id", taskId)
          .neq("status", "completed");

        return { projectComplete: true };
      }

      return { projectComplete: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      if (result?.projectComplete) {
        toast({ title: "Project complete!" });
      } else {
        toast({ title: "Subtask done!" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── Update task (edit project) ─────────────────────────────────────────
  const updateTask = useMutation({
    mutationFn: async (input: {
      taskId: string;
      title?: string;
      priority?: string;
      due_date?: string;
      description?: string;
      addSubtasks?: { title: string }[];
      removeSubtaskIds?: string[];
    }) => {
      const updates: Record<string, any> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.due_date !== undefined) updates.due_date = input.due_date;
      if (input.description !== undefined) updates.description = input.description;

      if (Object.keys(updates).length > 0) {
        await supabase.from("tasks").update(updates).eq("id", input.taskId);
      }

      // Remove subtasks
      if (input.removeSubtaskIds && input.removeSubtaskIds.length > 0) {
        await supabase.from("task_schedules").delete().in("subtask_id", input.removeSubtaskIds);
        await supabase.from("subtasks").delete().in("id", input.removeSubtaskIds);
      }

      // Add new subtasks
      if (input.addSubtasks && input.addSubtasks.length > 0) {
        // Get current max order_index
        const { data: existing } = await supabase
          .from("subtasks")
          .select("order_index")
          .eq("task_id", input.taskId)
          .order("order_index", { ascending: false })
          .limit(1);
        const maxIdx = existing?.[0]?.order_index ?? -1;

        const { data: newSubs } = await supabase
          .from("subtasks")
          .insert(
            input.addSubtasks.map((st, i) => ({
              task_id: input.taskId,
              title: st.title,
              order_index: maxIdx + 1 + i,
            }))
          )
          .select();

        // Schedule new subtasks
        if (newSubs && newSubs.length > 0 && user) {
          const task = (await supabase.from("tasks").select("due_date").eq("id", input.taskId).single()).data;
          if (task) {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const slots = distributeSubtasks(
              newSubs.map((st) => ({ id: st.id, title: st.title })),
              todayStr,
              task.due_date
            );
            const scheduleRows = slots.map((slot) => ({
              task_id: input.taskId,
              user_id: user.id,
              scheduled_date: slot.scheduledDate,
              allocated_hours: 0,
              status: "scheduled",
              is_locked: slot.scheduledDate !== todayStr,
              display_title: slot.subtaskTitle,
              subtask_id: slot.subtaskId,
            }));
            if (scheduleRows.length > 0) {
              await supabase.from("task_schedules").insert(scheduleRows as any);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      toast({ title: "Project updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner_schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["due_soon_tasks"] });
      toast({ title: "Project deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    missedSchedules: missedQuery.data || [],
    dueSoonTasks: dueSoonQuery.data || [],
    allHighPriorityTasks: allHighTasksQuery.data || [],
    completeSchedule,
    completeSubtaskDirect,
    handleMissed,
    createTask,
    createPlannerTask: createTask,
    updateTask,
    deleteTask,
  };
}
