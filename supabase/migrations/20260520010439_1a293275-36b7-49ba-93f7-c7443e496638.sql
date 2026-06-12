-- Restrict EXECUTE on record_game_like to authenticated users only.
-- The function already validates auth.uid() and ownership server-side.
REVOKE ALL ON FUNCTION public.record_game_like(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_game_like(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_game_like(uuid, uuid) TO authenticated;