import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  scheduleAlarmNotification,
  cancelAlarmNotification,
  isNativePlatform,
} from "@/lib/nativeNotifications";
import { isOnline, addPendingMutation, getCachedData, setCachedData } from "@/lib/offlineStorage";

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

const CACHE_KEY = "alarms";

export function useAlarms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const alarmsQuery = useQuery({
    queryKey: ["alarms", user?.id],
    queryFn: async () => {
      if (!isOnline()) {
        const cached = await getCachedData<Alarm[]>(CACHE_KEY + "_" + user!.id);
        return cached || [];
      }
      const { data, error } = await supabase
        .from("alarms")
        .select("*")
        .eq("user_id", user!.id)
        .order("alarm_time", { ascending: true });
      if (error) throw error;
      const alarms = data as Alarm[];
      // Cache for offline
      await setCachedData(CACHE_KEY + "_" + user!.id, alarms);
      return alarms;
    },
    enabled: !!user,
    retry: isOnline() ? 3 : 0,
  });

  const createAlarm = useMutation({
    mutationFn: async (input: CreateAlarmInput) => {
      if (!user) throw new Error("Not authenticated");
      const insertData = {
        user_id: user.id,
        ...input,
        original_alarm_time: input.alarm_time,
      };

      // Always schedule native notification regardless of online status
      const tempId = crypto.randomUUID();
      if (isNativePlatform()) {
        scheduleAlarmNotification({
          id: tempId,
          title: input.title,
          alarm_time: input.alarm_time,
          sound_type: input.sound_type || "alarm-1",
        });
      }

      if (!isOnline()) {
        const offlineAlarm: Alarm = {
          id: tempId,
          ...insertData,
          alarm_type: input.alarm_type,
          sound_type: input.sound_type || "alarm-1",
          custom_sound_url: input.custom_sound_url || null,
          is_recurring: input.is_recurring || false,
          recurrence_pattern: input.recurrence_pattern || null,
          recurrence_days: input.recurrence_days || null,
          snooze_duration_minutes: input.snooze_duration_minutes || 5,
          max_snoozes: input.max_snoozes || 3,
          snooze_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          task_schedule_id: input.task_schedule_id || null,
        };

        // Add to pending queue
        await addPendingMutation({
          table: "alarms",
          operation: "insert",
          data: { ...insertData, id: tempId },
        });

        // Update local cache
        const cached = await getCachedData<Alarm[]>(CACHE_KEY + "_" + user.id) || [];
        await setCachedData(CACHE_KEY + "_" + user.id, [...cached, offlineAlarm]);

        return offlineAlarm;
      }

      const { data, error } = await supabase
        .from("alarms")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data as Alarm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
    },
  });

  const updateAlarm = useMutation({
    mutationFn: async (params: { id: string } & Partial<Alarm>) => {
      const { id, ...updates } = params;

      if (!isOnline()) {
        await addPendingMutation({
          table: "alarms",
          operation: "update",
          data: updates,
          matchColumn: "id",
          matchValue: id,
        });

        // Update cache
        if (user) {
          const cached = await getCachedData<Alarm[]>(CACHE_KEY + "_" + user.id) || [];
          await setCachedData(
            CACHE_KEY + "_" + user.id,
            cached.map((a) => (a.id === id ? { ...a, ...updates } : a))
          );
        }
        return { id, ...updates } as Alarm;
      }

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
      if (isNativePlatform()) cancelAlarmNotification(id);

      if (!isOnline()) {
        await addPendingMutation({
          table: "alarms",
          operation: "delete",
          matchColumn: "id",
          matchValue: id,
          data: {},
        });
        if (user) {
          const cached = await getCachedData<Alarm[]>(CACHE_KEY + "_" + user.id) || [];
          await setCachedData(CACHE_KEY + "_" + user.id, cached.filter((a) => a.id !== id));
        }
        return;
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
      const updates = { alarm_time: newTime, snooze_count: alarm.snooze_count + 1 };

      if (!isOnline()) {
        await addPendingMutation({
          table: "alarms",
          operation: "update",
          data: updates,
          matchColumn: "id",
          matchValue: alarm.id,
        });
        return;
      }

      const { error } = await supabase
        .from("alarms")
        .update(updates as any)
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
