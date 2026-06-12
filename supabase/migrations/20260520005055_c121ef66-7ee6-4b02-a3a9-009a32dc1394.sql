
-- ============ item_likes ============
CREATE TABLE public.item_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL,
  from_item_id uuid NOT NULL,
  to_item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liker_id, from_item_id, to_item_id)
);

ALTER TABLE public.item_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_likes_select_own ON public.item_likes
  FOR SELECT USING (auth.uid() = liker_id);

CREATE POLICY item_likes_insert_own ON public.item_likes
  FOR INSERT WITH CHECK (auth.uid() = liker_id);

CREATE INDEX item_likes_lookup ON public.item_likes (to_item_id, from_item_id);

-- ============ item_skips ============
CREATE TABLE public.item_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skipper_id uuid NOT NULL,
  from_item_id uuid NOT NULL,
  to_item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skipper_id, from_item_id, to_item_id)
);

ALTER TABLE public.item_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_skips_select_own ON public.item_skips
  FOR SELECT USING (auth.uid() = skipper_id);

CREATE POLICY item_skips_insert_own ON public.item_skips
  FOR INSERT WITH CHECK (auth.uid() = skipper_id);

CREATE INDEX item_skips_lookup ON public.item_skips (skipper_id, from_item_id);

-- ============ Update offer-update guard to allow game-mode promotion ============
CREATE OR REPLACE FUNCTION public.enforce_offer_update_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Immutable identity fields
  IF NEW.from_user_id      IS DISTINCT FROM OLD.from_user_id
     OR NEW.to_user_id     IS DISTINCT FROM OLD.to_user_id
     OR NEW.offered_item_id IS DISTINCT FROM OLD.offered_item_id
     OR NEW.requested_item_id IS DISTINCT FROM OLD.requested_item_id THEN
    RAISE EXCEPTION 'offer identity fields are immutable';
  END IF;

  -- Status transition rules
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Allow game-mode promotion pending -> accepted from within record_game_like()
    IF OLD.status = 'pending'
       AND NEW.status = 'accepted'
       AND current_setting('app.allow_game_match', true) = 'on' THEN
      -- ok
      NULL;
    -- Only the recipient may accept or decline a pending offer
    ELSIF OLD.status = 'pending' AND NEW.status IN ('accepted','declined') THEN
      IF auth.uid() <> OLD.to_user_id THEN
        RAISE EXCEPTION 'only the recipient can accept or decline a pending offer';
      END IF;
    -- Either party can mark an accepted offer as completed or cancelled
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('completed','cancelled') THEN
      IF auth.uid() NOT IN (OLD.from_user_id, OLD.to_user_id) THEN
        RAISE EXCEPTION 'only a participant can change this offer status';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid offer status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- ============ record_game_like RPC ============
CREATE OR REPLACE FUNCTION public.record_game_like(
  p_from_item_id uuid,
  p_to_item_id uuid
)
RETURNS TABLE (matched boolean, offer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_from_owner uuid;
  v_to_owner uuid;
  v_from_status item_status;
  v_to_status item_status;
  v_reciprocal_exists boolean;
  v_offer_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT owner_id, status INTO v_from_owner, v_from_status
    FROM public.items WHERE id = p_from_item_id;
  SELECT owner_id, status INTO v_to_owner, v_to_status
    FROM public.items WHERE id = p_to_item_id;

  IF v_from_owner IS NULL OR v_to_owner IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_from_owner <> v_uid THEN
    RAISE EXCEPTION 'you can only play with your own item';
  END IF;
  IF v_to_owner = v_uid THEN
    RAISE EXCEPTION 'cannot like your own item';
  END IF;

  -- Idempotent insert of the like
  INSERT INTO public.item_likes (liker_id, from_item_id, to_item_id)
    VALUES (v_uid, p_from_item_id, p_to_item_id)
    ON CONFLICT DO NOTHING;

  -- Check reciprocal like: did the other owner like my from_item using their to_item?
  SELECT EXISTS (
    SELECT 1 FROM public.item_likes
    WHERE liker_id = v_to_owner
      AND from_item_id = p_to_item_id
      AND to_item_id = p_from_item_id
  ) INTO v_reciprocal_exists;

  IF NOT v_reciprocal_exists
     OR v_from_status <> 'available'
     OR v_to_status <> 'available' THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  -- Look for an existing offer between these two items (either direction)
  SELECT id INTO v_offer_id FROM public.offers
   WHERE (offered_item_id = p_from_item_id AND requested_item_id = p_to_item_id)
      OR (offered_item_id = p_to_item_id AND requested_item_id = p_from_item_id)
   LIMIT 1;

  IF v_offer_id IS NULL THEN
    INSERT INTO public.offers (
      from_user_id, to_user_id,
      offered_item_id, requested_item_id,
      message, status
    ) VALUES (
      v_uid, v_to_owner,
      p_from_item_id, p_to_item_id,
      '🎮 Matched in Game Mode', 'pending'
    ) RETURNING id INTO v_offer_id;

    -- Promote to accepted under game-mode flag
    PERFORM set_config('app.allow_game_match', 'on', true);
    UPDATE public.offers SET status = 'accepted' WHERE id = v_offer_id;
    PERFORM set_config('app.allow_game_match', 'off', true);

    -- Seed an opening message in the chat
    INSERT INTO public.messages (offer_id, sender_id, body)
    VALUES (v_offer_id, v_uid, '🎮 It''s a match! Say hi and arrange your swap.');
  END IF;

  RETURN QUERY SELECT true, v_offer_id;
END;
$$;
