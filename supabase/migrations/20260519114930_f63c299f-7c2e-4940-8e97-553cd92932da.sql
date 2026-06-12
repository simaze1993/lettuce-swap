
-- 1) Re-lock profiles column privileges (defense against any prior GRANT ALL)
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

GRANT SELECT (id, display_name, bio, city, country, avatar_url, verified, created_at)
  ON public.profiles TO anon, authenticated;

GRANT INSERT ON public.profiles TO authenticated;

GRANT UPDATE (display_name, bio, city, country, avatar_url, lat, lng, postcode)
  ON public.profiles TO authenticated;

-- 2) Harden offers: WITH CHECK on update preventing identity-field mutation
DROP POLICY IF EXISTS offers_update_participants ON public.offers;
CREATE POLICY offers_update_participants ON public.offers
  FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Revoke column-level UPDATE on immutable identity fields
REVOKE UPDATE (from_user_id, to_user_id, offered_item_id, requested_item_id)
  ON public.offers FROM anon, authenticated;

-- 3) Explicit UPDATE policy on item_images (owner of linked item only)
DROP POLICY IF EXISTS item_images_update_own ON public.item_images;
CREATE POLICY item_images_update_own ON public.item_images
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_images.item_id AND i.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_images.item_id AND i.owner_id = auth.uid()));
