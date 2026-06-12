-- 1. Restrict Realtime channel subscriptions on `messages` topic to offer participants.
--    Topics use the convention `offer:<offer_id>`.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_messages_select_offer_participants" ON realtime.messages;
CREATE POLICY "realtime_messages_select_offer_participants"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow postgres_changes events on tables (no topic / extension is 'postgres_changes')
  extension = 'postgres_changes'
  OR
  -- For broadcast/presence on offer:<uuid> topics, require participation
  (
    topic LIKE 'offer:%'
    AND EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id::text = split_part(realtime.messages.topic, ':', 2)
        AND (o.from_user_id = auth.uid() OR o.to_user_id = auth.uid())
    )
  )
);

-- 2. Add missing UPDATE policy on item-images bucket (owner-scoped folder)
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
