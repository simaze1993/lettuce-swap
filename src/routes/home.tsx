import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoBackdrop } from "@/components/logo-backdrop";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ItemCard, type ItemCardData } from "@/components/item-card";
import { CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Home as HomeIcon,
  Shirt,
  Sparkles,
  Smartphone,
  PawPrint,
  Baby,
  Bike,
  Palette,
  Music,
  BookOpen,
  Box,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/home")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Lettuce Swap — Swapping is the New Shopping" },
      {
        name: "description",
        content:
          "Discover items to swap near you: clothes, art, plants, vinyls, instruments and more.",
      },
    ],
  }),
});

const CATEGORY_ICONS: Record<string, typeof Shirt> = {
  house_garden: HomeIcon,
  clothing: Shirt,
  beauty: Sparkles,
  electronics: Smartphone,
  animals: PawPrint,
  children: Baby,
  activities: Bike,
  art_design: Palette,
  music_movies: Music,
  books: BookOpen,
};

function useItems(filter: { city?: string; category?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["items", filter],
    queryFn: async () => {
      let q = supabase
        .from("items")
        .select(
          "id,title,category,estimated_worth_cents,city,swap_type,item_images(url),owner:profiles!items_owner_id_fkey(verified,display_name)",
        )
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(filter.limit ?? 8);
      if (filter.city) q = q.ilike("city", filter.city);
      if (filter.category) q = q.eq("category", filter.category as never);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ItemCardData[];
    },
  });
}

function useMyCity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-city", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.city ?? "";
    },
  });
}

function Rail({
  title,
  subtitle,
  items,
  loading,
  viewAllCategory,
}: {
  title: string;
  subtitle: string;
  items?: ItemCardData[];
  loading: boolean;
  viewAllCategory?: string;
}) {
  if (!loading && (!items || items.length === 0)) return null;
  return (
    <section>
      <div className="flex justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="font-serif text-3xl text-foreground mb-1">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          to="/browse"
          search={viewAllCategory ? { category: viewAllCategory } : {}}
          className="text-sm font-semibold text-primary hover:underline whitespace-nowrap flex items-center gap-1"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
            ))
          : items!.slice(0, 6).map((it) => <ItemCard key={it.id} item={it} />)}
      </div>
    </section>
  );
}

function Home() {
  const { user } = useAuth();
  const { data: myCity } = useMyCity();
  const near = useItems({ city: myCity || undefined, limit: 6 });
  const latest = useItems({ limit: 12 });
  const plants = useItems({ category: "plants", limit: 6 });
  const art = useItems({ category: "art", limit: 6 });
  const clothing = useItems({ category: "clothing", limit: 6 });

  const swapHighlights = [
    { value: "clothing", label: "Clothes" },
    { value: "house_garden", label: "Plants" },
    { value: "art_design", label: "Art" },
    { value: "music_movies", label: "Vinyls" },
    { value: "books", label: "Books" },
  ];

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative py-16 md:py-24 px-6">
        <div className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] dark:opacity-[0.18]">
          <LogoBackdrop variant="hero" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-[1.05] tracking-tight">
            Need a Change?
            <span className="block mt-2">
              <span className="text-primary">Swap</span> the old. Feel the new.
            </span>
            <span className="block mt-2">Sustainably. For free.</span>
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8 h-12 text-base">
              <Link to={user ? "/me/items/new" : "/signup"}>
                {user ? "List an item" : "Start swapping"}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-12 text-base"
            >
              <Link to="/browse" search={myCity ? { city: myCity } : {}}>
                {myCity ? `Browse nearby in ${myCity}` : "Browse nearby items"}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="rounded-full px-8 h-12 text-base">
              <Link to="/about">What is Lettuce Swap?</Link>
            </Button>
          </div>

          {/* What can you swap? */}
          <div className="mt-10">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
              What can you swap?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {swapHighlights.map((c) => (
                <Link
                  key={c.value}
                  to="/browse"
                  search={{ category: c.value }}
                  className="px-4 h-9 inline-flex items-center rounded-full border border-border bg-background/80 backdrop-blur-sm text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Circular categories */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex justify-between items-start gap-6 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.value] ?? Box;
            return (
              <Link
                key={c.value}
                to="/browse"
                search={{ category: c.value }}
                className="flex flex-col items-center gap-3 cursor-pointer group min-w-fit category-link"
              >
                <div className="cat-circle">
                  <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
                <span className="cat-label">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Rails */}
      <div className="max-w-7xl mx-auto px-6 space-y-16 pb-24">
        {user && myCity && (
          <Rail
            title={`Near you in ${myCity}`}
            subtitle="Items waiting for a swap in your neighbourhood"
            items={near.data}
            loading={near.isLoading}
          />
        )}
        <Rail
          title="Just listed"
          subtitle="Fresh arrivals from the community"
          items={latest.data}
          loading={latest.isLoading}
        />
        <Rail
          title="Plants"
          subtitle="Green up your space through trading"
          items={plants.data}
          loading={plants.isLoading}
          viewAllCategory="plants"
        />
        <Rail
          title="Art"
          subtitle="One-of-a-kind pieces from local makers"
          items={art.data}
          loading={art.isLoading}
          viewAllCategory="art"
        />
        <Rail
          title="Clothing"
          subtitle="Refresh your wardrobe, not the planet"
          items={clothing.data}
          loading={clothing.isLoading}
          viewAllCategory="clothing"
        />
      </div>
    </div>
  );
}
