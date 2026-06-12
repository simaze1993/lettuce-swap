
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.grade < 1 OR NEW.grade > 100 THEN
    RAISE EXCEPTION 'grade must be between 1 and 100';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_review() FROM PUBLIC, anon, authenticated;
