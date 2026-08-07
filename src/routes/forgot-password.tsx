import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your SyncdIn password" },
      {
        name: "description",
        content: "Enter your email and we'll send you a secure link to set a new SyncdIn password.",
      },
      { property: "og:title", content: "Reset your SyncdIn password" },
      {
        property: "og:description",
        content: "Get a secure link to set a new password for your SyncdIn account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <Link
          to="/signin"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to sign in
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 rounded-2xl border border-border/60 bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_40px_-12px_rgba(16,24,40,0.12)] sm:p-10"
        >
          <BrandLogo className="text-lg" />
          <h1 className="mt-6 text-[1.6rem] font-semibold tracking-tight">Forgot password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sent
              ? "Check your inbox for the reset link. It expires in one hour."
              : "We'll email you a secure link to set a new password."}
          </p>

          {sent ? null : (
            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
                disabled={pending}
              >
                {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}
