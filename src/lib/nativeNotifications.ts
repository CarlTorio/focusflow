import { Capacitor } from "@capacitor/core";
import { LocalNotifications, ScheduleOptions } from "@capacitor/local-notifications";

/**
 * Check if we're running inside a native Capacitor app
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request notification permissions (native)
 */
export async function requestNativePermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

/**
 * Check current notification permission status
 */
export async function checkNativePermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  
  const result = await LocalNotifications.checkPermissions();
  return result.display === "granted";
}

/**
 * Schedule a native local notification for an alarm
 */
export async function scheduleAlarmNotification(alarm: {
  id: string;
  title: string;
  alarm_time: string;
  sound_type?: string;
  snooze_duration_minutes?: number;
}): Promise<void> {
  if (!isNativePlatform()) return;

  const alarmDate = new Date(alarm.alarm_time);
  
  // Don't schedule if the time has already passed
  if (alarmDate.getTime() <= Date.now()) return;

  // Generate a numeric ID from the UUID (LocalNotifications needs a number)
  const numericId = hashStringToNumber(alarm.id);

  const options: ScheduleOptions = {
    notifications: [
      {
        id: numericId,
        title: "⏰ FocusFlow Alarm",
        body: alarm.title,
        schedule: {
          at: alarmDate,
          allowWhileIdle: true, // Important: fires even in Doze mode
        },
        sound: alarm.sound_type ? `${alarm.sound_type}.mp3` : "alarm-1.mp3",
        channelId: "focusflow-alarms",
        extra: {
          alarmId: alarm.id,
          type: "alarm",
        },
        actionTypeId: "ALARM_ACTIONS",
        ongoing: true, // Persistent notification until dismissed
      },
    ],
  };

  try {
    await LocalNotifications.schedule(options);
    console.log(`[Native] Scheduled alarm notification: ${alarm.title} at ${alarmDate.toLocaleString()}`);
  } catch (err) {
    console.error("[Native] Failed to schedule notification:", err);
  }
}

/**
 * Cancel a scheduled notification for an alarm
 */
export async function cancelAlarmNotification(alarmId: string): Promise<void> {
  if (!isNativePlatform()) return;

  const numericId = hashStringToNumber(alarmId);

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: numericId }],
    });
    console.log(`[Native] Cancelled alarm notification: ${alarmId}`);
  } catch (err) {
    console.error("[Native] Failed to cancel notification:", err);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllAlarmNotifications(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (err) {
    console.error("[Native] Failed to cancel all notifications:", err);
  }
}

/**
 * Set up the notification channel for Android (required for Android 8+)
 */
export async function setupNotificationChannel(): Promise<void> {
  if (!isNativePlatform()) return;
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await LocalNotifications.createChannel({
      id: "focusflow-alarms",
      name: "FocusFlow Alarms",
      description: "Alarm notifications from FocusFlow",
      importance: 5, // Max importance - makes sound and shows heads-up
      visibility: 1, // Public - show on lock screen
      vibration: true,
      sound: "alarm-1.mp3",
      lights: true,
    });
    console.log("[Native] Notification channel created");
  } catch (err) {
    console.error("[Native] Failed to create notification channel:", err);
  }
}

/**
 * Register action types for alarm notifications (snooze/dismiss)
 */
export async function registerAlarmActions(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: "ALARM_ACTIONS",
          actions: [
            {
              id: "snooze",
              title: "Snooze",
            },
            {
              id: "dismiss",
              title: "Dismiss",
              destructive: true,
            },
          ],
        },
      ],
    });
    console.log("[Native] Alarm actions registered");
  } catch (err) {
    console.error("[Native] Failed to register actions:", err);
  }
}

/**
 * Initialize native notifications (call once on app start)
 */
export async function initializeNativeNotifications(): Promise<void> {
  if (!isNativePlatform()) return;

  await setupNotificationChannel();
  await registerAlarmActions();
  await requestNativePermissions();
}

/**
 * Listen for notification actions (snooze/dismiss)
 */
export function onNotificationAction(
  callback: (action: { actionId: string; alarmId: string }) => void
): void {
  if (!isNativePlatform()) return;

  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const alarmId = event.notification.extra?.alarmId;
    if (alarmId) {
      callback({
        actionId: event.actionId,
        alarmId,
      });
    }
  });
}

/**
 * Convert a UUID string to a numeric ID for LocalNotifications
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
