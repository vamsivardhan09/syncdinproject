import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new SyncdIn password" },
      {
        name: "description",
        content: "Choose a new password for your SyncdIn account and get back to your AI Twin.",
      },
      { property: "og:title", content: "Set a new SyncdIn password" },
      {
        property: "og:description",
        content: "Choose a new password and get back to your AI Twin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border/60 bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_40px_-12px_rgba(16,24,40,0.12)] sm:p-10"
        >
          <BrandLogo className="text-lg" />
          <h1 className="mt-6 text-[1.6rem] font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose something at least 8 characters long.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
              disabled={pending}
            >
              {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
