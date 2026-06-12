import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { SwapModeFields } from "@/components/swap-mode-fields";
import {
  OfferKindToggle,
  LeavesAmountField,
  leavesAmountError,
  type OfferKind,
} from "@/components/leaves-offer-fields";
import { useLeavesBalance } from "@/hooks/use-leaves";
import type { SwapType } from "@/lib/swap";

export function StartSwapDialog({
  otherUserId,
  otherUserName,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  otherUserId: string;
  otherUserName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [kind, setKind] = useState<OfferKind>("item");
  const [mine, setMine] = useState("");
  const [theirs, setTheirs] = useState("");
  const [leaves, setLeaves] = useState("");
  const [message, setMessage] = useState("");
  const [swapType, setSwapType] = useState<SwapType>("definitive");
  const [returnBy, setReturnBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const { balance } = useLeavesBalance();

  const { data: myItems, isLoading: loadingMine } = useQuery({
    queryKey: ["my-available", user?.id, open],
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

  const { data: theirItems, isLoading: loadingTheirs } = useQuery({
    queryKey: ["their-available", otherUserId, open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title")
        .eq("owner_id", otherUserId)
        .eq("status", "available");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mineErr = touched && kind === "item" && !mine ? "Pick one of your items to offer." : "";
  const theirsErr =
    touched && !theirs ? `Pick an item from ${otherUserName ?? "this member"}.` : "";
  const leavesErr = touched && kind === "leaves" ? leavesAmountError(leaves, balance) : "";
  const returnErr =
    touched && swapType === "temporary" && !returnBy ? "Pick a return date for the loan." : "";

  const submit = async () => {
    setTouched(true);
    if (!theirs) return;
    if (kind === "item" && !mine) return;
    if (kind === "leaves" && leavesAmountError(leaves, balance)) return;
    if (swapType === "temporary" && !returnBy) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("offers")
      .insert({
        from_user_id: user!.id,
        to_user_id: otherUserId,
        offered_item_id: kind === "item" ? mine : null,
        leaves_amount: kind === "leaves" ? Number(leaves) : null,
        requested_item_id: theirs,
        message,
        swap_type: swapType,
        return_by: swapType === "temporary" ? returnBy : null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Offer sent!");
    setOpen(false);
    nav({ to: "/chat/$offerId", params: { offerId: data.id } });
  };

  const loading = loadingMine || loadingTheirs;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>{trigger ?? <Button size="sm">Start swap</Button>}</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a swap{otherUserName ? ` with ${otherUserName}` : ""}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-2" aria-busy="true">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !theirItems || theirItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {otherUserName ?? "This member"} has no items available right now.
          </p>
        ) : (
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
                  You have no available items to offer — list one, or offer Lettuce Leaves 🥬
                  instead.
                </p>
                <Button asChild size="sm" variant="outline" onClick={() => setOpen(false)}>
                  <Link to="/me/items/new">List an item</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your item to offer
                </label>
                <Select
                  value={mine}
                  onValueChange={(v) => {
                    setMine(v);
                  }}
                >
                  <SelectTrigger
                    className={mineErr ? "border-destructive focus:ring-destructive" : ""}
                    aria-invalid={!!mineErr}
                  >
                    <SelectValue placeholder="Choose one of your items" />
                  </SelectTrigger>
                  <SelectContent>
                    {myItems.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mineErr && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {mineErr}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Item you want from {otherUserName ?? "them"}
              </label>
              <Select
                value={theirs}
                onValueChange={(v) => {
                  setTheirs(v);
                }}
              >
                <SelectTrigger
                  className={theirsErr ? "border-destructive focus:ring-destructive" : ""}
                  aria-invalid={!!theirsErr}
                >
                  <SelectValue placeholder="Choose what you'd like" />
                </SelectTrigger>
                <SelectContent>
                  {theirItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {theirsErr && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {theirsErr}
                </p>
              )}
            </div>
            <SwapModeFields
              swapType={swapType}
              onSwapTypeChange={setSwapType}
              returnBy={returnBy}
              onReturnByChange={setReturnBy}
              error={returnErr}
              disabled={submitting}
            />
            <Textarea
              placeholder="Add a short message (optional)…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              disabled={submitting}
            />
            <DialogFooter>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending offer…
                  </>
                ) : (
                  "Send offer"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
