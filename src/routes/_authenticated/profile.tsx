import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { TwinIntelligencePanel } from "@/components/twin-intelligence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { importSources, trainingSources } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — what your AI Twin knows" },
      {
        name: "description",
        content:
          "Review the profile your SyncdIn AI Twin represents you with: name, headline, location and the sources it learned from.",
      },
      { property: "og:title", content: "Your SyncdIn profile" },
      {
        property: "og:description",
        content: "Your Twin introduces you using exactly this profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { intelligence, dimensions, state } = useTwin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setEmail(auth.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, headline, location")
        .eq("id", auth.user.id)
        .maybeSingle();
      setFullName(data?.full_name ?? "");
      setHeadline(data?.headline ?? "");
      setLocation(data?.location ?? "");
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: auth.user.id,
      full_name: fullName,
      headline,
      location,
      twin_intelligence: intelligence,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved — your Twin will use this from now on.");
  }

  const connected = [...importSources, ...trainingSources].filter(
    (s) => state.connectedSources.includes(s.id) || state.trainedSources.includes(s.id),
  );

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">My profile</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          This is what your Twin says about you when it introduces you to someone new.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card p-6">
          <h2 className="text-lg font-bold">Details</h2>
          {loading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading your profile…
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={save}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} readOnly className="h-11 bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Senior AI Engineer · building inference infrastructure"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Remote · Berlin, DE"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="h-11" disabled={saving}>
                {saving ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="size-4" />
                )}
                Save profile
              </Button>
            </form>
          )}
        </section>

        <div className="space-y-6">
          <TwinIntelligencePanel intelligence={intelligence} dimensions={dimensions} />
          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles aria-hidden="true" className="size-4 text-primary" /> Sources your Twin reads
            </h2>
            {connected.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing connected yet — your Twin is guessing.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {connected.map((s) => (
                  <Badge key={s.id} variant="secondary" className="bg-success-soft text-success">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/onboarding">Add another source</Link>
            </Button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
