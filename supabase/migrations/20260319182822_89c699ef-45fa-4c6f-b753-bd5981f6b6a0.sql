
-- Allow admins to read all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all notes
CREATE POLICY "Admins can view all notes"
ON public.notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all alarms
CREATE POLICY "Admins can view all alarms"
ON public.alarms FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all mood entries
CREATE POLICY "Admins can view all mood_entries"
ON public.mood_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all subtasks
CREATE POLICY "Admins can view all subtasks"
ON public.subtasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all routines
CREATE POLICY "Admins can view all routines"
ON public.routines FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all quick_tasks
CREATE POLICY "Admins can view all quick_tasks"
ON public.quick_tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
