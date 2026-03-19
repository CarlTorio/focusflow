import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  scheduleAlarmNotification,
  cancelAlarmNotification,
  isNativePlatform,
} from "@/lib/nativeNotifications";

export interface Alarm {
  id: string;
  user_id: string;
  task_schedule_id: string | null;
  alarm_type: string;
  title: string;
  alarm_time: string;
  sound_type: string;
  custom_sound_url: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_days: number[] | null;
  snooze_duration_minutes: number;
  max_snoozes: number;
  snooze_count: number;
  is_active: boolean;
  created_at: string;
}

export type AlarmType = "task_reminder" | "custom" | "nudge" | "due_warning" | "break_reminder";
export type SoundType = "alarm-1" | "alarm-2" | "alarm-3" | "alarm-4" | "alarm-5" | "alarm-6" | "alarm-7" | "alarm-8" | "alarm-9" | "alarm-10" | "custom";

export interface CreateAlarmInput {
  title: string;
  alarm_type: AlarmType;
  alarm_time: string;
  sound_type?: string;
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
      const { data, error } = await supabase
        .from("alarms")
        .select("*")
        .eq("user_id", user!.id)
        .order("alarm_time", { ascending: true });
      if (error) throw error;
      return data as Alarm[];
    },
    enabled: !!user,
  });

  const createAlarm = useMutation({
    mutationFn: async (input: CreateAlarmInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("alarms")
        .insert({
          user_id: user.id,
          ...input,
          original_alarm_time: input.alarm_time,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Alarm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      // Schedule native notification
      if (isNativePlatform() && data) {
        scheduleAlarmNotification({
          id: data.id,
          title: data.title,
          alarm_time: data.alarm_time,
          sound_type: data.sound_type,
        });
      }
    },
  });

  const updateAlarm = useMutation({
    mutationFn: async (params: { id: string } & Partial<Alarm>) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("alarms")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Alarm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      // Re-schedule native notification if alarm time changed
      if (isNativePlatform() && data) {
        if (data.is_active) {
          scheduleAlarmNotification({
            id: data.id,
            title: data.title,
            alarm_time: data.alarm_time,
            sound_type: data.sound_type,
          });
        } else {
          cancelAlarmNotification(data.id);
        }
      }
    },
  });

  const deleteAlarm = useMutation({
    mutationFn: async (id: string) => {
      // Cancel native notification before deleting
      if (isNativePlatform()) {
        cancelAlarmNotification(id);
      }
      const { error } = await supabase.from("alarms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
    },
  });

  const snoozeAlarm = useMutation({
    mutationFn: async (alarm: Alarm) => {
      const newTime = new Date(Date.now() + alarm.snooze_duration_minutes * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("alarms")
        .update({
          alarm_time: newTime,
          snooze_count: alarm.snooze_count + 1,
        } as any)
        .eq("id", alarm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
    },
  });

  return {
    alarms: alarmsQuery.data || [],
    isLoading: alarmsQuery.isLoading,
    createAlarm,
    updateAlarm,
    deleteAlarm,
    snoozeAlarm,
  };
}
