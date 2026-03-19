import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { playAlarmSound, stopAlarmSound } from "@/lib/alarmSounds";
import { Alarm } from "@/hooks/useAlarms";
import { useQueryClient } from "@tanstack/react-query";
import {
  initializeNativeNotifications,
  onNotificationAction,
  isNativePlatform,
  scheduleAlarmNotification,
  cancelAlarmNotification,
} from "@/lib/nativeNotifications";

interface FiringAlarm {
  alarm: Alarm;
  dismissedAt?: number;
}

interface AlarmContextType {
  firingAlarm: FiringAlarm | null;
  dismiss: () => void;
  snooze: () => void;
  notificationPermission: NotificationPermission | "default";
  requestPermission: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [firingAlarm, setFiringAlarm] = useState<FiringAlarm | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const firedIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  }, []);

  const isInQuietHours = useCallback(() => {
    if (!profile) return false;
    const start = (profile as any).quiet_hours_start;
    const end = (profile as any).quiet_hours_end;
    if (!start || !end) return false;

    const now = new Date();
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (startMin > endMin) {
      // Spans midnight
      return nowMin >= startMin || nowMin < endMin;
    }
    return nowMin >= startMin && nowMin < endMin;
  }, [profile]);

  const checkAlarms = useCallback(async () => {
    if (!user || firingAlarm) return;

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const { data: alarms } = await supabase
      .from("alarms")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .lte("alarm_time", now.toISOString())
      .gte("alarm_time", fiveMinAgo.toISOString())
      .order("alarm_time", { ascending: true })
      .limit(1);

    if (!alarms || alarms.length === 0) return;
    const alarm = alarms[0] as Alarm;

    if (firedIds.current.has(alarm.id)) return;
    firedIds.current.add(alarm.id);

    if (isInQuietHours()) return;

    // Fire the alarm
    setFiringAlarm({ alarm });
    playAlarmSound(alarm.sound_type);

    // Send browser notification
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(alarm.title, {
          body: `Alarm: ${alarm.title}`,
          icon: "/favicon.ico",
          tag: alarm.id,
        });
      } catch (e) {
        // Notification API may not be available in all contexts
      }
    }
  }, [user, firingAlarm, isInQuietHours]);

  useEffect(() => {
    if (!user) return;
    intervalRef.current = setInterval(checkAlarms, 30000);
    // Check immediately on mount
    checkAlarms();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, checkAlarms]);

  // Realtime subscription for new alarms
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("alarms-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "alarms",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["alarms"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const dismiss = useCallback(() => {
    stopAlarmSound();
    if (firingAlarm) {
      // Deactivate non-recurring alarms
      if (!firingAlarm.alarm.is_recurring) {
        supabase
          .from("alarms")
          .update({ is_active: false } as any)
          .eq("id", firingAlarm.alarm.id)
          .then(() => queryClient.invalidateQueries({ queryKey: ["alarms"] }));
      }
    }
    setFiringAlarm(null);
  }, [firingAlarm, queryClient]);

  const snooze = useCallback(() => {
    stopAlarmSound();
    if (!firingAlarm) return;
    const alarm = firingAlarm.alarm;
    if (alarm.snooze_count >= alarm.max_snoozes) {
      dismiss();
      return;
    }
    const newTime = new Date(Date.now() + alarm.snooze_duration_minutes * 60 * 1000).toISOString();
    supabase
      .from("alarms")
      .update({
        alarm_time: newTime,
        snooze_count: alarm.snooze_count + 1,
      } as any)
      .eq("id", alarm.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["alarms"] });
        firedIds.current.delete(alarm.id);
      });
    setFiringAlarm(null);
  }, [firingAlarm, dismiss, queryClient]);

  return (
    <AlarmContext.Provider value={{ firingAlarm, dismiss, snooze, notificationPermission, requestPermission }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarmContext() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarmContext must be used within AlarmProvider");
  return ctx;
}

export function useAlarmContextSafe() {
  return useContext(AlarmContext) ?? null;
}
