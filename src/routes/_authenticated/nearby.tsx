import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { distanceKm } from "@/lib/countries";
import { CATEGORIES, type CategoryValue, normalizeCategory } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { StartSwapDialog } from "@/components/start-swap-dialog";
import { AlertCircle, Layers, MapPin } from "lucide-react";

const RADII = [10, 25, 50, 100] as const;
type Radius = (typeof RADII)[number];

const searchSchema = z.object({
  radius: fallback(
    z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]),
    25,
  ).default(25),
  cats: fallback(z.string().array(), []).default([]),
  swap: fallback(z.enum(["any", "definitive", "temporary"]), "any").default("any"),
});

export const Route = createFileRoute("/_authenticated/nearby")({
  component: NearbyPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Nearby members — Lettuce Swap" }] }),
});

type NearProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string;
  country: string;
  lat: number;
  lng: number;
  verified: boolean;
};

type NearItem = {
  owner_id: string;
  category: string;
  wanted_categories: string[] | null;
  swap_type: "definitive" | "temporary";
};

type Ranked = NearProfile & {
  km: number;
  matchScore: number;
  haveCats: Set<string>;
  wantCats: Set<string>;
  swapTypes: Set<string>;
};

type SearchT = z.infer<typeof searchSchema>;

function NearbyPage() {
  const { user } = useAuth();
  const nav = useNavigate({ from: "/nearby" });
  const search = Route.useSearch() as SearchT;
  const { radius, cats, swap } = search;
  const selectedCats = useMemo(() => new Set<string>(cats), [cats]);

  const setRadius = (r: Radius) => nav({ search: (p: SearchT) => ({ ...p, radius: r }) });
  const toggleCat = (c: CategoryValue) =>
    nav({
      search: (p: SearchT) => {
        const next = new Set<string>(p.cats ?? []);
        if (next.has(c)) next.delete(c);
        else next.add(c);
        return { ...p, cats: Array.from(next) };
      },
    });
  const setSwap = (s: "any" | "definitive" | "temporary") =>
    nav({ search: (p: SearchT) => ({ ...p, swap: s }) });

  const [swapTarget, setSwapTarget] = useState<Ranked | null>(null);
  const [MapView, setMapView] = useState<null | typeof import("@/components/nearby-map").NearbyMap>(
    null,
  );
  const [mapErr, setMapErr] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@/components/nearby-map")
      .then((m) => {
        if (alive) setMapView(() => m.NearbyMap);
      })
      .catch(() => {
        if (alive) setMapErr(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const {
    data: me,
    isLoading: loadingMe,
    error: meErr,
  } = useQuery({
    queryKey: ["me-loc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Owner-only RPC — lat/lng are revoked from direct SELECT.
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!row) return null;
      return { lat: row.lat, lng: row.lng, city: row.city, country: row.country };
    },
  });

  const { data: myItems } = useQuery({
    queryKey: ["my-items-cats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("items")
        .select("category,wanted_categories")
        .eq("owner_id", user!.id)
        .eq("status", "available");
      return (data ?? []) as { category: string; wanted_categories: string[] | null }[];
    },
  });

  const myCategorySets = useMemo(() => {
    const have = new Set<string>();
    const want = new Set<string>();
    for (const it of myItems ?? []) {
      if (it.category) have.add(normalizeCategory(it.category));
      for (const w of it.wanted_categories ?? []) want.add(normalizeCategory(w));
    }
    return { have, want };
  }, [myItems]);

  const degPad = Math.max(0.15, radius / 100);

  const {
    data: others,
    isLoading: loadingOthers,
    error: nearErr,
  } = useQuery({
    queryKey: ["nearby-profiles", me?.lat, me?.lng, degPad],
    enabled: me?.lat != null && me?.lng != null,
    queryFn: async () => {
      const lat = me!.lat as number;
      const lng = me!.lng as number;
      // Server-side RPC returns coordinates fuzzed to ~1 km grid and
      // excludes the current user. Direct column reads are revoked.
      const { data, error } = await supabase.rpc("get_nearby_profiles", {
        p_lat: lat,
        p_lng: lng,
        p_deg_pad: degPad,
      });
      if (error) throw error;
      return ((data ?? []) as NearProfile[]).slice(0, 300);
    },
  });

  const ownerIds = useMemo(() => (others ?? []).map((p) => p.id), [others]);

  const { data: theirItems } = useQuery({
    queryKey: ["nearby-items", ownerIds.join(",")],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("items")
        .select("owner_id,category,wanted_categories,swap_type")
        .in("owner_id", ownerIds)
        .eq("status", "available");
      return (data ?? []) as NearItem[];
    },
  });

  const ranked: Ranked[] = useMemo(() => {
    if (!others || me?.lat == null || me?.lng == null) return [];
    const byOwner = new Map<string, { have: Set<string>; want: Set<string>; swaps: Set<string> }>();
    for (const it of theirItems ?? []) {
      const e = byOwner.get(it.owner_id) ?? { have: new Set(), want: new Set(), swaps: new Set() };
      if (it.category) e.have.add(normalizeCategory(it.category));
      for (const w of it.wanted_categories ?? []) e.want.add(normalizeCategory(w));
      if (it.swap_type) e.swaps.add(it.swap_type);
      byOwner.set(it.owner_id, e);
    }
    return others
      .map((p) => {
        const km = distanceKm({ lat: me.lat!, lng: me.lng! }, { lat: p.lat, lng: p.lng });
        const theirs = byOwner.get(p.id) ?? {
          have: new Set<string>(),
          want: new Set<string>(),
          swaps: new Set<string>(),
        };
        let score = 0;
        for (const c of theirs.have) if (myCategorySets.want.has(c)) score++;
        for (const c of theirs.want) if (myCategorySets.have.has(c)) score++;
        return {
          ...p,
          km,
          matchScore: score,
          haveCats: theirs.have,
          wantCats: theirs.want,
          swapTypes: theirs.swaps,
        };
      })
      .filter((p) => p.km <= radius)
      .filter((p) => {
        if (selectedCats.size === 0) return true;
        for (const c of selectedCats) if (p.haveCats.has(c) || p.wantCats.has(c)) return true;
        return false;
      })
      .filter((p) => {
        if (swap === "any") return true;
        return p.swapTypes.has(swap);
      })
      .sort((a, b) => b.matchScore - a.matchScore || a.km - b.km);
  }, [others, me, theirItems, myCategorySets, radius, selectedCats, swap]);

  if (loadingMe) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center text-muted-foreground">
        Loading your location…
      </div>
    );
  }
  if (meErr) {
    return (
      <FallbackCard
        title="Couldn't load your profile"
        body="We had trouble reading your location. Check your connection and try again."
        action={<Button onClick={() => location.reload()}>Retry</Button>}
      />
    );
  }
  if (!me?.lat || !me?.lng) {
    return (
      <FallbackCard
        title="Set your location first"
        body="To find swappers near you, add your country and city or postcode in your profile."
        action={
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild>
              <Link to="/me">Set location</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/browse">Browse all items instead</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Members near {me.city || "you"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sorted by shared categories first, then distance. Coordinates fuzzed to ~1 km.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">
            Radius
          </span>
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 h-8 rounded-full border text-sm font-medium transition-colors ${
                radius === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary"
              }`}
              aria-pressed={radius === r}
            >
              {r} km
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">
            Swap type
          </span>
          {(["any", "definitive", "temporary"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSwap(s)}
              className={`px-3 h-8 rounded-full border text-sm font-medium capitalize transition-colors ${
                swap === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary"
              }`}
              aria-pressed={swap === s}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Categories
            </span>
            {selectedCats.size > 0 && (
              <button
                onClick={() => nav({ search: (p: SearchT) => ({ ...p, cats: [] }) })}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = selectedCats.has(c.value);
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  onClick={() => toggleCat(c.value)}
                  className={`px-3 h-8 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="h-[420px] md:h-[520px] w-full rounded-2xl overflow-hidden border border-border bg-muted relative">
        {mapErr ? (
          <FallbackInline
            icon={<AlertCircle className="h-5 w-5" />}
            text="The map couldn't load. The member list below still works."
          />
        ) : MapView ? (
          <MapView
            center={{ lat: me.lat, lng: me.lng }}
            others={ranked.map((r) => ({
              id: r.id,
              name: r.display_name || "Member",
              lat: r.lat,
              lng: r.lng,
              city: r.city,
              km: r.km,
              matchScore: r.matchScore,
            }))}
            radiusKm={radius}
            onStartSwap={(m) => {
              const found = ranked.find((r) => r.id === m.id);
              if (found) setSwapTarget(found);
            }}
          />
        ) : (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
        <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
          <div className="flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full border border-border text-xs shadow-sm">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Numbered circles</span>
            <span className="text-muted-foreground">= clusters · click to expand</span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-serif text-xl mb-3">
          {loadingOthers
            ? "Searching…"
            : `${ranked.length} member${ranked.length === 1 ? "" : "s"} within ${radius} km`}
        </h2>

        {nearErr && (
          <FallbackInline
            icon={<AlertCircle className="h-5 w-5" />}
            text="Couldn't load nearby members. Please try again."
          />
        )}

        {!loadingOthers && !nearErr && ranked.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No members match these filters within {radius} km. Try widening the radius or clearing
            categories.
          </p>
        )}

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((p) => (
            <li
              key={p.id}
              className="p-3 rounded-xl border border-border hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <Link to="/profile/$userId" params={{ userId: p.id }} className="shrink-0">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-serif">
                      {(p.display_name || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/profile/$userId" params={{ userId: p.id }} className="block">
                    <p className="text-sm font-medium truncate">
                      {p.display_name || "Member"}{" "}
                      {p.verified && <span aria-label="Verified">🌳</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {p.city} · {p.km.toFixed(1)} km
                    </p>
                  </Link>
                  {p.matchScore > 0 && (
                    <p className="text-xs text-primary mt-0.5 font-medium">
                      {p.matchScore} shared categor{p.matchScore === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="w-full mt-3 rounded-full"
                onClick={() => setSwapTarget(p)}
              >
                Start swap
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {swapTarget && (
        <StartSwapDialog
          key={swapTarget.id}
          otherUserId={swapTarget.id}
          otherUserName={swapTarget.display_name || "this member"}
          open
          onOpenChange={(v) => {
            if (!v) setSwapTarget(null);
          }}
        />
      )}
    </div>
  );
}

function FallbackCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center space-y-4">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function FallbackInline({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground bg-background/80 rounded-xl px-4 py-3 border border-border">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
