import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, db } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { DbAlarm } from "@/types/database";

const db = supabase as any;

export type Alarm = DbAlarm;
export type AlarmType = "task_reminder" | "custom" | "nudge" | "due_warning" | "break_reminder";
export type SoundType = "default" | "chime" | "bell" | "nature" | "custom";

export interface CreateAlarmInput {
  title: string;
  alarm_type: AlarmType;
  alarm_time: string;
  sound_type?: SoundType;
  custom_sound_url?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_days?: number[];
  snooze_duration_minutes?: number;
  max_snoozes?: number;
  task_schedule_id?: string;
}

export function useAlarms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const alarmsQuery = useQuery({
    queryKey: ["alarms", user?.id],
    queryFn: async () => {
      const { data, error } = await db.from("alarms").select("*").eq("user_id", user!.id).order("alarm_time", { ascending: true });
      if (error) throw error;
      return data as Alarm[];
    },
    enabled: !!user,
  });

  const createAlarm = useMutation({
    mutationFn: async (input: CreateAlarmInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db.from("alarms").insert({ user_id: user.id, ...input }).select().single();
      if (error) throw error;
      return data as Alarm;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alarms"] }); },
  });

  const updateAlarm = useMutation({
    mutationFn: async (params: { id: string } & Partial<Alarm>) => {
      const { id, ...updates } = params;
      const { data, error } = await db.from("alarms").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Alarm;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alarms"] }); },
  });

  const deleteAlarm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("alarms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alarms"] }); },
  });

  const snoozeAlarm = useMutation({
    mutationFn: async (alarm: Alarm) => {
      const newTime = new Date(Date.now() + alarm.snooze_duration_minutes * 60 * 1000).toISOString();
      const { error } = await db.from("alarms").update({ alarm_time: newTime, snooze_count: alarm.snooze_count + 1 }).eq("id", alarm.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["alarms"] }); },
  });

  return { alarms: alarmsQuery.data || [], isLoading: alarmsQuery.isLoading, createAlarm, updateAlarm, deleteAlarm, snoozeAlarm };
}
