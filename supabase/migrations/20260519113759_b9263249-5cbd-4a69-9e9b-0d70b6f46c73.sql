REVOKE SELECT (lat, lng, postcode) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (verified) ON public.profiles FROM anon, authenticated;

DROP POLICY IF EXISTS items_update_own ON public.items;
CREATE POLICY items_update_own ON public.items
  FOR UPDATE TO public
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);