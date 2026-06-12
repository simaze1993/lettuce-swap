import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemCardData } from "@/components/item-card";
import { CATEGORIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, MapPin, X } from "lucide-react";

type Search = { category?: string; city?: string; q?: string };

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    category: typeof s.category === "string" ? s.category : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: Browse,
  head: () => ({
    meta: [
      { title: "Browse swaps — Lettuce Swap" },
      {
        name: "description",
        content: "Browse swap-ready items near you: clothes, books, plants, electronics and more.",
      },
    ],
  }),
});

function Browse() {
  const sp = Route.useSearch();
  const nav = Route.useNavigate();
  const [city, setCity] = useState(sp.city ?? "");
  const [q, setQ] = useState(sp.q ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["browse", sp],
    queryFn: async () => {
      let qq = supabase
        .from("items")
        .select(
          "id,title,category,estimated_worth_cents,city,swap_type,item_images(url),owner:profiles!items_owner_id_fkey(verified,display_name)",
        )
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(60);
      if (sp.category) qq = qq.eq("category", sp.category as never);
      if (sp.city) qq = qq.ilike("city", `%${sp.city}%`);
      if (sp.q) qq = qq.ilike("title", `%${sp.q}%`);
      const { data, error } = await qq;
      if (error) throw error;
      return (data ?? []) as unknown as ItemCardData[];
    },
  });

  const activeFilters = [
    sp.category && {
      label: CATEGORIES.find((c) => c.value === sp.category)?.label ?? sp.category,
      clear: { ...sp, category: undefined },
    },
    sp.city && { label: `Near ${sp.city}`, clear: { ...sp, city: undefined } },
    sp.q && { label: `“${sp.q}”`, clear: { ...sp, q: undefined } },
  ].filter(Boolean) as { label: string; clear: Search }[];

  return (
    <div className="bg-background min-h-screen">
      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 space-y-3">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              nav({ search: { ...sp, city: city || undefined, q: q || undefined } });
            }}
          >
            <div className="relative flex-1 min-w-[12rem]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search swap-ready items…"
                className="pl-9 rounded-full"
              />
            </div>
            <div className="relative w-full sm:w-56">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="pl-9 rounded-full"
              />
            </div>
            <Button type="submit" className="rounded-full px-6">
              Apply
            </Button>
          </form>

          {/* Category chips */}
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Link
              to="/browse"
              search={{ ...sp, category: undefined }}
              data-active={!sp.category}
              className="filter-chip"
            >
              All
            </Link>
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = sp.category === c.value;
              return (
                <Link
                  key={c.value}
                  to="/browse"
                  search={{ ...sp, category: c.value }}
                  data-active={active}
                  className="filter-chip"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {c.label}
                </Link>
              );
            })}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Active:</span>
              {activeFilters.map((f, i) => (
                <Link
                  key={i}
                  to="/browse"
                  search={f.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-accent-foreground hover:bg-accent/80 transition-colors"
                >
                  {f.label} <X className="h-3 w-3" />
                </Link>
              ))}
              <Link
                to="/browse"
                search={{}}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Clear all
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex items-baseline justify-between mb-6 gap-3 flex-wrap">
          <h1 className="font-serif text-3xl sm:text-4xl">
            {sp.category ? CATEGORIES.find((c) => c.value === sp.category)?.label : "Browse swaps"}
          </h1>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.length} item{data.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {data.map((it) => (
              <ItemCard key={it.id} item={it} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <p className="text-muted-foreground">No items match these filters.</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/browse" search={{}}>
                Reset filters
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
