import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { readNotificationPrefs } from "@/hooks/use-notification-prefs";

type UnreadCtx = {
  unreadCount: number;
  unreadByOffer: Record<string, number>;
  markOfferRead: (offerId: string) => void;
};

const Ctx = createContext<UnreadCtx>({
  unreadCount: 0,
  unreadByOffer: {},
  markOfferRead: () => {},
});

const LS_KEY = "sw-app:last-seen-messages";

function readSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSeen(map: Record<string, string>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  }
}

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadByOffer, setUnreadByOffer] = useState<Record<string, number>>({});

  const markOfferRead = (offerId: string) => {
    const seen = readSeen();
    seen[offerId] = new Date().toISOString();
    writeSeen(seen);
    setUnreadByOffer((prev) => {
      if (!prev[offerId]) return prev;
      const next = { ...prev };
      delete next[offerId];
      return next;
    });
  };

  // Initial load: compute unread counts per offer (messages newer than last-seen, not from self)
  useEffect(() => {
    if (!user) {
      setUnreadByOffer({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: offers } = await supabase
        .from("offers")
        .select("id")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      if (!offers || cancelled) return;
      const seen = readSeen();
      const counts: Record<string, number> = {};
      await Promise.all(
        offers.map(async (o) => {
          const since = seen[o.id] || "1970-01-01";
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("offer_id", o.id)
            .neq("sender_id", user.id)
            .gt("created_at", since);
          if (count && count > 0) counts[o.id] = count;
        }),
      );
      if (!cancelled) setUnreadByOffer(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime: listen on all messages and filter client-side to user's offers
  useEffect(() => {
    if (!user) return;
    let participantOffers = new Set<string>();
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("id")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      if (!cancelled && data) participantOffers = new Set(data.map((o) => o.id));
    })();

    const channel = supabase
      .channel(`unread:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { offer_id: string; sender_id: string; body: string };
          if (m.sender_id === user.id) return;
          if (!participantOffers.has(m.offer_id)) return;

          const onThisChat = location.pathname === `/chat/${m.offer_id}`;
          if (onThisChat) {
            // user is reading this chat; mark as seen
            const seen = readSeen();
            seen[m.offer_id] = new Date().toISOString();
            writeSeen(seen);
            return;
          }

          setUnreadByOffer((prev) => ({ ...prev, [m.offer_id]: (prev[m.offer_id] || 0) + 1 }));
          const prefs = readNotificationPrefs();
          if (prefs.toasts) {
            const isMeetup = m.body?.startsWith("[MEETUP]");
            toast(isMeetup ? "📅 New meetup proposal" : "💬 New message", {
              description: isMeetup ? "Open the chat to review." : (m.body || "").slice(0, 80),
              action: {
                label: "Open",
                onClick: () => {
                  window.location.href = `/chat/${m.offer_id}`;
                },
              },
            });
          }
        },
      )
      // Also refresh participant set when a new offer is created involving the user
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "offers" }, (payload) => {
        const o = payload.new as { id: string; from_user_id: string; to_user_id: string };
        if (o.from_user_id === user.id || o.to_user_id === user.id) {
          participantOffers.add(o.id);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname]);

  const unreadCount = Object.values(unreadByOffer).reduce((a, b) => a + b, 0);

  return (
    <Ctx.Provider value={{ unreadCount, unreadByOffer, markOfferRead }}>{children}</Ctx.Provider>
  );
}

export const useUnreadMessages = () => useContext(Ctx);
