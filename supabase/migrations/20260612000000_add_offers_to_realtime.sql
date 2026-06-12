-- use-unread-messages.tsx subscribes to postgres_changes on public.offers,
-- but only public.messages was ever added to the realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
