import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryIcon, formatWorth } from "@/lib/constants";
import { GAME_MODE_ENABLED } from "@/lib/features";
import { SwapModeFields } from "@/components/swap-mode-fields";
import {
  OfferKindToggle,
  LeavesAmountField,
  leavesAmountError,
  type OfferKind,
} from "@/components/leaves-offer-fields";
import { useLeavesBalance } from "@/hooks/use-leaves";
import type { SwapType } from "@/lib/swap";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Repeat, Clock } from "lucide-react";

export const Route = createFileRoute("/items/$id")({
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(
          "*, item_images(url, sort_order), profiles!items_owner_id_fkey(id, display_name, city, avatar_url)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-12">Loading…</div>;
  if (!item) return <div className="mx-auto max-w-5xl px-4 py-12">Not found.</div>;

  const owner = (item.profiles as { id: string; display_name: string; city: string }) || null;
  const isOwner = user?.id === item.owner_id;
  const images = (item.item_images || [])
    .slice()
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid md:grid-cols-2 gap-10">
      <div className="space-y-3">
        <div className="aspect-square rounded-2xl bg-muted overflow-hidden">
          {images[0] ? (
            <img src={images[0].url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1).map((img: { url: string }, i: number) => (
              <img key={i} src={img.url} className="aspect-square object-cover rounded-lg" alt="" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          {(() => {
            const CatIcon = categoryIcon(item.category);
            return (
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-primary">
                <CatIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {categoryLabel(item.category)}
              </div>
            );
          })()}
          <h1 className="font-serif text-4xl mt-1">{item.title}</h1>
          <p className="text-2xl mt-2">{formatWorth(item.estimated_worth_cents)}</p>
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {item.description || "No description."}
        </p>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary">
            {item.swap_type === "temporary" ? (
              <Clock className="h-3 w-3" />
            ) : (
              <Repeat className="h-3 w-3" />
            )}
            {item.swap_type === "temporary" ? "Temporary loan" : "Definitive swap"}
          </span>
          {item.city && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary">
              <MapPin className="h-3 w-3" /> {item.city}
            </span>
          )}
        </div>

        {item.wanted_categories?.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Looking to trade for</div>
            <div className="flex flex-wrap gap-2">
              {item.wanted_categories.map((c: string) => {
                const CatIcon = categoryIcon(c);
                return (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-border"
                  >
                    <CatIcon className="h-3 w-3 text-primary" strokeWidth={1.75} />
                    {categoryLabel(c)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {owner && (
          <Link
            to="/profile/$userId"
            params={{ userId: owner.id }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              {owner.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="font-medium">{owner.display_name}</div>
              <div className="text-xs text-muted-foreground">{owner.city}</div>
            </div>
          </Link>
        )}

        {isOwner ? (
          <Button asChild variant="outline">
            <Link to="/me/items/$id/edit" params={{ id: item.id }}>
              Edit item
            </Link>
          </Button>
        ) : user ? (
          <div className="flex flex-wrap gap-2">
            <OfferDialog
              itemId={item.id}
              ownerId={item.owner_id}
              requestedSwapType={item.swap_type === "temporary" ? "temporary" : "definitive"}
            />
            {GAME_MODE_ENABLED && (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/game">🎮 Play in Game Mode</Link>
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={() => nav({ to: "/login" })}>Sign in to make an offer</Button>
        )}
      </div>
    </div>
  );
}

function OfferDialog({
  itemId,
  ownerId,
  requestedSwapType,
}: {
  itemId: string;
  ownerId: string;
  requestedSwapType: SwapType;
}) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OfferKind>("item");
  const [offered, setOffered] = useState<string>("");
  const [leaves, setLeaves] = useState("");
  const [message, setMessage] = useState("");
  const [swapType, setSwapType] = useState<SwapType>(requestedSwapType);
  const [returnBy, setReturnBy] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { balance } = useLeavesBalance();

  const { data: myItems } = useQuery({
    queryKey: ["my-available", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title")
        .eq("owner_id", user!.id)
        .eq("status", "available");
      if (error) throw error;
      return data ?? [];
    },
  });

  const leavesErr = touched && kind === "leaves" ? leavesAmountError(leaves, balance) : "";
  const returnErr =
    touched && swapType === "temporary" && !returnBy ? "Pick a return date for the loan." : "";

  const submit = async () => {
    setTouched(true);
    if (kind === "item" && !offered) {
      toast.error("Pick one of your items to offer.");
      return;
    }
    if (kind === "leaves" && leavesAmountError(leaves, balance)) return;
    if (swapType === "temporary" && !returnBy) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("offers")
      .insert({
        from_user_id: user!.id,
        to_user_id: ownerId,
        requested_item_id: itemId,
        offered_item_id: kind === "item" ? offered : null,
        leaves_amount: kind === "leaves" ? Number(leaves) : null,
        message,
        swap_type: swapType,
        return_by: swapType === "temporary" ? returnBy : null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Offer sent!");
    setOpen(false);
    nav({ to: "/chat/$offerId", params: { offerId: data.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Make a swap offer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer one of your items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <OfferKindToggle kind={kind} onKindChange={setKind} disabled={submitting} />
          {kind === "leaves" ? (
            <LeavesAmountField
              amount={leaves}
              onAmountChange={setLeaves}
              balance={balance}
              error={leavesErr}
              disabled={submitting}
            />
          ) : !myItems || myItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                You have no available items to offer — list one, or offer Lettuce Leaves 🥬 instead.
              </p>
              <Button asChild size="sm" variant="outline" onClick={() => setOpen(false)}>
                <Link to="/me/items/new">List an item</Link>
              </Button>
            </div>
          ) : (
            <Select value={offered} onValueChange={setOffered}>
              <SelectTrigger>
                <SelectValue placeholder="Choose item to offer" />
              </SelectTrigger>
              <SelectContent>
                {myItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <SwapModeFields
            swapType={swapType}
            onSwapTypeChange={setSwapType}
            returnBy={returnBy}
            onReturnByChange={setReturnBy}
            error={returnErr}
            disabled={submitting}
          />
          <Textarea
            placeholder="Optional message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
          <DialogFooter>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : "Send offer"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
