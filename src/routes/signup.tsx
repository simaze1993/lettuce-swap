import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: Signup,
  head: () => ({ meta: [{ title: "Join — Lettuce Swap" }] }),
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(60),
  city: z.string().trim().max(100),
});

function Signup() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", displayName: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav({ to: "/" });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.displayName, city: parsed.data.city },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled on this project — signed in immediately.
      toast.success("Account created — welcome to Lettuce Swap!");
      nav({ to: "/" });
      return;
    }
    // Email confirmation enabled: no session until the activation link is clicked.
    // Also shown when the email is already registered (Supabase returns no
    // session and an empty identities list) so addresses can't be enumerated.
    setSentTo(parsed.data.email);
  };

  if (sentTo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-serif text-4xl">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent an activation link to <strong className="text-foreground">{sentTo}</strong>.
          Click it to activate your account, then come back and sign in.
        </p>
        <p className="text-xs text-muted-foreground">
          Nothing arrived? Check your spam folder, or try signing up again in a few minutes.
        </p>
        <Button asChild className="rounded-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl mb-6">Join Lettuce Swap</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Display name</Label>
          <Input
            required
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Lisbon"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
