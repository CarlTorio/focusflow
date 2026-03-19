
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Only admins can view user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view ALL profiles (override existing SELECT policy)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for admin dashboard with user stats
CREATE OR REPLACE VIEW public.admin_user_stats AS
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
