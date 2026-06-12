import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SwapModeBadge, DueBadge } from "@/components/swap-badges";
import { toast } from "sonner";
import { CalendarClock, MapPin, Check, X, Lock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/$offerId")({
  component: Chat,
});

type Msg = { id: string; body: string; sender_id: string; created_at: string };

const MEETUP_TAG = "[MEETUP]";
const MAX_MSG_LEN = 1000;
const MAX_WHERE_LEN = 200;
const MAX_NOTES_LEN = 500;

type Meetup = {
  when: string;
  where: string;
  notes?: string;
  status?: "pending" | "accepted" | "declined";
};

function parseMeetup(body: string): Meetup | null {
  if (!body || typeof body !== "string" || !body.startsWith(MEETUP_TAG)) return null;
  try {
    const raw = JSON.parse(body.slice(MEETUP_TAG.length)) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.when !== "string" || typeof r.where !== "string") return null;
    // Validate date
    if (isNaN(new Date(r.when).getTime())) return null;
    const status = r.status;
    const validStatus =
      status === "accepted" || status === "declined" || status === "pending" ? status : "pending";
    return {
      when: r.when,
      where: r.where.slice(0, MAX_WHERE_LEN),
      notes: typeof r.notes === "string" ? r.notes.slice(0, MAX_NOTES_LEN) : undefined,
      status: validStatus,
    };
  } catch {
    return null;
  }
}

