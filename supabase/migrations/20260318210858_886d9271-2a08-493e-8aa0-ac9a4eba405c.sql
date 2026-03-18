DELETE FROM public.task_schedules
WHERE id IN (
  SELECT ts.id
  FROM public.task_schedules ts
  WHERE ts.status = 'scheduled'
    AND ts.scheduled_date > '2026-03-19'
    AND EXISTS (
      SELECT 1 FROM public.task_schedules done
      WHERE done.task_id = ts.task_id
        AND done.status = 'completed'
        AND done.scheduled_date <= '2026-03-19'
    )
);

DELETE FROM public.task_schedules
WHERE task_id = '88635c1a-5fb7-4a8d-b0eb-084dbe7a20f3'
  AND status = 'scheduled'
  AND scheduled_date = '2026-03-19';