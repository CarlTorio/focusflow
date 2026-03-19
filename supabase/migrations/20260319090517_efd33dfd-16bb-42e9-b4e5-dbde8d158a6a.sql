CREATE TABLE public.reminder_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  notify_schedule text DEFAULT NULL,
  linked_alarm_id uuid REFERENCES public.alarms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminder notes"
ON public.reminder_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);