
-- Enums
CREATE TYPE public.item_category AS ENUM ('clothing','art','instruments','toys','vinyl','plants','books','home','electronics','sports','other');
CREATE TYPE public.swap_type AS ENUM ('temporary','definitive');
CREATE TYPE public.item_status AS ENUM ('available','reserved','swapped');
CREATE TYPE public.offer_status AS ENUM ('pending','accepted','declined','completed','cancelled');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'city','')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category public.item_category NOT NULL,
  estimated_worth_cents INTEGER NOT NULL DEFAULT 0,
  swap_type public.swap_type NOT NULL DEFAULT 'definitive',
  wanted_categories public.item_category[] NOT NULL DEFAULT '{}',
  status public.item_status NOT NULL DEFAULT 'available',
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_all" ON public.items FOR SELECT USING (true);
CREATE POLICY "items_insert_own" ON public.items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "items_update_own" ON public.items FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "items_delete_own" ON public.items FOR DELETE USING (auth.uid() = owner_id);
CREATE INDEX items_owner_idx ON public.items(owner_id);
CREATE INDEX items_category_idx ON public.items(category);
CREATE INDEX items_city_idx ON public.items(city);

-- item_images
CREATE TABLE public.item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_images_select_all" ON public.item_images FOR SELECT USING (true);
CREATE POLICY "item_images_insert_own" ON public.item_images FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.owner_id = auth.uid()));
CREATE POLICY "item_images_delete_own" ON public.item_images FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.items i WHERE i.id = item_id AND i.owner_id = auth.uid()));
CREATE INDEX item_images_item_idx ON public.item_images(item_id);

-- offers
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  offered_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  status public.offer_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_select_participants" ON public.offers FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "offers_insert_sender" ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "offers_update_participants" ON public.offers FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE INDEX offers_from_idx ON public.offers(from_user_id);
CREATE INDEX offers_to_idx ON public.offers(to_user_id);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND (auth.uid() = o.from_user_id OR auth.uid() = o.to_user_id)));
CREATE POLICY "messages_insert_participants" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND (auth.uid() = o.from_user_id OR auth.uid() = o.to_user_id))
  );
CREATE INDEX messages_offer_idx ON public.messages(offer_id);

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, reviewer_id)
);
-- validate grade with trigger (flex over check)
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grade < 1 OR NEW.grade > 100 THEN
    RAISE EXCEPTION 'grade must be between 1 and 100';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_review_trg BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_participant" ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND o.status = 'completed'
        AND ((o.from_user_id = auth.uid() AND o.to_user_id = reviewee_id)
          OR (o.to_user_id = auth.uid() AND o.from_user_id = reviewee_id))
    )
  );
CREATE INDEX reviews_reviewee_idx ON public.reviews(reviewee_id);

-- storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images','item-images', true);

CREATE POLICY "item_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');
CREATE POLICY "item_images_authenticated_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item_images_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
