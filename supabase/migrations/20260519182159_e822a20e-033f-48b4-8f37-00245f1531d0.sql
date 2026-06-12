DROP POLICY IF EXISTS messages_insert_participants ON public.messages;
CREATE POLICY messages_insert_participants ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = messages.offer_id
        AND (auth.uid() = o.from_user_id OR auth.uid() = o.to_user_id)
        AND o.status = 'accepted'
    )
  );