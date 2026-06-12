// Helpers for the two swap modes (definitive vs temporary loan) and for the
// "due / overdue" state of a temporary loan's return date.

export type SwapType = "definitive" | "temporary";

export function swapTypeLabel(t: SwapType | string): string {
  return t === "temporary" ? "Temporary loan" : "Definitive swap";
}

/** Short emoji marker used in badges. */
export function swapTypeEmoji(t: SwapType | string): string {
  return t === "temporary" ? "⏳" : "♻️";
}

export type DueKind = "upcoming" | "soon" | "overdue";

export type DueState = {
  kind: DueKind;
  days: number; // signed: negative = days overdue
  label: string;
};

/** Format a YYYY-MM-DD return date into a human due/overdue badge, or null. */
export function dueStatus(
  returnBy: string | null | undefined,
  now: Date = new Date(),
): DueState | null {
  if (!returnBy) return null;
  const due = new Date(`${returnBy}T00:00:00`);
  if (isNaN(due.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const plural = (n: number) => (Math.abs(n) === 1 ? "" : "s");
  if (days < 0) {
    return { kind: "overdue", days, label: `Overdue by ${Math.abs(days)} day${plural(days)}` };
  }
  if (days === 0) return { kind: "soon", days, label: "Due back today" };
  if (days <= 3) return { kind: "soon", days, label: `Due back in ${days} day${plural(days)}` };
  return { kind: "upcoming", days, label: `Due back ${due.toLocaleDateString()}` };
}
