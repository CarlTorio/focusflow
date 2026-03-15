
-- Create routines table
CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  deadline_time time,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create routine_completions table
CREATE TABLE public.routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (routine_id, completed_date)
);

-- Enable RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for routines
CREATE POLICY "Users can view own routines" ON public.routines FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own routines" ON public.routines FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own routines" ON public.routines FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own routines" ON public.routines FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS policies for routine_completions
CREATE POLICY "Users can view own completions" ON public.routine_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own completions" ON public.routine_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own completions" ON public.routine_completions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own completions" ON public.routine_completions FOR DELETE TO authenticated USING (user_id = auth.uid());
