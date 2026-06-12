import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LEAF, formatLeaves } from "@/lib/leaves";

export type OfferKind = "item" | "leaves";

/**
 * Toggle between offering one of your items (classic swap) and offering
 * Lettuce Leaves. Owners never price their items — the sender freely chooses
 * the amount of Leaves to offer.
 */
export function OfferKindToggle({
  kind,
  onKindChange,
  disabled,
}: {
  kind: OfferKind;
  onKindChange: (k: OfferKind) => void;
  disabled?: boolean;
}) {
  const options: { value: OfferKind; title: string; subtitle: string; emoji: string }[] = [
    {
      value: "item",
      title: "One of my items",
      subtitle: "Classic item-for-item swap",
      emoji: "🎁",
    },
    { value: "leaves", title: "Lettuce Leaves", subtitle: "Pay with app credits", emoji: LEAF },
  ];
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        What do you offer?
      </span>
      <div role="radiogroup" aria-label="What do you offer?" className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={kind === o.value}
            disabled={disabled}
            onClick={() => onKindChange(o.value)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition",
              kind === o.value
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-input hover:border-primary/40",
            )}
          >
            <span className="text-sm font-medium">
              <span aria-hidden className="mr-1">
                {o.emoji}
              </span>
              {o.title}
            </span>
            <span className="text-[11px] text-muted-foreground">{o.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Amount field for a Leaves offer, with the sender's balance as the cap. */
export function LeavesAmountField({
  amount,
  onAmountChange,
  balance,
  error,
  disabled,
}: {
  amount: string;
  onAmountChange: (v: string) => void;
  balance: number;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="leaves-amount" className="text-xs text-muted-foreground">
          Leaves to offer
        </Label>
        <Link
          to="/me/leaves"
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          You have {formatLeaves(balance)}
        </Link>
      </div>
      <div className="relative">
        <Input
          id="leaves-amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={balance}
          step={1}
          placeholder="e.g. 100"
          value={amount}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(e) => onAmountChange(e.target.value)}
          className={cn("pr-9", error ? "border-destructive" : "")}
        />
        <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
          {LEAF}
        </span>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          The Leaves move to the other member when they accept your offer.
        </p>
      )}
    </div>
  );
}

/** Validates a leaves amount string; returns an error message or "". */
export function leavesAmountError(amount: string, balance: number): string {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n)) return "Enter how many Leaves to offer.";
  if (!Number.isInteger(n) || n < 1) return "Leaves are whole numbers (at least 1).";
  if (n > balance) return `You only have ${formatLeaves(balance)}.`;
  return "";
}
