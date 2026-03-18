-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  display_name text,
  avatar_url text,
  daily_hour_limit numeric DEFAULT 8,
  onboarding_completed boolean DEFAULT false,
  theme_mode text DEFAULT 'system',
  theme_color text DEFAULT 'purple',
  theme_intensity numeric DEFAULT 50,
  nudge_enabled boolean DEFAULT true,
  nudge_frequency text DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_hours numeric DEFAULT 1,
  due_date date NOT NULL,
  preferred_time text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  tags text[],
  icon_emoji text,
  icon_color text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subtasks table
CREATE TABLE public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  estimated_hours numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subtasks" ON public.subtasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

-- Task schedules table
CREATE TABLE public.task_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_date date NOT NULL,
  allocated_hours numeric DEFAULT 1,
  actual_hours_spent numeric,
  start_time time,
  end_time time,
  status text DEFAULT 'scheduled',
  is_locked boolean DEFAULT false,
  display_title text,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.task_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own schedules" ON public.task_schedules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'Untitled',
  content text,
  folder text DEFAULT 'General',
  is_starred boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Quick tasks table
CREATE TABLE public.quick_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  created_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.quick_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own quick tasks" ON public.quick_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mood entries table
CREATE TABLE public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood text NOT NULL,
  mood_zone text NOT NULL,
  note text,
  logged_at timestamptz DEFAULT now()
);
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own moods" ON public.mood_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routines table
CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  deadline_time time,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routines" ON public.routines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Routine completions table
CREATE TABLE public.routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL,
  completed_at timestamptz DEFAULT now()
);
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own completions" ON public.routine_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alarms table
CREATE TABLE public.alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_schedule_id uuid REFERENCES public.task_schedules(id) ON DELETE SET NULL,
  alarm_type text DEFAULT 'custom',
  title text NOT NULL,
  alarm_time timestamptz NOT NULL,
  sound_type text DEFAULT 'default',
  custom_sound_url text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  recurrence_days integer[],
  snooze_duration_minutes integer DEFAULT 5,
  max_snoozes integer DEFAULT 3,
  snooze_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alarms" ON public.alarms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);