import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SwapModeBadge, DueBadge } from "@/components/swap-badges";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  Clock,
  SlidersHorizontal,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/offers")({
  component: OffersList,
});

type OfferRow = {
  id: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string | null;
  swap_type: string;
  return_by: string | null;
  from_user_id: string;
  to_user_id: string;
  requested: { id: string; title: string } | null;
  offered: { id: string; title: string } | null;
  from_user: { id: string; display_name: string; verified: boolean | null } | null;
  to_user: { id: string; display_name: string; verified: boolean | null } | null;
};

function VerifiedBadge({ name }: { name?: string | null }) {
  return (
    <span
      className="inline-block ml-1 text-base align-middle"
      title={`Verified member${name ? `: ${name}` : ""}`}
      aria-label={`${name ?? "User"} is a verified member`}
    >
      <span aria-hidden>🌳</span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 ring-amber-500/30",
  accepted: "bg-primary/15 text-primary ring-primary/30",
  completed: "bg-primary text-primary-foreground ring-primary/40",
  declined: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-muted text-muted-foreground ring-border",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground ring-border";
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 ${cls}`}
    >
      {status}
    </span>
  );
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function OffersList() {
  const { user } = useAuth();
  const { data, refetch } = useQuery({
    queryKey: ["my-offers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          `id, status, message, created_at, updated_at, swap_type, return_by, from_user_id, to_user_id,
          requested:items!offers_requested_item_id_fkey(id, title),
          offered:items!offers_offered_item_id_fkey(id, title),
          from_user:profiles!offers_from_user_id_fkey(id, display_name, verified),
          to_user:profiles!offers_to_user_id_fkey(id, display_name, verified)`,
        )
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const update = async (
    id: string,
    status: "accepted" | "declined" | "cancelled" | "completed",
  ) => {
    const { error } = await supabase
      .from("offers")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      refetch();
    }
  };

  type Direction = "all" | "incoming" | "outgoing";
  type StatusFilter = "all" | "pending" | "accepted" | "completed" | "declined" | "cancelled";
  type Sort = "updated_desc" | "updated_asc" | "created_desc" | "created_asc";

  const [direction, setDirection] = useState<Direction>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("updated_desc");

  const incoming = data?.filter((o) => o.to_user_id === user?.id) ?? [];
  const outgoing = data?.filter((o) => o.from_user_id === user?.id) ?? [];

  const filtered = useMemo(() => {
    let arr = data ?? [];
    if (direction === "incoming") arr = arr.filter((o) => o.to_user_id === user?.id);
    if (direction === "outgoing") arr = arr.filter((o) => o.from_user_id === user?.id);
    if (statusFilter !== "all") arr = arr.filter((o) => o.status === statusFilter);
    const ts = (o: OfferRow, key: "updated_at" | "created_at") =>
      new Date(o[key] ?? o.created_at).getTime();
    const sorted = [...arr].sort((a, b) => {
      switch (sort) {
        case "updated_desc":
          return ts(b, "updated_at") - ts(a, "updated_at");
        case "updated_asc":
          return ts(a, "updated_at") - ts(b, "updated_at");
        case "created_desc":
          return ts(b, "created_at") - ts(a, "created_at");
        case "created_asc":
          return ts(a, "created_at") - ts(b, "created_at");
      }
    });
    return sorted;
  }, [data, direction, statusFilter, sort, user?.id]);

  const filtersActive = direction !== "all" || statusFilter !== "all" || sort !== "updated_desc";
  const resetFilters = () => {
    setDirection("all");
    setStatusFilter("all");
    setSort("updated_desc");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-primary">Offers &amp; chat</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track every swap you're talking about — both ways.
            </p>
          </div>
          <div className="flex gap-3">
            <StatPill label="Incoming" value={incoming.length} icon={ArrowDownLeft} />
            <StatPill label="Sent" value={outgoing.length} icon={ArrowUpRight} />
          </div>
        </div>
      </header>

      {/* Filters & sort */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filter &amp; sort</span>
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Direction tabs */}
        <div
          role="tablist"
          aria-label="Offer direction"
          className="inline-flex p-1 rounded-full bg-muted/60 ring-1 ring-border"
        >
          {[
            { v: "all" as const, label: "All", count: data?.length ?? 0 },
            { v: "incoming" as const, label: "Incoming", count: incoming.length },
            { v: "outgoing" as const, label: "Outgoing", count: outgoing.length },
          ].map((t) => (
            <button
              key={t.v}
              role="tab"
              aria-selected={direction === t.v}
              onClick={() => setDirection(t.v)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                direction === t.v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <span className="opacity-70 tabular-nums">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Status chips + sort dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              ["all", "pending", "accepted", "completed", "declined", "cancelled"] as StatusFilter[]
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 transition ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-muted/40 text-muted-foreground ring-border hover:ring-primary/40 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="bg-background border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="updated_desc">Last updated · newest</option>
              <option value="updated_asc">Last updated · oldest</option>
              <option value="created_desc">Created · newest</option>
              <option value="created_asc">Created · oldest</option>
            </select>
          </label>
        </div>
      </div>

      {/* Unified results list */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 px-1">
          <h2 className="font-serif text-2xl text-primary leading-tight">
            {direction === "incoming"
              ? "Incoming"
              : direction === "outgoing"
                ? "Sent"
                : "All offers"}
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filtered.length} shown
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {data && data.length > 0
              ? "No offers match these filters."
              : "No offers yet — start a swap from any item page."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((o) => {
              const isIncoming = o.to_user_id === user?.id;
              return (
                <OfferCard
                  key={o.id}
                  direction={isIncoming ? "incoming" : "outgoing"}
                  status={o.status}
                  swapType={o.swap_type}
                  returnBy={o.return_by}
                  updatedAt={o.updated_at ?? o.created_at}
                  counterpartyId={(isIncoming ? o.from_user : o.to_user)?.id}
                  counterpartyName={
                    (isIncoming ? o.from_user : o.to_user)?.display_name ?? "Someone"
                  }
                  counterpartyVerified={!!(isIncoming ? o.from_user : o.to_user)?.verified}
                  yourItem={(isIncoming ? o.requested : o.offered)?.title}
                  theirItem={(isIncoming ? o.offered : o.requested)?.title}
                  message={o.message}
                  actions={
                    <>
                      {isIncoming && o.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => update(o.id, "accepted")}>
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => update(o.id, "declined")}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {!isIncoming && o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => update(o.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      )}
                      {(o.status === "accepted" || o.status === "completed") && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/chat/$offerId" params={{ offerId: o.id }}>
                            <MessageCircle className="h-4 w-4 mr-1.5" /> Open chat
                          </Link>
                        </Button>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3.5 py-1.5">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-primary tabular-nums">{value}</span>
    </div>
  );
}

function OfferCard({
  direction,
  status,
  swapType,
  returnBy,
  updatedAt,
  counterpartyId,
  counterpartyName,
  counterpartyVerified,
  yourItem,
  theirItem,
  message,
  actions,
}: {
  direction: "incoming" | "outgoing";
  status: string;
  swapType: string;
  returnBy: string | null;
  updatedAt: string;
  counterpartyId?: string;
  counterpartyName: string;
  counterpartyVerified: boolean;
  yourItem?: string;
  theirItem?: string;
  message?: string;
  actions: React.ReactNode;
}) {
  const Arrow = direction === "incoming" ? ArrowDownLeft : ArrowUpRight;
  const initial = counterpartyName[0]?.toUpperCase() ?? "?";
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:border-primary/40 hover:shadow-lg">
      <span
        aria-hidden
        className={`absolute left-0 top-0 h-full w-1 ${direction === "incoming" ? "bg-primary" : "bg-primary/40"}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-serif text-lg shrink-0 shadow-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium truncate">
              <Arrow className="h-3.5 w-3.5 text-primary shrink-0" />
              {counterpartyId ? (
                <Link
                  to="/profile/$userId"
                  params={{ userId: counterpartyId }}
                  className="hover:underline truncate"
                >
                  {counterpartyName}
                </Link>
              ) : (
                <span className="truncate">{counterpartyName}</span>
              )}
              {counterpartyVerified && <VerifiedBadge name={counterpartyName} />}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> {relativeTime(updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={status} />
          <SwapModeBadge swapType={swapType} />
          {swapType === "temporary" && status === "accepted" && <DueBadge returnBy={returnBy} />}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-xl bg-muted/40 ring-1 ring-border px-3 py-2.5 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {direction === "incoming" ? "They offer" : "You offer"}
          </p>
          <p className="text-sm font-medium truncate">
            {(direction === "incoming" ? theirItem : yourItem) || "—"}
          </p>
        </div>
        <span className="text-primary text-lg" aria-hidden>
          ⇄
        </span>
        <div className="rounded-xl bg-primary/10 ring-1 ring-primary/20 px-3 py-2.5 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary/80">
            {direction === "incoming" ? "For your" : "For their"}
          </p>
          <p className="text-sm font-medium truncate">
            {(direction === "incoming" ? yourItem : theirItem) || "—"}
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          "{message}"
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">{actions}</div>
    </article>
  );
}
