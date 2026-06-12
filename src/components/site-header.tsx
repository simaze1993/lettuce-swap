import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLeavesBalance } from "@/hooks/use-leaves";
import { LEAF } from "@/lib/leaves";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, Search as SearchIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SwapItLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CATEGORIES } from "@/lib/constants";
import { GAME_MODE_ENABLED } from "@/lib/features";

export function SiteHeader() {
  const { user, signOut, loading } = useAuth();
  const { balance } = useLeavesBalance();
  const { unreadCount } = useUnreadMessages();
  const { prefs } = useNotificationPrefs();
  const showBadge = prefs.badge && unreadCount > 0;
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: meProfile } = useQuery({
    queryKey: ["header-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const displayName = meProfile?.display_name?.trim() || user?.email?.split("@")[0] || "Profile";

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate({
      to: "/browse",
      search: {
        q: q || undefined,
        category: cat || undefined,
      },
    });
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3 lg:gap-6">
        <Link
          to="/home"
          className="flex items-center shrink-0"
          aria-label="Lettuce Swap — Swapping is the New Shopping"
        >
          <SwapItLogo className="h-10 sm:h-12 lg:h-14 w-auto" />
        </Link>

        {/* Desktop pill search bar (lg+) */}
        <form
          onSubmit={submitSearch}
          className="flex-1 max-w-2xl hidden lg:flex items-center border border-input rounded-full bg-secondary/60 overflow-hidden focus-within:ring-2 focus-within:ring-ring/20 transition-all"
        >
          <div className="relative shrink-0 border-r border-input">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="appearance-none h-10 pl-5 pr-9 bg-transparent text-sm font-medium cursor-pointer focus:outline-none"
              aria-label="Category"
            >
              <option value="">Catalogue</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for vintage clothes, vinyls, plants…"
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-6 h-9 mr-1 text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>

        {/* Desktop nav (lg+) */}
        <nav className="hidden lg:flex items-center gap-5 text-sm shrink-0">
          <ThemeToggle />
          <Link
            to="/about"
            activeProps={{ className: "text-foreground" }}
            className="text-muted-foreground hover:text-foreground"
          >
            What is Lettuce Swap?
          </Link>
          {user && (
            <Link
              to="/me/items"
              activeProps={{ className: "text-foreground" }}
              className="text-muted-foreground hover:text-foreground"
            >
              My items
            </Link>
          )}
          {user && (
            <Link
              to="/nearby"
              activeProps={{ className: "text-foreground" }}
              className="text-muted-foreground hover:text-foreground"
            >
              Nearby
            </Link>
          )}
          {user && GAME_MODE_ENABLED && (
            <Link
              to="/game"
              activeProps={{ className: "text-foreground" }}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              🎮 Game
            </Link>
          )}
          {user && (
            <Link
              to="/me/leaves"
              activeProps={{ className: "ring-primary" }}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:ring-primary/50 transition tabular-nums"
              aria-label={`My Lettuce Leaves: ${balance}`}
            >
              <span aria-hidden>{LEAF}</span>
              {balance.toLocaleString()}
            </Link>
          )}
          {user && (
            <Link
              to="/me/offers"
              activeProps={{ className: "text-foreground" }}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground relative"
              aria-label={
                showBadge
                  ? `Offers, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                  : "Offers"
              }
            >
              Offers
              {showBadge && (
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {loading ? null : user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full max-w-[12rem]">
                <Link to="/me" className="truncate">
                  {displayName}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-muted-foreground hover:text-foreground font-medium">
                Log in
              </Link>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to="/signup">Join community</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile / tablet actions (below lg) */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          <ThemeToggle />
          {user && (
            <Link
              to="/me/offers"
              className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
              aria-label={showBadge ? `Offers, ${unreadCount} unread` : "Offers"}
            >
              <span className="text-xs font-semibold">Offers</span>
              {showBadge && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-96 p-0 flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-2 text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              {/* Mobile search */}
              <form
                onSubmit={submitSearch}
                className="px-6 pt-2 pb-4 flex flex-col gap-2 border-b border-border"
              >
                <div className="relative">
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full appearance-none h-10 pl-4 pr-9 bg-secondary/60 border border-input rounded-full text-sm font-medium focus:outline-none"
                    aria-label="Category"
                  >
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
                <div className="flex items-center border border-input rounded-full bg-secondary/60 overflow-hidden focus-within:ring-2 focus-within:ring-ring/20">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground h-8 w-8 mr-1 inline-flex items-center justify-center rounded-full hover:opacity-90"
                    aria-label="Search"
                  >
                    <SearchIcon className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Mobile nav links */}
              <nav className="flex-1 overflow-y-auto px-2 py-2 flex flex-col text-sm">
                <SheetClose asChild>
                  <Link
                    to="/about"
                    className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                  >
                    What is Lettuce Swap?
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/browse"
                    className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                  >
                    Browse all
                  </Link>
                </SheetClose>
                {user && (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/me/items"
                        className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                      >
                        My items
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/nearby"
                        className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                      >
                        Nearby
                      </Link>
                    </SheetClose>
                    {GAME_MODE_ENABLED && (
                      <SheetClose asChild>
                        <Link
                          to="/game"
                          className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                        >
                          🎮 Game Mode
                        </Link>
                      </SheetClose>
                    )}
                    <SheetClose asChild>
                      <Link
                        to="/me/leaves"
                        className="px-4 py-3 rounded-md hover:bg-accent text-foreground inline-flex items-center justify-between"
                      >
                        <span>My Leaves</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 ring-1 ring-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                          <span aria-hidden>{LEAF}</span>
                          {balance.toLocaleString()}
                        </span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/me/offers"
                        className="px-4 py-3 rounded-md hover:bg-accent text-foreground inline-flex items-center justify-between"
                      >
                        <span>Offers</span>
                        {showBadge && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/me"
                        className="px-4 py-3 rounded-md hover:bg-accent text-foreground"
                      >
                        {displayName}
                      </Link>
                    </SheetClose>
                  </>
                )}

                <div className="my-2 border-t border-border" />
                <div className="px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                  Categories
                </div>
                {CATEGORIES.map((c) => (
                  <SheetClose asChild key={c.value}>
                    <Link
                      to="/browse"
                      search={{ category: c.value }}
                      className="px-4 py-2.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>

              {/* Mobile auth actions */}
              <div className="border-t border-border p-4 flex flex-col gap-2">
                {loading ? null : user ? (
                  <Button
                    variant="outline"
                    className="rounded-full w-full"
                    onClick={async () => {
                      setMobileOpen(false);
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    Sign out
                  </Button>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="rounded-full w-full">
                        <Link to="/login">Log in</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="rounded-full w-full">
                        <Link to="/signup">Join community</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Category strip (lg+) */}
      <div className="border-t border-border/60 bg-background hidden lg:block">
        <div className="mx-auto max-w-7xl px-6 h-11 flex items-center gap-8 overflow-x-auto text-[11px] uppercase tracking-[0.14em] font-medium">
          <Link
            to="/browse"
            className="text-primary border-b-2 border-primary pb-0.5 whitespace-nowrap"
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              to="/browse"
              search={{ category: c.value }}
              className="text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
