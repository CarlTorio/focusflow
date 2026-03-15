
-- Add estimated_hours to subtasks table
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS estimated_hours numeric NULL;

-- Add subtask_id, display_title, actual_hours_spent to task_schedules
ALTER TABLE public.task_schedules ADD COLUMN IF NOT EXISTS subtask_id uuid NULL REFERENCES public.subtasks(id) ON DELETE SET NULL;
ALTER TABLE public.task_schedules ADD COLUMN IF NOT EXISTS display_title text NOT NULL DEFAULT '';
ALTER TABLE public.task_schedules ADD COLUMN IF NOT EXISTS actual_hours_spent numeric NULL;

-- Backfill display_title from parent task title for existing schedules
UPDATE public.task_schedules ts
SET display_title = t.title
FROM public.tasks t
WHERE ts.task_id = t.id AND ts.display_title = '';

-- Create daily_summaries table
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  tasks_total integer DEFAULT 0,
  tasks_on_time integer DEFAULT 0,
  hours_worked numeric DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  routines_completed integer DEFAULT 0,
  routines_total integer DEFAULT 0,
  mood_average text,
  ai_insight text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

-- Enable RLS on daily_summaries
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON public.daily_summaries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own summaries" ON public.daily_summaries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own summaries" ON public.daily_summaries FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own summaries" ON public.daily_summaries FOR DELETE TO authenticated USING (user_id = auth.uid());
