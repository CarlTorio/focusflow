
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  break_interval_hours NUMERIC,
  daily_hour_limit NUMERIC,
  nudge_enabled BOOLEAN DEFAULT true,
  nudge_frequency TEXT,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  theme_color TEXT,
  theme_intensity NUMERIC,
  theme_mode TEXT,
  working_hours_start TEXT,
  working_hours_end TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  estimated_hours NUMERIC NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  icon_emoji TEXT,
  icon_color TEXT,
  image_url TEXT,
  preferred_time TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own tasks" ON public.tasks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own subtasks" ON public.subtasks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can insert own subtasks" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can update own subtasks" ON public.subtasks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can delete own subtasks" ON public.subtasks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

-- Create task_schedules table
CREATE TABLE public.task_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  allocated_hours NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.task_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own schedules" ON public.task_schedules FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own schedules" ON public.task_schedules FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own schedules" ON public.task_schedules FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own schedules" ON public.task_schedules FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create mood_entries table
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  mood_zone TEXT NOT NULL,
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own moods" ON public.mood_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own moods" ON public.mood_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own moods" ON public.mood_entries FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own moods" ON public.mood_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  folder TEXT NOT NULL DEFAULT 'General',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own notes" ON public.notes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create alarms table
CREATE TABLE public.alarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_schedule_id UUID REFERENCES public.task_schedules(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL,
  title TEXT NOT NULL,
  alarm_time TIMESTAMPTZ NOT NULL,
  sound_type TEXT NOT NULL DEFAULT 'default',
  custom_sound_url TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
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
CREATE POLICY "Users can update own alarms" ON public.alarms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own alarms" ON public.alarms FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add FK from routines to profiles
ALTER TABLE public.routines ADD CONSTRAINT routines_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.routine_completions ADD CONSTRAINT routine_completions_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
