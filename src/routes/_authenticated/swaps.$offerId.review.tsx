import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/swaps/$offerId/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const { offerId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [grade, setGrade] = useState(80);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: offer } = useQuery({
    queryKey: ["offer-r", offerId],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("*").eq("id", offerId).maybeSingle();
      return data;
    },
  });

  if (!offer) return <div className="mx-auto max-w-md px-4 py-10">Loading…</div>;
  if (offer.status !== "completed") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-muted-foreground">
        You can only review completed swaps.
      </div>
    );
  }

  const revieweeId = user!.id === offer.from_user_id ? offer.to_user_id : offer.from_user_id;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      offer_id: offerId,
      reviewer_id: user!.id,
      reviewee_id: revieweeId,
      grade,
      comment,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Review submitted");
      nav({ to: "/profile/$userId", params: { userId: revieweeId } });
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-serif text-4xl mb-6">How did it go?</h1>
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          <Label>
            Grade <span className="text-2xl font-serif ml-2">{grade}</span>
            <span className="text-muted-foreground">/100</span>
          </Label>
          <Slider
            value={[grade]}
            min={1}
            max={100}
            step={1}
            onValueChange={(v) => setGrade(v[0])}
          />
        </div>
        <div className="space-y-2">
          <Label>Comment</Label>
          <Textarea
            rows={5}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the swap experience?"
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit review"}
        </Button>
      </form>
    </div>
  );
}
