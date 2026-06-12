import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLeavesBalance } from "@/hooks/use-leaves";
import { LEAF, LEAF_KIND_META, LEAVES_BONUS, formatLeaves } from "@/lib/leaves";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Check, Info, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leaves")({
  component: LeavesPage,
  head: () => ({
    meta: [{ title: "My Lettuce Leaves 🥬 — Lettuce Swap" }],
  }),
});

type LedgerRow = {
  id: string;
  delta: number;
  kind: keyof typeof LEAF_KIND_META;
  note: string;
  created_at: string;
  offer_id: string | null;
  counterparty: { id: string; display_name: string } | null;
};

function LeavesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { balance, isLoading: balanceLoading } = useLeavesBalance();

  const { data: me } = useQuery({
    queryKey: ["my-profile-leaves", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["leaves-ledger", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaves_ledger")
        .select(
          `id, delta, kind, note, created_at, offer_id,
          counterparty:profiles!leaves_ledger_counterparty_id_fkey(id, display_name)`,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as LedgerRow[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Balance hero */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 text-[9rem] opacity-10 rotate-12 select-none"
        >
          {LEAF}
        </span>
        <div className="relative space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl text-primary">My Lettuce Leaves</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Leaves are Lettuce Swap's own credits. Offer them for an item when you have nothing the
            other member wants — no more missed swaps.
          </p>
          <div className="pt-3 flex items-end gap-2">
            {balanceLoading ? (
              <Skeleton className="h-12 w-40" />
            ) : (
              <p className="text-5xl font-serif text-foreground" aria-label="Current balance">
                {balance.toLocaleString()} <span aria-hidden>{LEAF}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* How to earn */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-primary">Earn Leaves</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <EarnCard emoji="🤝" title={`Invite friends · +${LEAVES_BONUS.inviter} ${LEAF}`}>
            You earn {formatLeaves(LEAVES_BONUS.inviter)} for every member who joins with your
            invite code — and they start with {formatLeaves(LEAVES_BONUS.invitee)} extra.
            <InviteCodeRow code={me?.referral_code} />
          </EarnCard>
          <EarnCard emoji="🔁" title={`Complete swaps · +${LEAVES_BONUS.completedSwap} ${LEAF}`}>
            Every completed swap (items or Leaves, temporary or definitive) earns both members{" "}
            {formatLeaves(LEAVES_BONUS.completedSwap)} as a thank-you.
          </EarnCard>
          <EarnCard emoji="🏡" title="Build the community">
            Create or help manage a swap community — especially large, active ones — and the Lettuce
            Swap team rewards you with Leaves.
          </EarnCard>
          <EarnCard emoji="📣" title="Spread the word">
            Promote the app on social media or organise swap events that bring people together. Tell
            us about it and earn Leaves.
          </EarnCard>
        </div>
        {!me?.referred_by && <RedeemCard onRedeemed={() => queryClient.invalidateQueries()} />}
      </section>

      {/* Good to know */}
      <section
        className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 flex gap-3 text-sm text-muted-foreground"
        role="note"
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <p>
            Leaves have value <strong>only inside Lettuce Swap</strong>. You can't buy them with
            money for now (that may come in a later version) — and converting Leaves into money will{" "}
            <strong>never</strong> be possible.
          </p>
          <p>
            An item's owner never sets a price in Leaves: like with item offers, the <em>sender</em>{" "}
            decides what to offer and the owner simply accepts or declines.
          </p>
        </div>
      </section>

      {/* Ledger */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-primary">History</h2>
        {ledgerLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !ledger || ledger.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No Leaves activity yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {ledger.map((e) => {
              const meta = LEAF_KIND_META[e.kind] ?? { label: e.kind, emoji: LEAF };
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span aria-hidden className="text-xl">
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {meta.label}
                      {e.counterparty && (
                        <>
                          {" · "}
                          <Link
                            to="/profile/$userId"
                            params={{ userId: e.counterparty.id }}
                            className="hover:underline"
                          >
                            {e.counterparty.display_name}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.note || new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                  {e.offer_id && (
                    <Link
                      to="/chat/$offerId"
                      params={{ offerId: e.offer_id }}
                      aria-label="Open the related swap chat"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  )}
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      e.delta > 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {formatLeaves(e.delta, { signed: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EarnCard({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <p className="font-semibold flex items-center gap-2">
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
        {title}
      </p>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function InviteCodeRow({ code }: { code?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Invite code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — your code is " + code);
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="rounded-lg bg-muted px-3 py-1.5 text-sm font-mono tracking-widest">
        {code}
      </code>
      <Button size="sm" variant="outline" onClick={copy} aria-label="Copy invite code">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function RedeemCard({ onRedeemed }: { onRedeemed: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_referral_code", { p_code: trimmed });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Invite code redeemed — you now have ${formatLeaves(data ?? 0)}`);
    setCode("");
    onRedeemed();
  };
  return (
    <form
      onSubmit={redeem}
      className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:p-5 flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-48 space-y-1">
        <label htmlFor="redeem-code" className="text-sm font-medium">
          Got an invite code? <span aria-hidden>🌱</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Redeem it once and get {formatLeaves(LEAVES_BONUS.invitee)} extra.
        </p>
        <Input
          id="redeem-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 4f6a1b2c"
          maxLength={32}
          disabled={busy}
        />
      </div>
      <Button type="submit" disabled={busy || !code.trim()}>
        {busy ? "Redeeming…" : "Redeem"}
      </Button>
    </form>
  );
}