function Chat() {
  const { offerId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { markOfferRead } = useUnreadMessages();
  const [body, setBody] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const offerQ = useQuery({
    queryKey: ["offer", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          `*,
          requested:items!offers_requested_item_id_fkey(id, title),
          offered:items!offers_offered_item_id_fkey(id, title),
          from_user:profiles!offers_from_user_id_fkey(id, display_name),
          to_user:profiles!offers_to_user_id_fkey(id, display_name)`,
        )
        .eq("id", offerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const msgsQ = useQuery({
    queryKey: ["messages", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${offerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `offer_id=eq.${offerId}` },
        () => msgsQ.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId, msgsQ]);

  // Mark as read whenever we render new messages
  useEffect(() => {
    if (msgsQ.data && msgsQ.data.length > 0) markOfferRead(offerId);
  }, [msgsQ.data, offerId, markOfferRead]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [msgsQ.data?.length]);

  if (!offerQ.data) return <div className="mx-auto max-w-2xl px-4 py-10">Loading…</div>;
  const offer = offerQ.data;
  const other = user?.id === offer.from_user_id ? offer.to_user : offer.from_user;
  const otherT = other as { id: string; display_name: string } | null;
  const isAccepted = offer.status === "accepted";
  const isCompleted = offer.status === "completed";
  const isTemporary = offer.swap_type === "temporary";
  const canInteract = isAccepted; // chat + meetup only when accepted
  const allMsgs = msgsQ.data ?? [];
  const meetupMsgs = allMsgs
    .map((m) => ({ msg: m, parsed: parseMeetup(m.body) }))
    .filter((x): x is { msg: Msg; parsed: Meetup } => !!x.parsed);
  const hasAnyMeetup = meetupMsgs.length > 0;
  const hasAcceptedMeetup = meetupMsgs.some((x) => x.parsed.status === "accepted");
  const canComplete = isAccepted && hasAcceptedMeetup;
  const completeBlockReason = !isAccepted
    ? null
    : !hasAnyMeetup
      ? "Propose a meetup first — at least one party must accept it before you can complete the swap."
      : !hasAcceptedMeetup
        ? "Waiting for a meetup proposal to be accepted. Once accepted, you can mark the swap completed."
        : null;
  const gateReason =
    offer.status === "pending"
      ? "This offer is still pending. Once accepted, you can chat and propose a meetup."
      : offer.status === "declined"
        ? "This offer was declined. Chat is closed."
        : offer.status === "cancelled"
          ? "This offer was cancelled. Chat is closed."
          : isCompleted
            ? "This swap is completed. Chat is read-only."
            : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInteract) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_MSG_LEN) {
      toast.error(`Messages are limited to ${MAX_MSG_LEN} characters.`);
      return;
    }
    if (trimmed.startsWith(MEETUP_TAG)) {
      toast.error("That prefix is reserved. Use “Propose meetup” instead.");
      return;
    }
    const { error } = await supabase
      .from("messages")
      .insert({ offer_id: offerId, sender_id: user!.id, body: trimmed });
    if (error) toast.error(error.message);
    else setBody("");
  };

  const sendMeetup = async (m: Meetup) => {
    if (!canInteract) return;
    const payload = MEETUP_TAG + JSON.stringify({ ...m, status: "pending" });
    if (payload.length > MAX_MSG_LEN) {
      toast.error("Meetup proposal is too long.");
      return;
    }
    const { error } = await supabase
      .from("messages")
      .insert({ offer_id: offerId, sender_id: user!.id, body: payload });
    if (error) toast.error(error.message);
    else toast.success("Meetup proposal sent");
  };

  const replyToMeetup = async (original: Msg, status: "accepted" | "declined") => {
    if (!canInteract) return;
    const m = parseMeetup(original.body);
    if (!m) return;
    const payload = MEETUP_TAG + JSON.stringify({ ...m, status });
    const { error } = await supabase
      .from("messages")
      .insert({ offer_id: offerId, sender_id: user!.id, body: payload });
    if (error) toast.error(error.message);
    else toast.success(status === "accepted" ? "Meetup accepted" : "Meetup declined");
  };

  const markCompleted = async (notes: string) => {
    const summary = notes.trim();
    if (summary) {
      // Persist exchange notes as a final chat message
      const noteBody = `📝 Swap notes: ${summary}`.slice(0, MAX_MSG_LEN);
      await supabase
        .from("messages")
        .insert({ offer_id: offerId, sender_id: user!.id, body: noteBody });
    }
    const { error } = await supabase
      .from("offers")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", offerId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Swap marked completed");
    offerQ.refetch();
    nav({ to: "/swaps/$offerId/review", params: { offerId } });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
      <div className="p-4 rounded-xl border border-border bg-card space-y-2">
        <div className="text-sm">
          Swap with{" "}
          {otherT && (
            <Link to="/profile/$userId" params={{ userId: otherT.id }} className="underline">
              {otherT.display_name}
            </Link>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <em>{(offer.offered as { title: string })?.title}</em> ⇄{" "}
          <em>{(offer.requested as { title: string })?.title}</em>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SwapModeBadge swapType={offer.swap_type} />
          {isTemporary && (isAccepted || isCompleted) && <DueBadge returnBy={offer.return_by} />}
        </div>
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span
            className="text-xs px-2 py-1 rounded bg-secondary"
            aria-label={`Offer status: ${offer.status}`}
          >
            {offer.status}
          </span>
          <MeetupDialog
            onSubmit={sendMeetup}
            disabled={!canInteract}
            disabledReason={gateReason ?? undefined}
          />
          {isAccepted && (
            <CompleteSwapDialog
              onConfirm={markCompleted}
              isTemporary={isTemporary}
              disabled={!canComplete}
              disabledReason={completeBlockReason ?? undefined}
            />
          )}
          {isCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => nav({ to: "/swaps/$offerId/review", params: { offerId } })}
            >
              Leave review
            </Button>
          )}
        </div>
        {gateReason && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/60 text-xs text-muted-foreground"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{gateReason}</span>
          </div>
        )}
        {!gateReason && completeBlockReason && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/60 text-xs text-muted-foreground"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{completeBlockReason}</span>
          </div>
        )}
      </div>

      <div className="border border-border rounded-xl bg-card flex flex-col h-[500px]">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-medium">Messages</span>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {(msgsQ.data ?? []).map((m) => {
            const mine = m.sender_id === user?.id;
            const isMeetupTagged = m.body.startsWith(MEETUP_TAG);
            const meetup = isMeetupTagged ? parseMeetup(m.body) : null;
            if (isMeetupTagged && !meetup) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground inline-flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" /> Malformed meetup proposal
                  </div>
                </div>
              );
            }
            if (meetup) {
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] rounded-2xl border border-border bg-secondary/40 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarClock className="h-4 w-4" /> Meetup proposal
                      {meetup.status && meetup.status !== "pending" && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${meetup.status === "accepted" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}
                        >
                          {meetup.status}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-3 w-3" />{" "}
                        {new Date(meetup.when).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> {meetup.where}
                      </div>
                      {meetup.notes && (
                        <div className="pt-1 whitespace-pre-wrap">{meetup.notes}</div>
                      )}
                    </div>
                    {!mine && meetup.status === "pending" && canInteract && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => replyToMeetup(m, "accepted")}>
                          <Check className="h-3 w-3" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => replyToMeetup(m, "declined")}
                        >
                          <X className="h-3 w-3" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          {(msgsQ.data ?? []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet.</p>
          )}
        </div>
        <form
          onSubmit={send}
          className="border-t border-border p-3 flex gap-2 items-start"
          aria-label="Send chat message"
        >
          <div className="flex-1 space-y-1">
            <label htmlFor="chat-message" className="sr-only">
              Message
            </label>
            <Input
              id="chat-message"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_MSG_LEN))}
              placeholder={
                canInteract ? "Type a message…" : "Chat unlocks when the offer is accepted"
              }
              maxLength={MAX_MSG_LEN}
              disabled={!canInteract}
              aria-disabled={!canInteract}
              aria-describedby="chat-message-help chat-message-count"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span id="chat-message-help">
                {!canInteract ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    <span>Locked — {gateReason ?? "chat is unavailable"}</span>
                  </span>
                ) : null}
              </span>
              <span id="chat-message-count" aria-live="polite">
                {body.length}/{MAX_MSG_LEN}
              </span>
            </div>
          </div>
          <Button type="submit" disabled={!canInteract || !body.trim()} aria-label="Send message">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

