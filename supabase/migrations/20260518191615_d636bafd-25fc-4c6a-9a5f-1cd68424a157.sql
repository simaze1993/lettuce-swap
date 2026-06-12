-- Convert columns to text temporarily
ALTER TABLE public.items ALTER COLUMN wanted_categories DROP DEFAULT;
ALTER TABLE public.items ALTER COLUMN category TYPE text;
ALTER TABLE public.items ALTER COLUMN wanted_categories TYPE text[];

-- Remap old values to new categories
UPDATE public.items SET category = CASE category
  WHEN 'home' THEN 'house_garden'
  WHEN 'plants' THEN 'house_garden'
  WHEN 'toys' THEN 'children'
  WHEN 'sports' THEN 'activities'
  WHEN 'art' THEN 'art_design'
  WHEN 'vinyl' THEN 'music_movies'
  WHEN 'instruments' THEN 'music_movies'
  WHEN 'other' THEN 'house_garden'
  ELSE category
END;

UPDATE public.items SET wanted_categories = COALESCE(ARRAY(
  SELECT DISTINCT CASE c
    WHEN 'home' THEN 'house_garden'
    WHEN 'plants' THEN 'house_garden'
    WHEN 'toys' THEN 'children'
    WHEN 'sports' THEN 'activities'
    WHEN 'art' THEN 'art_design'
    WHEN 'vinyl' THEN 'music_movies'
    WHEN 'instruments' THEN 'music_movies'
    WHEN 'other' THEN 'house_garden'
    ELSE c
  END
  FROM unnest(wanted_categories) AS c
), '{}'::text[]);

-- Drop old enum and create new one
DROP TYPE public.item_category;
CREATE TYPE public.item_category AS ENUM (
  'house_garden',
  'clothing',
  'beauty',
  'electronics',
  'animals',
  'children',
  'activities',
  'art_design',
  'music_movies',
  'books'
);

-- Convert columns back to enum type
ALTER TABLE public.items ALTER COLUMN category TYPE public.item_category USING category::public.item_category;
ALTER TABLE public.items ALTER COLUMN wanted_categories TYPE public.item_category[] USING wanted_categories::public.item_category[];
ALTER TABLE public.items ALTER COLUMN wanted_categories SET DEFAULT '{}'::public.item_category[];