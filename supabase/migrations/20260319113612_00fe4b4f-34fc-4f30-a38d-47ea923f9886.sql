
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
  RETURN NEW;
END;
$$;

-- Also set defaults for existing profiles that have null theme values
UPDATE public.profiles
SET theme_mode = 'light', theme_color = '262 100% 65%', theme_intensity = 100
WHERE theme_mode IS NULL OR theme_color IS NULL OR theme_intensity IS NULL;
