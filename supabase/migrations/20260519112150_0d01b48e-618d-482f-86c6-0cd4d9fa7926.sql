
-- 1. Lock down `verified` self-grant on profiles
REVOKE UPDATE (verified) ON public.profiles FROM anon, authenticated;

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
  -- Demo verification flow. Replace with real identity check before production.
  UPDATE public.profiles SET verified = true WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_verification() TO authenticated;

-- 2. Hide precise geolocation + postcode from other users
REVOKE SELECT (lat, lng, postcode) ON public.profiles FROM anon, authenticated;

-- Owner-only access to own full profile (including sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Fuzzed nearby-profile lookup
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  p_lat double precision,
  p_lng double precision,
  p_deg_pad double precision DEFAULT 1.0
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  city text,
  country text,
  verified boolean,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.country,
    p.verified,
    -- Round to ~1.1 km grid so exact coordinates are never returned
    round((p.lat)::numeric, 2)::double precision AS lat,
    round((p.lng)::numeric, 2)::double precision AS lng
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.lat BETWEEN p_lat - p_deg_pad AND p_lat + p_deg_pad
    AND p.lng BETWEEN p_lng - p_deg_pad AND p_lng + p_deg_pad;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_profiles(double precision, double precision, double precision) TO authenticated;

-- 3. Restrict offer field tampering + status transitions
CREATE OR REPLACE FUNCTION public.enforce_offer_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Immutable identity fields
  IF NEW.from_user_id      IS DISTINCT FROM OLD.from_user_id
     OR NEW.to_user_id     IS DISTINCT FROM OLD.to_user_id
     OR NEW.offered_item_id IS DISTINCT FROM OLD.offered_item_id
     OR NEW.requested_item_id IS DISTINCT FROM OLD.requested_item_id THEN
    RAISE EXCEPTION 'offer identity fields are immutable';
  END IF;

  -- Status transition rules
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only the recipient may accept or decline a pending offer
    IF OLD.status = 'pending' AND NEW.status IN ('accepted','declined') THEN
      IF auth.uid() <> OLD.to_user_id THEN
        RAISE EXCEPTION 'only the recipient can accept or decline a pending offer';
      END IF;
    -- Either party can mark an accepted offer as completed or cancelled
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('completed','cancelled') THEN
      IF auth.uid() NOT IN (OLD.from_user_id, OLD.to_user_id) THEN
        RAISE EXCEPTION 'only a participant can change this offer status';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid offer status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_update_guard ON public.offers;
CREATE TRIGGER offers_update_guard
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.enforce_offer_update_rules();
