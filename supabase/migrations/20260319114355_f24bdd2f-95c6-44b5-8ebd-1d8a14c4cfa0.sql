
-- Update handle_new_user to also create a default "Example" routine
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, nickname, avatar_url, theme_mode, theme_color, theme_intensity)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_id', 'avatar-01'),
    'light',
    '262 100% 65%',
    100
  );

  -- Create a default "Example" routine
  INSERT INTO public.routines (user_id, title, description, order_index, is_active)
  VALUES (
    NEW.id,
    'Example',
    'This is a sample routine. You can remove it anytime!',
    0,
    true
  );

  RETURN NEW;
END;
$$;

-- Add "Example" routine for existing users who don't have one
INSERT INTO public.routines (user_id, title, description, order_index, is_active)
SELECT p.id, 'Example', 'This is a sample routine. You can remove it anytime!', 0, true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.routines r WHERE r.user_id = p.id AND r.title = 'Example' AND r.is_active = true
);
