ALTER TABLE public.alarms ADD COLUMN original_alarm_time timestamptz;

-- Backfill existing alarms
UPDATE public.alarms SET original_alarm_time = alarm_time WHERE original_alarm_time IS NULL;