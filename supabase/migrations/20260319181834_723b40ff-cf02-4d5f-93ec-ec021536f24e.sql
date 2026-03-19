
-- Recreate view with security_invoker to use querying user's permissions
DROP VIEW IF EXISTS public.admin_user_stats;

CREATE VIEW public.admin_user_stats
WITH (security_invoker = on) AS
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.nickname,
    p.display_name,
    p.avatar_url,
    p.onboarding_completed,
    p.created_at,
    p.theme_mode,
    (SELECT COUNT(*) FROM public.tasks t WHERE t.user_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM public.tasks t WHERE t.user_id = p.id AND t.status = 'completed') AS completed_tasks,
    (SELECT COUNT(*) FROM public.notes n WHERE n.user_id = p.id) AS total_notes,
    (SELECT COUNT(*) FROM public.alarms a WHERE a.user_id = p.id) AS total_alarms,
    (SELECT COUNT(*) FROM public.mood_entries me WHERE me.user_id = p.id) AS total_mood_entries,
    (SELECT MAX(me.logged_at) FROM public.mood_entries me WHERE me.user_id = p.id) AS last_activity
FROM public.profiles p;
