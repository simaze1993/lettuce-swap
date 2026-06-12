
DROP POLICY IF EXISTS offers_insert_sender ON public.offers;
CREATE POLICY offers_insert_sender ON public.offers
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND auth.uid() <> to_user_id
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = offered_item_id
        AND i.owner_id = auth.uid()
        AND i.status = 'available'
    )
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = requested_item_id
        AND i.owner_id = to_user_id
        AND i.status = 'available'
    )
  );
