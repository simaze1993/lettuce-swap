import { cn } from "@/lib/utils";
import { dueStatus, swapTypeEmoji, swapTypeLabel, type SwapType } from "@/lib/swap";

/** Pill showing whether a swap is a definitive swap or a temporary loan. */
export function SwapModeBadge({
  swapType,
  className,
}: {
  swapType: SwapType | string;
  className?: string;
}) {
  const temporary = swapType === "temporary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1",
        temporary
          ? "bg-amber-100 text-amber-900 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200"
          : "bg-primary/10 text-primary ring-primary/25",
        className,
      )}
    >
      <span aria-hidden>{swapTypeEmoji(swapType)}</span>
      {swapTypeLabel(swapType)}
    </span>
  );
}

/**
 * Pill showing the due/overdue state of a temporary loan's return date.
 * Renders nothing when there is no return date.
 */
export function DueBadge({ returnBy, className }: { returnBy: string | null; className?: string }) {
  const due = dueStatus(returnBy);
  if (!due) return null;
  const tone =
    due.kind === "overdue"
      ? "bg-destructive/15 text-destructive ring-destructive/30"
      : due.kind === "soon"
        ? "bg-amber-100 text-amber-900 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200"
        : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1",
        tone,
        className,
      )}
    >
      <span aria-hidden>⏳</span>
      {due.label}
    </span>
  );
}
