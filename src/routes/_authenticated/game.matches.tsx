import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Trophy, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/game/matches")({
  component: GameMatches,
  head: () => ({
    meta: [{ title: "My Matches — Lettuce Swap" }],
  }),
});

type StatusKey = "accepted" | "completed" | "cancelled" | "declined" | "pending";

const STATUS_META: Record<
  StatusKey,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-primary/15 text-primary border-primary/30",
  },
  accepted: {
    label: "Active",
    icon: Clock,
    className: "bg-accent/20 text-accent-foreground border-accent/40",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

function GameMatches() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["game-matches-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          `
          id, status, updated_at, created_at, message,
          from_user_id, to_user_id,
          offered_item:items!offers_offered_item_id_fkey(id,title,item_images(url)),
          requested_item:items!offers_requested_item_id_fkey(id,title,item_images(url)),
          from_profile:profiles!offers_from_user_id_fkey(display_name),
          to_profile:profiles!offers_to_user_id_fkey(display_name)
        `,
        )
        .like("message", "%Game Mode%")
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = (data ?? []).filter((m) => m.status === "accepted");
  const past = (data ?? []).filter((m) => m.status !== "accepted");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2">
            <Link to="/game">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
            <Trophy className="h-3 w-3" /> Game Matches
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl">Your matches</h1>
          <p className="text-sm text-muted-foreground mt-1">Active swaps and your match history.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No matches yet. Keep playing!</p>
            <Button asChild className="rounded-full">
              <Link to="/game">Play Game Mode</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Active ({active.length})
                </h2>
                <div className="space-y-3">
                  {active.map((m) => (
                    <MatchRow key={m.id} match={m} userId={user!.id} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Past matches ({past.length})
                </h2>
                <div className="space-y-3">
                  {past.map((m) => (
                    <MatchRow key={m.id} match={m} userId={user!.id} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type MatchItem = { id: string; title: string; item_images: { url: string }[] } | null;

type Match = {
  id: string;
  status: string;
  updated_at: string;
  from_user_id: string;
  offered_item: MatchItem;
  requested_item: MatchItem;
  from_profile: { display_name: string | null } | null;
  to_profile: { display_name: string | null } | null;
};

function MatchRow({ match: m, userId }: { match: Match; userId: string }) {
  const isFrom = m.from_user_id === userId;
  const myItem = isFrom ? m.offered_item : m.requested_item;
  const theirItem = isFrom ? m.requested_item : m.offered_item;
  const theirName =
    (isFrom ? m.to_profile?.display_name : m.from_profile?.display_name) || "Someone";
  const statusKey = (m.status as StatusKey) in STATUS_META ? (m.status as StatusKey) : "accepted";
  const meta = STATUS_META[statusKey];
  const Icon = meta.icon;
  const isClickable = m.status === "accepted" || m.status === "completed";

  const content = (
    <div className="rounded-2xl border border-border bg-card p-4 hover:border-primary/60 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <Thumb url={myItem?.item_images?.[0]?.url} />
        <span className="text-xl text-muted-foreground">↔</span>
        <Thumb url={theirItem?.item_images?.[0]?.url} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {myItem?.title} ↔ {theirItem?.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">with {theirName}</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`gap-1 ${meta.className}`}>
              <Icon className="h-3 w-3" /> {meta.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {m.status === "completed" ? "Completed" : "Matched"}{" "}
              {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        {isClickable && <MessageCircle className="h-5 w-5 text-primary shrink-0" />}
      </div>
    </div>
  );

  return isClickable ? (
    <Link to="/chat/$offerId" params={{ offerId: m.id }} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}

function Thumb({ url }: { url?: string | null }) {
  return (
    <div className="h-14 w-14 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
    </div>
  );
}
