-- Note: this migration previously enabled RLS + a policy on realtime.messages
-- (broadcast/presence channel authorization). That table is owned by the
-- supabase_realtime_admin role, so `supabase db push` fails on it with an
-- ownership error, and the app only uses postgres_changes (not broadcast),
-- so the policy guarded nothing. Removed.

-- Add missing UPDATE policy on item-images bucket (owner-scoped folder)
DROP POLICY IF EXISTS "item_images_update_own_folder" ON storage.objects;
CREATE POLICY "item_images_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Same for avatars bucket (defence-in-depth)
DROP POLICY IF EXISTS "avatars_update_own_folder" ON storage.objects;
CREATE POLICY "avatars_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
