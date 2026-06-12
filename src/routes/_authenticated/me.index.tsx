import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck,
  Upload,
  MapPin,
  Pencil,
  Package,
  Inbox,
  Compass,
  LogOut,
  ChevronRight,
  Bell,
  Check,
} from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { BioMarkdown } from "@/components/bio-markdown";
import { useNavigate } from "@tanstack/react-router";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { formatLeaves } from "@/lib/leaves";

export const Route = createFileRoute("/_authenticated/me/")({
  component: MyProfile,
});

type FormState = { display_name: string; bio: string };

const sameLoc = (a: LocationValue, b: LocationValue) =>
  a.country === b.country &&
  a.city === b.city &&
  a.postcode === b.postcode &&
  a.lat === b.lat &&
  a.lng === b.lng;

function MyProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { prefs, update } = useNotificationPrefs();
  const { data, refetch } = useQuery({
    queryKey: ["me", user?.id],
    queryFn: async () => {
      // Use SECURITY DEFINER RPC so the owner can read their own sensitive
      // columns (lat/lng/postcode) which are revoked from anon/authenticated.
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
    enabled: !!user,
  });
  const [form, setForm] = useState<FormState>({ display_name: "", bio: "" });
  const [loc, setLoc] = useState<LocationValue>({
    country: "",
    city: "",
    postcode: "",
    lat: null,
    lng: null,
  });
  const initial = useRef<{ form: FormState; loc: LocationValue } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bioSaveState, setBioSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = user ? `me:bio-draft:${user.id}` : null;

  const resetFromData = (d: typeof data) => {
    if (!d) return;
    const nextForm = { display_name: d.display_name ?? "", bio: d.bio ?? "" };
    const nextLoc: LocationValue = {
      country: (d as { country?: string }).country ?? "",
      city: d.city ?? "",
      postcode: (d as { postcode?: string }).postcode ?? "",
      lat: (d as { lat?: number | null }).lat ?? null,
      lng: (d as { lng?: number | null }).lng ?? null,
    };
    setForm(nextForm);
    setLoc(nextLoc);
    initial.current = { form: nextForm, loc: nextLoc };
  };

  useEffect(() => {
    resetFromData(data);
  }, [data]);

  // Restore local bio draft once profile data has loaded (drafts survive refresh).
  useEffect(() => {
    if (!data || !draftKey || !initial.current) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { bio: string; savedAt: number };
      if (typeof draft.bio === "string" && draft.bio !== initial.current.form.bio) {
        setForm((f) => ({ ...f, bio: draft.bio.slice(0, 500) }));
        setEditing(true);
        toast.info("Recovered unsaved bio changes");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, draftKey]);

  // Autosave bio (debounced) while editing — persists across refresh via DB + localStorage draft.
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistBio = async (bioValue: string) => {
    if (!user || !draftKey) return;
    setBioSaveState("saving");
    const { error } = await supabase.from("profiles").update({ bio: bioValue }).eq("id", user.id);
    if (error) {
      setBioSaveState("error");
      // Exponential backoff auto-retry: 2s, 5s, 15s, then stop and wait for manual retry.
      const delays = [2000, 5000, 15000];
      const attempt = retryCount.current;
      if (attempt < delays.length) {
        retryCount.current = attempt + 1;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => persistBio(bioValue), delays[attempt]);
      }
      return;
    }
    retryCount.current = 0;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (initial.current)
      initial.current = { ...initial.current, form: { ...initial.current.form, bio: bioValue } };
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setBioSaveState("saved");
  };

  // Autosave bio (debounced). Draft is kept in localStorage until the DB save succeeds.
  useEffect(() => {
    if (!editing || !user || !initial.current || !draftKey) return;
    if (form.bio === initial.current.form.bio) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ bio: form.bio, savedAt: Date.now() }));
    } catch {
      /* ignore */
    }
    setBioSaveState("saving");
    retryCount.current = 0;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    const t = setTimeout(() => persistBio(form.bio), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bio, editing, user, draftKey]);

  const retryBioSave = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    retryCount.current = 0;
    persistBio(form.bio);
  };

  const dirty = useMemo(() => {
    if (!initial.current) return false;
    const f = initial.current.form;
    return (
      f.display_name !== form.display_name ||
      f.bio !== form.bio ||
      !sameLoc(initial.current.loc, loc)
    );
  }, [form, loc]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...form,
        country: loc.country,
        city: loc.city,
        postcode: loc.postcode,
        lat: loc.lat,
        lng: loc.lng,
      })
      .eq("id", user!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    initial.current = { form, loc };
    setEditing(false);
    refetch();
  };

  const discard = () => {
    resetFromData(data);
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
    setBioSaveState("idle");
    setEditing(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const ext = extMap[file.type];
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (dbErr) toast.error(dbErr.message);
    else {
      toast.success("Profile picture updated");
      refetch();
    }
  };

  const avatarInitial = (form.display_name || "?")[0]?.toUpperCase();

  const quickLinks = [
    {
      to: "/me/items",
      label: "My items",
      desc: "Manage your listings",
      icon: Package,
      badge: null as string | null,
    },
    {
      to: "/me/offers",
      label: "Offers & chat",
      desc: "Incoming and sent swap requests",
      icon: Inbox,
      badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null,
    },
    {
      to: "/nearby",
      label: "Nearby",
      desc: "Discover swaps around you",
      icon: Compass,
      badge: null,
    },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Unified profile hero — combines header + bio + edit */}
      {!editing && (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 mb-8 shadow-sm">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="relative shrink-0 self-center sm:self-start">
              {data?.avatar_url ? (
                <img
                  src={data.avatar_url}
                  alt=""
                  className="h-32 w-32 sm:h-40 sm:w-40 rounded-full object-cover ring-4 ring-background shadow-lg"
                />
              ) : (
                <div
                  className="h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-primary text-primary-foreground grid place-items-center text-5xl sm:text-6xl font-serif ring-4 ring-background shadow-lg"
                  aria-hidden
                >
                  {avatarInitial}
                </div>
              )}
              {data?.verified && (
                <span
                  className="absolute bottom-1 right-1 text-3xl drop-shadow"
                  title="Verified member"
                  aria-label="Verified member"
                >
                  🌳
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="font-serif text-3xl sm:text-4xl text-primary flex items-center gap-2 justify-center sm:justify-start truncate">
                {form.display_name || "Welcome"}
              </h1>
              {(loc.city || loc.country) && (
                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {[loc.city, loc.country].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-4 text-sm">
                {form.bio ? (
                  <BioMarkdown>{form.bio}</BioMarkdown>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No bio yet — tell other swappers about yourself.
                  </p>
                )}
              </div>
              <div className="mt-5 flex justify-center sm:justify-start">
                <Button onClick={() => setEditing(true)} className="rounded-full">
                  <Pencil className="h-4 w-4 mr-2" /> Edit profile
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick links — bold dark-green cards */}
      {!editing && (
        <>
          <h2 className="font-serif text-xl sm:text-2xl text-primary mb-3 px-1">Your activity</h2>
          <nav
            aria-label="Account shortcuts"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
          >
            {quickLinks.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl transition-all group-hover:bg-primary/35 group-hover:scale-110"
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-md ring-1 ring-primary/30 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </span>
                    {l.badge && (
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
                        {l.badge}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-serif font-semibold text-foreground">
                        {l.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.desc}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <MyItemsSection />
          <ChatsSection />
        </>
      )}

      {editing && (
        <div className="mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl text-primary">Edit your profile</h2>
        </div>
      )}

      {editing && (
        <div className="space-y-8">
          <section aria-labelledby="avatar-heading" className="flex items-center gap-5">
            <div className="relative">
              {data?.avatar_url ? (
                <img
                  src={data.avatar_url}
                  alt="Your profile picture"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-serif"
                  aria-hidden
                >
                  {avatarInitial}
                </div>
              )}
              {data?.verified && (
                <span
                  className="absolute -bottom-1 -right-1 text-2xl"
                  title="Verified member"
                  aria-label="Verified member"
                >
                  🌳
                </span>
              )}
            </div>
            <div className="space-y-2">
              <h2 id="avatar-heading" className="font-medium">
                Profile picture
              </h2>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" aria-hidden />{" "}
                {uploading ? "Uploading…" : data?.avatar_url ? "Change picture" : "Upload picture"}
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="verify-heading"
            className="p-5 rounded-xl border border-border bg-card"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary mt-0.5" aria-hidden />
              <div className="flex-1">
                <h2 id="verify-heading" className="font-medium flex items-center gap-2">
                  Verified member{" "}
                  {data?.verified && (
                    <span className="text-xl" aria-label="Verified">
                      🌳
                    </span>
                  )}
                </h2>
                {data?.verified ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    You're verified. The 🌳 badge appears on your profile to signal trust to other
                    swappers.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mt-1">
                      Earn the 🌳 member badge by completing identity verification (ID document +
                      selfie).
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link to="/verify">Start verification</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                maxLength={60}
                required
              />
            </div>
            <LocationPicker value={loc} onChange={setLoc} />
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="bio">Bio</Label>
                {(() => {
                  const max = 500;
                  const len = form.bio.length;
                  const remaining = max - len;
                  const near = remaining <= 50;
                  const atLimit = remaining <= 0;
                  return (
                    <span
                      aria-live="polite"
                      className={`text-xs tabular-nums ${atLimit ? "text-destructive font-medium" : near ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                    >
                      {len}/{max}
                    </span>
                  );
                })()}
              </div>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 500) })}
                maxLength={500}
                rows={5}
                aria-describedby="bio-counter-hint"
                placeholder="Tell other swappers about yourself… **bold**, *italic*, [links](https://…), - lists"
              />
              <div
                id="bio-counter-hint"
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>
                  Supports Markdown: <code className="font-mono">**bold**</code>,{" "}
                  <code className="font-mono">*italic*</code>,{" "}
                  <code className="font-mono">[link](url)</code>, lists. Max 500 chars.
                </span>
                <span
                  aria-live="polite"
                  className={`flex items-center gap-2 ${bioSaveState === "error" ? "text-destructive" : ""}`}
                >
                  {bioSaveState === "saving" && "Saving…"}
                  {bioSaveState === "saved" && "Saved"}
                  {bioSaveState === "error" && (
                    <>
                      <span>Save failed — retrying…</span>
                      <button
                        type="button"
                        onClick={retryBioSave}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        Retry now
                      </button>
                    </>
                  )}
                </span>
              </div>
              {form.bio.trim() && (
                <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Preview
                  </p>
                  <BioMarkdown>{form.bio}</BioMarkdown>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={discard} disabled={busy}>
                Discard
              </Button>
              <Button type="submit" disabled={busy || !dirty}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <section aria-labelledby="notif-heading" className="mt-10 surface-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
            <Bell className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h2 id="notif-heading" className="font-serif text-xl">
              Notifications
            </h2>
            <p className="text-xs text-muted-foreground">
              How Lettuce Swap pings you about chat activity.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="pref-toasts" className="font-medium">
                Chat toasts
              </Label>
              <p className="text-xs text-muted-foreground">
                Pop-up alerts for new chat messages and meetup proposals.
              </p>
            </div>
            <Switch
              id="pref-toasts"
              checked={prefs.toasts}
              onCheckedChange={(v) => update({ toasts: !!v })}
              aria-label="Enable chat toast notifications"
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="pref-badge" className="font-medium">
                Offers unread badge
              </Label>
              <p className="text-xs text-muted-foreground">
                Show the unread counter next to the Offers link in the header.
              </p>
            </div>
            <Switch
              id="pref-badge"
              checked={prefs.badge}
              onCheckedChange={(v) => update({ badge: !!v })}
              aria-label="Show unread offers badge"
            />
          </div>
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <Button
          variant="ghost"
          className="rounded-full text-muted-foreground hover:text-destructive"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}

/* ---------- My Items section ---------- */

type MyItemRow = {
  id: string;
  title: string;
  category: string;
  estimated_worth_cents: number;
  city: string;
  swap_type: string;
  status: string;
  item_images: { url: string }[] | null;
};

function MyItemsSection() {
  const { user } = useAuth();
  const PAGE_SIZE = 6;
  const { data, refetch, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["me-items-preview", user?.id],
      enabled: !!user,
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const from = (pageParam as number) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from("items")
          .select("id,title,category,estimated_worth_cents,city,swap_type,status,item_images(url)")
          .eq("owner_id", user!.id)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as unknown as MyItemRow[];
      },
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    });

  const items = useMemo(() => data?.pages.flat() ?? [], [data]);

  // IntersectionObserver-based infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  const remove = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Item deleted");
      refetch();
    }
  };

  return (
    <section aria-labelledby="my-items-heading" className="mt-10 space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 id="my-items-heading" className="font-serif text-2xl text-primary leading-tight">
              My items
            </h2>
            <p className="text-xs text-muted-foreground">Listings you've published.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/me/items/new">Add</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="rounded-full text-primary">
            <Link to="/me/items">
              View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          You haven't listed anything yet.{" "}
          <Link
            to="/me/items/new"
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            List your first item
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((it) => {
              const img = it.item_images?.[0]?.url;
              return (
                <div key={it.id} className="group relative">
                  <Link
                    to="/items/$id"
                    params={{ id: it.id }}
                    className="block aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-secondary shadow-sm transition-all group-hover:shadow-lg group-hover:-translate-y-0.5"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={it.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                      <p className="text-white text-sm font-semibold leading-tight line-clamp-2">
                        {it.title}
                      </p>
                    </div>
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/90 text-foreground shadow-sm">
                      {it.status}
                    </span>
                  </Link>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs flex-1 rounded-full"
                    >
                      <Link to="/me/items/$id/edit" params={{ id: it.id }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(it.id)}
                      className="h-7 px-2.5 text-xs rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
          {!hasNextPage && items.length > PAGE_SIZE && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              You've reached the end.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Active chats section ---------- */

type ChatRow = {
  id: string;
  updated_at: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  from_user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean | null;
  } | null;
  to_user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean | null;
  } | null;
  requested: { title: string } | null;
  offered: { title: string } | null;
  leaves_amount: number | null;
};

type LastMessage = { body: string; created_at: string; sender_id: string };

function relTime(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function ChatsSection() {
  const { user } = useAuth();
  const { unreadByOffer, markOfferRead } = useUnreadMessages();

  const { data: chats, isLoading } = useQuery({
    queryKey: ["me-active-chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          `id, updated_at, from_user_id, to_user_id, status,
          from_user:profiles!offers_from_user_id_fkey(id, display_name, avatar_url, verified),
          to_user:profiles!offers_to_user_id_fkey(id, display_name, avatar_url, verified),
          requested:items!offers_requested_item_id_fkey(title),
          offered:items!offers_offered_item_id_fkey(title), leaves_amount`,
        )
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .in("status", ["accepted", "completed"])
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as ChatRow[];
    },
  });

  const offerIds = chats?.map((c) => c.id) ?? [];

  const { data: lastMessages } = useQuery({
    queryKey: ["me-active-chats-lastmsg", offerIds.join(",")],
    enabled: offerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("offer_id, body, created_at, sender_id")
        .in("offer_id", offerIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, LastMessage> = {};
      for (const m of (data ?? []) as {
        offer_id: string;
        body: string;
        created_at: string;
        sender_id: string;
      }[]) {
        if (!map[m.offer_id])
          map[m.offer_id] = { body: m.body, created_at: m.created_at, sender_id: m.sender_id };
      }
      return map;
    },
  });

  return (
    <section aria-labelledby="chats-heading" className="mt-10 space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h2 id="chats-heading" className="font-serif text-2xl text-primary leading-tight">
              Chat
            </h2>
            <p className="text-xs text-muted-foreground">Active swap conversations.</p>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="rounded-full text-primary">
          <Link to="/me/offers">
            All offers <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : !chats || chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No active chats yet. Accept an offer to start a conversation.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {chats.map((c) => {
            const isFrom = c.from_user_id === user?.id;
            const other = isFrom ? c.to_user : c.from_user;
            const name = other?.display_name ?? "Someone";
            const initial = name[0]?.toUpperCase() ?? "?";
            const last = lastMessages?.[c.id];
            const isMeetup = last?.body?.startsWith("[MEETUP]");
            const preview = !last ? (
              <em className="text-muted-foreground/70">No messages yet — say hello.</em>
            ) : isMeetup ? (
              "📅 Meetup proposal"
            ) : (
              `${last.sender_id === user?.id ? "You: " : ""}${last.body}`
            );
            const unread = unreadByOffer[c.id] ?? 0;
            const updated = last?.created_at ?? c.updated_at;
            return (
              <li key={c.id} className="relative group">
                <Link
                  to="/chat/$offerId"
                  params={{ offerId: c.id }}
                  className="flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors"
                >
                  <div className="relative shrink-0">
                    {other?.avatar_url ? (
                      <img
                        src={other.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-background shadow-sm"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-serif text-lg shadow-sm"
                        aria-hidden
                      >
                        {initial}
                      </div>
                    )}
                    {unread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center ring-2 ring-card"
                        aria-label={`${unread} unread`}
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm truncate ${unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}
                      >
                        {name}
                        {other?.verified && (
                          <span className="ml-1" aria-label="Verified">
                            🌳
                          </span>
                        )}
                      </p>
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ${unread > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}
                      >
                        {relTime(updated)}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {preview}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1 truncate">
                      {c.offered?.title ?? (c.leaves_amount ? formatLeaves(c.leaves_amount) : "—")}{" "}
                      ⇄ {c.requested?.title}
                    </p>
                  </div>
                </Link>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markOfferRead(c.id);
                    }}
                    className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Mark chat as read"
                  >
                    <Check className="h-3 w-3" /> Mark read
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
