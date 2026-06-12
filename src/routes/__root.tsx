import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { BRAND_LOGO_URL } from "@/lib/brand";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { UnreadMessagesProvider } from "@/hooks/use-unread-messages";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <a href="/" className="mt-6 inline-block underline">
          Go home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  const isDev = import.meta.env.DEV;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isDev ? error.message : "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lettuce Swap" },
      { name: "description", content: "Swapping is the New Shopping" },
      { property: "og:title", content: "Lettuce Swap" },
      { name: "twitter:title", content: "Lettuce Swap" },
      { property: "og:description", content: "Swapping is the New Shopping" },
      { name: "twitter:description", content: "Swapping is the New Shopping" },
      // Social platforms need an absolute URL — prefix with the production
      // domain once the app is deployed.
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preload", as: "image", href: BRAND_LOGO_URL, fetchPriority: "high" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=4" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png?v=4" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=4" },
      { rel: "manifest", href: "/site.webmanifest?v=4" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `(function(){try{var t=localStorage.getItem('sw-app:theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UnreadMessagesProvider>
            <CacheInvalidator queryClient={queryClient} />
            <div className="min-h-screen flex flex-col">
              <SiteHeader />
              <main className="flex-1">
                <Outlet />
              </main>
              <footer className="border-t border-border py-8 mt-16 text-center text-sm text-muted-foreground space-y-3">
                <div className="flex items-center justify-center gap-6">
                  <Link to="/about" className="hover:text-foreground transition-colors">
                    What is Lettuce Swap?
                  </Link>
                  <Link to="/browse" className="hover:text-foreground transition-colors">
                    Browse
                  </Link>
                  <Link to="/home" className="hover:text-foreground transition-colors">
                    Home
                  </Link>
                </div>
                <p>Lettuce Swap · Swapping is the New Shopping.</p>
              </footer>
            </div>
            <Toaster />
          </UnreadMessagesProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function CacheInvalidator({ queryClient }: { queryClient: QueryClient }) {
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries();
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}
