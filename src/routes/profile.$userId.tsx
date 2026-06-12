import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemCardData } from "@/components/item-card";
import { BioMarkdown } from "@/components/bio-markdown";
import { Star } from "lucide-react";

export const Route = createFileRoute("/profile/$userId")({
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      // Don't request lat/lng/postcode — column SELECT is revoked for non-owners.
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,bio,city,country,avatar_url,verified,created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["profile-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id,title,category,estimated_worth_cents,city,swap_type,item_images(url),status")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (ItemCardData & { status: string })[];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id, grade, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, display_name)",
        )
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!profile) return <div className="mx-auto max-w-5xl px-4 py-12">Loading…</div>;

  const avg =
    reviews && reviews.length > 0
      ? Math.round(reviews.reduce((a, r) => a + r.grade, 0) / reviews.length)
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <header className="flex items-center gap-5">
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${profile.display_name}'s profile picture`}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-serif"
              aria-hidden
            >
              {profile.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          {profile.verified && (
            <span
              className="absolute -bottom-1 -right-1 text-2xl"
              title="Verified member"
              aria-label="Verified member"
            >
              🌳
            </span>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-4xl flex items-center gap-2">
            {profile.display_name}
            {profile.verified && (
              <span className="text-3xl" aria-label="Verified member" title="Verified member">
                🌳
              </span>
            )}
          </h1>
          <div className="text-muted-foreground">{profile.city}</div>
          {avg !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{avg}/100</span>
              <span className="text-muted-foreground">
                · {reviews!.length} review{reviews!.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </header>

      {profile.bio && <BioMarkdown className="max-w-2xl">{profile.bio}</BioMarkdown>}

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Available to swap</h2>
        {items && items.filter((i) => i.status === "available").length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items
              .filter((i) => i.status === "available")
              .map((it) => (
                <ItemCard key={it.id} item={it} />
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No items listed yet.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Reviews</h2>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => {
              const rev = r.reviewer as { id: string; display_name: string } | null;
              return (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between">
                    {rev ? (
                      <Link
                        to="/profile/$userId"
                        params={{ userId: rev.id }}
                        className="font-medium hover:underline"
                      >
                        {rev.display_name}
                      </Link>
                    ) : (
                      <span className="font-medium">Anonymous</span>
                    )}
                    <span className="text-sm flex items-center gap-1">
                      <Star className="h-3 w-3 fill-primary text-primary" /> {r.grade}/100
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
