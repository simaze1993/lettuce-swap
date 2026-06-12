import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { swapTypeLabel, type SwapType } from "@/lib/swap";

/**
 * Shared form fields for choosing the swap mode on a new offer:
 * a definitive/temporary toggle and, for temporary loans, a "return by" date.
 */
export function SwapModeFields({
  swapType,
  onSwapTypeChange,
  returnBy,
  onReturnByChange,
  error,
  disabled,
}: {
  swapType: SwapType;
  onSwapTypeChange: (t: SwapType) => void;
  returnBy: string;
  onReturnByChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const subtitle: Record<SwapType, string> = {
    definitive: "Keep it for good",
    temporary: "Borrow & give back",
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Swap type
      </span>
      <div role="radiogroup" aria-label="Swap type" className="grid grid-cols-2 gap-2">
        {(["definitive", "temporary"] as SwapType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={swapType === t}
            disabled={disabled}
            onClick={() => onSwapTypeChange(t)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition",
              swapType === t
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-input hover:border-primary/40",
            )}
          >
            <span className="text-sm font-medium">{swapTypeLabel(t)}</span>
            <span className="text-[11px] text-muted-foreground">{subtitle[t]}</span>
          </button>
        ))}
      </div>
      {swapType === "temporary" && (
        <div className="space-y-1 pt-1">
          <Label htmlFor="return-by" className="text-xs text-muted-foreground">
            Return by
          </Label>
          <Input
            id="return-by"
            type="date"
            min={today}
            value={returnBy}
            disabled={disabled}
            aria-invalid={!!error}
            onChange={(e) => onReturnByChange(e.target.value)}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
