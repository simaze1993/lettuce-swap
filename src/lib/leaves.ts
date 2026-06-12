import type { Database } from "@/integrations/supabase/types";

// Lettuce Leaves 🥬 — the app-only credit. Value exists only inside Lettuce
// Swap: Leaves cannot be bought (yet) and can never be converted to money.
// Bonus amounts live in the database functions (supabase/migrations); the
// constants here are for display copy only and must match them.

export const LEAF = "🥬";

export const LEAVES_BONUS = {
  signup: 50,
  inviter: 100,
  invitee: 25,
  completedSwap: 10,
} as const;

export type LeafEntryKind = Database["public"]["Enums"]["leaf_entry_kind"];

export function formatLeaves(n: number, { signed = false }: { signed?: boolean } = {}): string {
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString()} ${LEAF}`;
}

export const LEAF_KIND_META: Record<LeafEntryKind, { label: string; emoji: string }> = {
  signup_bonus: { label: "Welcome bonus", emoji: "🌱" },
  invite_bonus: { label: "Invite bonus", emoji: "🤝" },
  community_bonus: { label: "Community bonus", emoji: "🏡" },
  promo_bonus: { label: "Promotion bonus", emoji: "📣" },
  swap_payment: { label: "Paid for a swap", emoji: "📤" },
  swap_income: { label: "Received for a swap", emoji: "📥" },
  swap_refund: { label: "Swap refund", emoji: "↩️" },
  swap_bonus: { label: "Completed swap", emoji: "🎉" },
  adjustment: { label: "Adjustment", emoji: "🛠️" },
};
