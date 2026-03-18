// Explicit database types to avoid relying on auto-generated Supabase types
// which may be empty/stale and cause `never` type errors.

export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  estimated_hours: number;
  due_date: string;
  preferred_time: string | null;
  priority: string;
  status: string;
  tags: string[] | null;
  icon_emoji: string | null;
  icon_color: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DbTaskSchedule {
  id: string;
  task_id: string;
  user_id: string;
  scheduled_date: string;
  allocated_hours: number;
  actual_hours_spent: number | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  is_locked: boolean;
  display_title: string | null;
  subtask_id: string | null;
  created_at: string;
}

export interface DbSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  estimated_hours: number | null;
  created_at: string;
}

export interface DbNote {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  folder: string;
  is_starred: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbQuickTask {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  created_date: string;
  created_at: string;
}

export interface DbMoodEntry {
  id: string;
  user_id: string;
  mood: string;
  mood_zone: string;
  note: string | null;
  logged_at: string | null;
}

export interface DbRoutine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline_time: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface DbRoutineCompletion {
  id: string;
  routine_id: string;
  user_id: string;
  completed_date: string;
  completed_at: string;
}

export interface DbAlarm {
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

export interface DbProfile {
  id: string;
  daily_hour_limit: number;
  display_name: string | null;
  avatar_url: string | null;
}
