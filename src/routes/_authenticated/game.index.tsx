import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Gamepad2, Heart, X, Sparkles, Trophy } from "lucide-react";
import { categoryLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/game/")({
  component: GameStart,
  head: () => ({
    meta: [
      { title: "Game Mode — Lettuce Swap" },
      {
        name: "description",
        content: "Swipe through swap-ready items. Match with someone and start chatting instantly.",
      },
    ],
  }),
});

function GameStart() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: myItems, isLoading } = useQuery({
    queryKey: ["game-my-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,category,city,item_images(url)")
        .eq("owner_id", user!.id)
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <Gamepad2 className="h-3.5 w-3.5" /> Game Mode
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl mb-3">Swipe. Match. Swap.</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pick one of your items, then like or skip what others are offering. When you both like
            each other's items, a chat opens automatically.
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-primary" /> Like
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Skip
            </span>
            <Link
              to="/game/matches"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Trophy className="h-3.5 w-3.5" /> My matches
            </Link>
          </div>
        </div>

        {/* Pick item */}
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Choose your item to play with</h2>
          {myItems && (
            <span className="text-xs text-muted-foreground">{myItems.length} available</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !myItems || myItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              You need at least one available item to play.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/me/items/new">List your first item</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {myItems.map((it) => {
              const img = it.item_images?.[0]?.url;
              return (
                <button
                  key={it.id}
                  onClick={() => navigate({ to: "/game/play/$itemId", params: { itemId: it.id } })}
                  className="group text-left"
                >
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-border/60 bg-secondary shadow-sm group-hover:shadow-lg group-hover:border-primary/60 transition-all">
                    {img ? (
                      <img
                        src={img}
                        alt={it.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="text-white text-sm font-semibold truncate">{it.title}</div>
                      <div className="text-white/70 text-[10px] uppercase tracking-wider">
                        {categoryLabel(it.category)}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Play →
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
