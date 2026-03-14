
-- Create alarms table
CREATE TABLE public.alarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_schedule_id UUID REFERENCES public.task_schedules(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL CHECK (alarm_type IN ('task_reminder', 'custom', 'nudge', 'due_warning', 'break_reminder')),
  title TEXT NOT NULL,
  alarm_time TIMESTAMPTZ NOT NULL,
  sound_type TEXT NOT NULL DEFAULT 'default' CHECK (sound_type IN ('default', 'chime', 'bell', 'nature', 'custom')),
  custom_sound_url TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'weekdays', 'custom')),
  recurrence_days INTEGER[],
  snooze_duration_minutes INTEGER NOT NULL DEFAULT 5,
  max_snoozes INTEGER NOT NULL DEFAULT 3,
  snooze_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own alarms" ON public.alarms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own alarms" ON public.alarms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own alarms" ON public.alarms FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own alarms" ON public.alarms FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_alarms_user_active ON public.alarms(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_alarms_alarm_time ON public.alarms(alarm_time) WHERE is_active = true;
CREATE INDEX idx_alarms_task_schedule ON public.alarms(task_schedule_id) WHERE task_schedule_id IS NOT NULL;

-- Create alarm-sounds storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('alarm-sounds', 'alarm-sounds', false, 5242880, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg']);

-- Storage policies for alarm-sounds bucket
CREATE POLICY "Users can upload own alarm sounds"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'alarm-sounds' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own alarm sounds"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'alarm-sounds' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own alarm sounds"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'alarm-sounds' AND (storage.foldername(name))[1] = auth.uid()::text);
