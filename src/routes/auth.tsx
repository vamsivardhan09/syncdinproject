import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to SyncdIn — Start your AI Twin" },
      {
        name: "description",
        content:
          "Sign in with Google, a magic link or email and password, then build your SyncdIn AI Twin in about 60 seconds.",
      },
      { property: "og:title", content: "Sign in to SyncdIn" },
      {
        property: "og:description",
        content: "Google sign-in is the fastest path into your AI Twin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Pending = null | "google" | "magic" | "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending>(null);
  const [magicEmail, setMagicEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/onboarding", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/onboarding", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function withGoogle() {
    setPending("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't complete. Please try again.");
      setPending(null);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding", replace: true });
  }

  async function withMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setPending("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Magic link sent — check your inbox to meet your Twin.");
  }

  async function withPassword(mode: "signin" | "signup", e: React.FormEvent) {
    e.preventDefault();
    setPending(mode);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setPending(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.success("Account created — confirm your email to start building your Twin.");
        return;
      }
      navigate({ to: "/onboarding", replace: true });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <div className="canvas-glow flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl">
        <Link
          to="/"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" /> Back
        </Link>
      </div>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="surface-card mt-4 w-full max-w-xl p-7 sm:p-10"
      >
        <div className="flex justify-center">
          <BrandLogo className="text-xl" />
        </div>

        <h1 className="mt-8 text-center text-2xl font-extrabold sm:text-3xl">
          Meet the network that works while you sleep
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Google sign-in is the fastest path — you'll have an AI Twin in about a minute.
        </p>

        <Button
          onClick={withGoogle}
          variant="outline"
          className="mt-7 h-12 w-full text-base font-semibold"
          disabled={pending !== null}
        >
          {pending === "google" ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
          )}
          Continue with Google
        </Button>

        <Divider>or use a magic link</Divider>

        <form onSubmit={withMagicLink} className="space-y-3">
          <Label htmlFor="magic-email" className="sr-only">
            Email for magic link
          </Label>
          <Input
            id="magic-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            className="h-12"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="h-12 w-full" disabled={pending !== null}>
            {pending === "magic" ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Mail aria-hidden="true" className="size-4" />
            )}
            Email me a magic link
          </Button>
        </form>

        <Divider>or use a password</Divider>

        <form className="space-y-3" onSubmit={(e) => withPassword("signin", e)}>
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            className="h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            placeholder="password (8+ characters)"
            className="h-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="submit" variant="secondary" className="h-12" disabled={pending !== null}>
              {pending === "signin" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12"
              disabled={pending !== null}
              onClick={(e) => void withPassword("signup", e)}
            >
              {pending === "signup" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              Create account
            </Button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-primary uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
