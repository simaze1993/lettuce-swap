
CREATE OR REPLACE FUNCTION public.guard_profiles_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    IF current_setting('app.allow_verified_write', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'profiles.verified can only be changed via request_verification()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_verification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM set_config('app.allow_verified_write', 'on', true);
  UPDATE public.profiles SET verified = true WHERE id = auth.uid();
END;
$$;
