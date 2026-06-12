-- Table currently has ALL privileges granted to anon/authenticated, which overrides
-- column-level revokes. Reset to least-privilege and re-grant only safe columns.
REVOKE ALL ON public.profiles FROM anon, authenticated;

-- Public-readable columns (no precise location, no postcode)
GRANT SELECT (id, display_name, bio, city, country, avatar_url, verified, created_at)
  ON public.profiles TO anon, authenticated;

-- Owners can update their own profile except the `verified` flag
GRANT UPDATE (display_name, bio, city, country, avatar_url, lat, lng, postcode)
  ON public.profiles TO authenticated;

-- Allow profile row creation (trigger from auth.users uses postgres role; this is a safety net)
GRANT INSERT (id, display_name, bio, city, country, avatar_url, lat, lng, postcode)
  ON public.profiles TO authenticated;