
-- Lock item_id on item_images so an attacker can't re-parent images
REVOKE UPDATE (item_id) ON public.item_images FROM anon, authenticated;

-- Make sure no UPDATE was granted broadly on item_images either
REVOKE UPDATE ON public.item_images FROM anon, authenticated;
GRANT UPDATE (url, sort_order) ON public.item_images TO authenticated;
