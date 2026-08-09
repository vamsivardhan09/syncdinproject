import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTwin } from "@/lib/twin-store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — control your AI Twin" },
      {
        name: "description",
        content:
          "Control how your SyncdIn AI Twin reaches out, which notifications you receive and what data it keeps.",
      },
      { property: "og:title", content: "SyncdIn settings" },
      {
        property: "og:description",
        content: "You decide how far your Twin is allowed to go on your behalf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

const toggles = [
  {
    id: "autonomy",
    label: "Let my Twin start conversations",
    hint: "Your Twin can open a thread when a match scores above 90%.",
    on: true,
  },
  {
    id: "digest",
    label: "Daily match digest",
    hint: "One email a day with the matches worth your attention.",
    on: true,
  },
  {
    id: "recruiters",
    label: "Visible to recruiters",
    hint: "Recruiter Twins can see your seniority and stack, never your contact details.",
    on: true,
  },
  {
    id: "opportunities",
    label: "Opportunity alerts",
    hint: "Ping me when a role or co-founder search matches my goals.",
    on: false,
  },
];

function Settings() {
  const navigate = useNavigate();
  const { reset } = useTwin();
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(toggles.map((t) => [t.id, t.on])),
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your Twin only does what you allow. Change any of this at any time.
        </p>
      </header>

      <section className="surface-card mt-8 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="relationship-emails" className="text-sm font-semibold">
              Relationship emails
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Email me when someone sends a connection request, accepts my request, messages me, or
              my Twin finds people worth meeting at an event. No marketing — only these events.
            </p>
          </div>
          <Switch
            id="relationship-emails"
            checked={emailPref}
            disabled={savingPref}
            onCheckedChange={(v) => {
              const previous = emailPref;
              setEmailPref(v);
              setSavingPref(true);
              void setEmailPreference(v)
                .then(() => toast.success(`Relationship emails ${v ? "on" : "off"}`))
                .catch((e: unknown) => {
                  setEmailPref(previous);
                  toast.error(e instanceof Error ? e.message : "Could not save that.");
                })
                .finally(() => setSavingPref(false));
            }}
          />
        </div>
      </section>

      <section className="surface-card mt-4 divide-y divide-border p-0">
        {toggles.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <Label htmlFor={t.id} className="text-sm font-semibold">
                {t.label}
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
            </div>
            <Switch
              id={t.id}
              checked={values[t.id] ?? false}
              onCheckedChange={(v) => {
                setValues((prev) => ({ ...prev, [t.id]: v }));
                toast.success(`${t.label} ${v ? "on" : "off"}`);
              }}
            />
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" /> Privacy
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Imported sources are used only to improve your matches. Your Twin never shares raw
            documents or chat history with other people.
          </p>
        </section>
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Bell aria-hidden="true" className="size-4 text-primary" /> Demo controls
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reset your Twin training progress to replay the onboarding journey.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                toast.success("Twin progress reset.");
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Reset progress
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut aria-hidden="true" className="size-4" /> Sign out
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
