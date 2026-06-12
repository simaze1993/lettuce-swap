import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  // Runs on both server (SSR) and client (navigation). The browser Supabase
  // client persists the session in localStorage, so the server has no way
  // to verify auth on its own. We hard-redirect to /login during SSR so
  // authenticated page HTML is never streamed to anonymous requests, and
  // do a real session check on the client.
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);
  if (loading || !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  }
  return <Outlet />;
}
