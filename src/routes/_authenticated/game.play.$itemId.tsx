import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SwipeCard, DecisionButtons, type GameCandidate } from "@/components/game/swipe-card";
import { MatchModal } from "@/components/game/match-modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/game/play/$itemId")({
  component: GamePlay,
});

type MyItem = {
  id: string;
  title: string;
  owner_id: string;
  item_images: { url: string }[] | null;
};

function GamePlay() {
  const { itemId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{ offerId: string; theirItem: GameCandidate } | null>(null);

  // Active item (must belong to user)
  const {
    data: myItem,
    isLoading: myLoading,
    isError: myError,
  } = useQuery({
    queryKey: ["game-active-item", itemId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,owner_id,item_images(url)")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.owner_id !== user!.id) throw new Error("Not your item");
      return data as MyItem;
    },
  });

  // Queue of candidates
  const {
    data: queue,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ["game-queue", itemId, user?.id],
    enabled: !!user && !!myItem,
    queryFn: async () => {
      // Fetch ids already liked/skipped for this from_item
      const [likes, skips] = await Promise.all([
        supabase
          .from("item_likes")
          .select("to_item_id")
          .eq("liker_id", user!.id)
          .eq("from_item_id", itemId),
        supabase
          .from("item_skips")
          .select("to_item_id")
          .eq("skipper_id", user!.id)
          .eq("from_item_id", itemId),
      ]);
      const seen = new Set<string>([
        ...(likes.data ?? []).map((r) => r.to_item_id),
        ...(skips.data ?? []).map((r) => r.to_item_id),
      ]);

      const q = supabase
        .from("items")
        .select(
          "id,title,category,city,estimated_worth_cents,swap_type,item_images(url),owner:profiles!items_owner_id_fkey(display_name,verified)",
        )
        .eq("status", "available")
        .neq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(40);
      const { data, error } = await q;
      if (error) throw error;
      const candidates = (data ?? []).filter(
        (it) => !seen.has(it.id),
      ) as unknown as GameCandidate[];
      // light shuffle so it doesn't feel deterministic
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      return candidates;
    },
  });

  const [index, setIndex] = useState(0);
  const current = queue?.[index];
  const next = queue?.[index + 1];
  const upcoming = queue?.[index + 2];
  const remaining = useMemo(() => (queue ? Math.max(0, queue.length - index) : 0), [queue, index]);

  // Prefetch the next 2 candidate images so swipes feel instant
  useEffect(() => {
    [next, upcoming].forEach((c) => {
      const url = c?.item_images?.[0]?.url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [next, upcoming]);

  // Auto-reload queue when running low
  const reloadingRef = useRef(false);
  const queueLenRef = useRef(0);
  useEffect(() => {
    queueLenRef.current = queue?.length ?? 0;
  }, [queue]);
  useEffect(() => {
    if (!queue || reloadingRef.current) return;
    if (remaining > 0 && remaining <= 3) {
      reloadingRef.current = true;
      const prevLen = queueLenRef.current;
      refetchQueue().finally(() => {
        // If nothing new came in, don't loop
        setTimeout(() => {
          reloadingRef.current = false;
        }, 1500);
        if ((queueLenRef.current ?? 0) <= prevLen) {
          // no-op; user will hit empty state naturally
        }
      });
    }
  }, [remaining, queue]);

  // Reset index whenever a fresh queue arrives (after refetch)
  const queueRefId = useRef<unknown>(null);
  useEffect(() => {
    if (queue && queue !== queueRefId.current) {
      queueRefId.current = queue;
      setIndex(0);
    }
  }, [queue]);

  const decide = async (direction: "like" | "skip") => {
    if (!current || !user || busy) return;
    setBusy(true);
    const decided = current;
    setIndex((i) => i + 1);

    try {
      if (direction === "skip") {
        await supabase.from("item_skips").insert({
          skipper_id: user.id,
          from_item_id: itemId,
          to_item_id: decided.id,
        });
      } else {
        const { data, error } = await supabase.rpc("record_game_like", {
          p_from_item_id: itemId,
          p_to_item_id: decided.id,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.matched && row?.offer_id) {
          setMatch({ offerId: row.offer_id, theirItem: decided });
          qc.invalidateQueries({ queryKey: ["game-matches"] });
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      // Rollback index on error so user can retry
      setIndex((i) => Math.max(0, i - 1));
    } finally {
      setBusy(false);
    }
  };

  if (myError) {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center space-y-3">
        <p className="text-muted-foreground">This item isn't yours or doesn't exist.</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/game">Back to Game</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-md px-4 py-4 sm:py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2">
            <Link to="/game">
              <ArrowLeft className="h-4 w-4" /> Exit
            </Link>
          </Button>
          <div className="text-xs text-muted-foreground truncate max-w-[55%] text-center">
            Playing with{" "}
            <span className="font-semibold text-foreground">{myItem?.title ?? "…"}</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full -mr-2">
            <Link to="/game/matches">
              <Trophy className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Card area */}
        <div className="relative aspect-[3/4] mb-6">
          {myLoading || queueLoading ? (
            <div className="absolute inset-0 rounded-3xl bg-muted animate-pulse" />
          ) : !current ? (
            <div className="absolute inset-0 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <p className="font-serif text-xl">You've seen everyone!</p>
              <p className="text-sm text-muted-foreground">Check back later for new items.</p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setIndex(0);
                    refetchQueue();
                  }}
                >
                  Refresh
                </Button>
                <Button asChild className="rounded-full">
                  <Link to="/game">Pick another item</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {next && (
                <SwipeCard
                  key={next.id}
                  item={next}
                  isTop={false}
                  offset={1}
                  onDecision={() => {}}
                />
              )}
              <SwipeCard key={current.id} item={current} isTop offset={0} onDecision={decide} />
            </>
          )}
        </div>

        {/* Controls */}
        {current && (
          <>
            <DecisionButtons
              onSkip={() => decide("skip")}
              onLike={() => decide("like")}
              disabled={busy}
            />
            <p className="text-center text-[11px] text-muted-foreground mt-4">
              {remaining} item{remaining === 1 ? "" : "s"} left · swipe or tap
            </p>
          </>
        )}
      </div>

      <MatchModal
        open={!!match}
        onOpenChange={(o) => {
          if (!o) setMatch(null);
        }}
        myItem={myItem ?? null}
        theirItem={match?.theirItem ?? null}
        offerId={match?.offerId ?? null}
      />
    </div>
  );
}
