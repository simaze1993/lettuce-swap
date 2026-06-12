-- 1) Remove broad public SELECT (LIST) policies on storage.objects.
--    Buckets remain public=true so direct file URLs still resolve via the CDN,
--    but the storage API can no longer enumerate every file in the bucket.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "item_images_public_read" ON storage.objects;

-- Owners may still LIST their own folder (used by the app to manage uploads)
CREATE POLICY "avatars_owner_list"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "item_images_owner_list"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'item-images'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

-- 2) Lock down SECURITY DEFINER RPCs to authenticated callers only.
REVOKE EXECUTE ON FUNCTION public.request_verification()            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_nearby_profiles(double precision, double precision, double precision) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_verification()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_profiles(double precision, double precision, double precision) TO authenticated;