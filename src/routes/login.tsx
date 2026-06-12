import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: Login,
  head: () => ({ meta: [{ title: "Sign in — Lettuce Swap" }] }),
});

function Login() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { redirect: redirectTo } = Route.useSearch();
  // Only allow same-origin path redirects. Reject protocol-relative URLs like "//evil.com"
  // and anything containing a backslash (some browsers normalize to "/").
  const isSafePath = (u: unknown): u is string =>
    typeof u === "string" && u.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\");
  const target = isSafePath(redirectTo) ? redirectTo : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: target });
  }, [user, nav, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    nav({ to: target });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl mb-6">Sign in</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-4">
        No account?{" "}
        <Link to="/signup" className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
