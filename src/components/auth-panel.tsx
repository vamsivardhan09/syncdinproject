import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/brand-logo";
import { AuthWorldMap } from "@/components/auth-world-map";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pending = null | "google" | "password";

/** Calm 35/65 split auth surface shared by /signin and /signup. */
export function AuthPanel({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending>(null);
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
    <div className="grid min-h-screen lg:grid-cols-[35fr_65fr]">
      <aside className="brand-deep-bg relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        <div aria-hidden="true" className="brand-grid-overlay absolute inset-0 opacity-40" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-20 size-[26rem] rounded-full bg-primary/20 blur-3xl"
        />

        <BrandLogo className="relative z-10 text-xl [&_span]:text-primary-foreground" />

        <div className="relative z-10">
          <AuthWorldMap />
          <h2 className="mt-10 text-[2.1rem] leading-[1.12] font-semibold tracking-tight">
            Connected
            <br />
            across the world.
          </h2>
          <p className="mt-4 max-w-xs text-sm/relaxed text-primary-foreground/65">
            Your AI Twin talks to Twins in every timezone and surfaces only the people worth your
            time.
          </p>
        </div>


        <p className="relative z-10 text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} SyncdIn
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[26rem]">
          <Link
            to="/"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" /> Back
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-8 rounded-2xl border border-border/60 bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_40px_-12px_rgba(16,24,40,0.12)] sm:p-10"
          >
            <div className="lg:hidden">
              <BrandLogo className="text-lg" />
            </div>

            <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight lg:mt-0">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignUp
                ? "Your Twin starts matching in about 60 seconds."
                : "Sign in to see what your Twin found."}
            </p>

            <Button
              onClick={withGoogle}
              variant="outline"
              className="mt-8 h-11 w-full text-[0.95rem] font-medium transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0"
              disabled={pending !== null}
            >
              {pending === "google" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Continue with Google
            </Button>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={withPassword}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  {isSignUp ? null : (
                    <Link
                      to="/forgot-password"
                      className="focus-ring rounded text-xs font-medium text-muted-foreground hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  className="h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-[0.95rem] font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
                disabled={pending !== null}
              >
                {pending === "password" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                {isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>
          </motion.div>

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
                  Create account
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
