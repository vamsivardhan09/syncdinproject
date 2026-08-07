import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/auth/linkedin/complete")({
  ssr: false,
  component: LinkedInComplete,
  head: () => ({
    meta: [
      { title: "Finishing LinkedIn sign-in · SyncdIn" },
      {
        name: "description",
        content: "Completing your LinkedIn sign-in and syncing your profile into SyncdIn.",
      },
      { property: "og:title", content: "Finishing LinkedIn sign-in · SyncdIn" },
      {
        property: "og:description",
        content: "Completing your LinkedIn sign-in and syncing your profile into SyncdIn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LinkedInComplete() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in with LinkedIn…");

  useEffect(() => {
    let cancelled = false;

    async function settle() {
      // The Supabase client picks the tokens out of the URL on load.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!cancelled) {
        setMessage("That sign-in link expired. Please try LinkedIn again.");
        navigate({ to: "/signin", replace: true });
      }
    }

    void settle();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandLogo className="text-xl" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        <h1 className="text-sm font-medium">{message}</h1>
      </div>
    </main>
  );
}
