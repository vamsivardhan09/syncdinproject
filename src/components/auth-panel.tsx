import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Check, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pending = null | "google" | "magic" | "password";

const proof = [
  "12,400+ professionals have an AI Twin",
  "Twins run 3.2M matches every week",
  "Average time to first great match: 61 seconds",
];

/** Split-screen auth surface shared by /signin and /signup. */
export function AuthPanel({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending>(null);
  const [magicEmail, setMagicEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = mode === "signup";

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
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
    navigate({ to: "/dashboard", replace: true });
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

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setPending("password");

    if (isSignUp) {
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
        toast.success("Account created — confirm your email to meet your Twin.");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="brand-gradient-bg relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        <BrandLogo className="text-xl [&_span]:text-primary-foreground" />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold">
            Your AI Twin networks while you sleep.
          </h2>
          <p className="mt-4 text-base/relaxed text-primary-foreground/80">
            SyncdIn Twins talk to each other, filter the noise and only surface the people worth your
            time — with the reason attached.
          </p>
          <ul className="mt-8 space-y-3">
            {proof.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="text-primary-foreground/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-primary-foreground/70">
          No cold outreach. No endless scrolling. Just introductions that make sense.
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl"
        />
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" /> Back
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-6"
          >
            <div className="lg:hidden">
              <BrandLogo className="text-xl" />
            </div>

            <h1 className="mt-6 text-3xl font-extrabold">
              {isSignUp ? "Join the network of the future" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignUp
                ? "Create your account and your Twin starts matching in about 60 seconds."
                : "Sign in and see what your Twin found while you were away."}
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
              <Button
                type="submit"
                variant="secondary"
                className="h-12 w-full"
                disabled={pending !== null}
              >
                {pending === "magic" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Mail aria-hidden="true" className="size-4" />
                )}
                Email me a magic link
              </Button>
            </form>

            <Divider>or use a password</Divider>

            <form className="space-y-3" onSubmit={withPassword}>
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="password (8+ characters)"
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" className="h-12 w-full" disabled={pending !== null}>
                {pending === "password" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                {isSignUp ? "Create my account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <Link to="/signin" className="focus-ring rounded font-semibold text-primary">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New to SyncdIn?{" "}
                  <Link to="/signup" className="focus-ring rounded font-semibold text-primary">
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </motion.div>
        </div>
      </main>
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