function MeetupDialog({
  onSubmit,
  disabled,
  disabledReason,
}: {
  onSubmit: (m: Meetup) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!when || !where.trim()) {
      toast.error("Pick a date and a place");
      return;
    }
    if (isNaN(new Date(when).getTime())) {
      toast.error("Invalid date");
      return;
    }
    await onSubmit({
      when,
      where: where.trim().slice(0, MAX_WHERE_LEN),
      notes: notes.trim().slice(0, MAX_NOTES_LEN) || undefined,
    });
    setOpen(false);
    setWhen("");
    setWhere("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={
            disabled
              ? `Propose meetup (disabled — ${disabledReason ?? "currently unavailable"})`
              : "Propose meetup"
          }
          title={disabled ? disabledReason : undefined}
        >
          {disabled ? (
            <Lock className="h-3 w-3" aria-hidden="true" />
          ) : (
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
          )}
          <span>Propose meetup</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a meetup</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="meetup-when">When</Label>
            <Input
              id="meetup-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meetup-where">Where</Label>
            <Input
              id="meetup-where"
              placeholder="e.g. Café Central, Paris"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              maxLength={MAX_WHERE_LEN}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meetup-notes">Notes (optional)</Label>
            <Textarea
              id="meetup-notes"
              placeholder="Anything to coordinate…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={MAX_NOTES_LEN}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Send proposal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteSwapDialog({
  onConfirm,
  isTemporary,
  disabled,
  disabledReason,
}: {
  onConfirm: (notes: string) => Promise<void>;
  isTemporary?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [meetup, setMeetup] = useState(false);
  const [notesOk, setNotesOk] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = handoff && meetup && notesOk;
  const triggerLabel = isTemporary ? "Mark returned" : "Mark completed";

  const confirm = async () => {
    if (!ready) return;
    setBusy(true);
    await onConfirm(notes);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!disabled) setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={
            disabled
              ? `${triggerLabel} (disabled — ${disabledReason ?? "not yet available"})`
              : isTemporary
                ? "Mark loan returned"
                : "Mark swap completed"
          }
          title={disabled ? disabledReason : undefined}
        >
          {disabled && <Lock className="h-3 w-3" aria-hidden="true" />}
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isTemporary ? "Confirm the loan was returned" : "Confirm swap completion"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Tick all three so we know the {isTemporary ? "items came back" : "swap really happened"}
            . You'll be taken to the review afterwards.
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={handoff} onCheckedChange={(v) => setHandoff(!!v)} />
            <span>
              {isTemporary ? (
                <>
                  I confirm both <strong>items were returned</strong> to their owners.
                </>
              ) : (
                <>
                  I confirm the <strong>item handoff</strong> (both items changed hands as agreed).
                </>
              )}
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={meetup} onCheckedChange={(v) => setMeetup(!!v)} />
            <span>
              The <strong>{isTemporary ? "return meet-up" : "meet-up"} was completed</strong> (in
              person or via shipping).
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={notesOk} onCheckedChange={(v) => setNotesOk(!!v)} />
            <span>
              I'm ready to share <strong>exchange notes</strong> with the other party.
            </span>
          </label>
          <div className="space-y-1">
            <Label htmlFor="swap-notes">Exchange notes (optional)</Label>
            <Textarea
              id="swap-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LEN))}
              maxLength={MAX_NOTES_LEN}
              placeholder="Anything worth remembering about this swap…"
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {notes.length}/{MAX_NOTES_LEN}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={confirm} disabled={!ready || busy}>
            {busy ? "Saving…" : isTemporary ? "Complete loan" : "Complete swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
