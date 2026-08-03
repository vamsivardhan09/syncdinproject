import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TwinIntelligencePanel } from "@/components/twin-intelligence";
import { RecommendationCard } from "@/components/recommendation-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { demoPeople } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SyncdIn AI networking" },
      {
        name: "description",
        content:
          "See what your AI Twin discovered today: recruiter matches, founder matches, opportunities and your Twin Intelligence score.",
      },
      { property: "og:title", content: "Your SyncdIn dashboard" },
      {
        property: "og:description",
        content: "Your AI Twin analysed hundreds of professionals today. Here's what mattered.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const navigate = useNavigate();
  const { state, hydrated, intelligence, dimensions, toggleConnection } = useTwin();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const label =
        (user?.user_metadata?.["full_name"] as string | undefined) ??
        (user?.user_metadata?.["name"] as string | undefined) ??
        user?.email?.split("@")[0] ??
        null;
      setName(label ?? null);
    });
  }, []);

  useEffect(() => {
    if (hydrated && !state.onboarded && state.connectedSources.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [hydrated, state, navigate]);

  const highlights = useMemo(() => demoPeople.slice(0, 3), []);
  const hasContext = state.connectedSources.length + state.trainedSources.length > 0;

  const cards = [
    { label: "Twin conversations", value: 24, icon: MessageCircle, note: "since yesterday" },
    { label: "Recruiters found", value: 4, icon: Briefcase, note: "actively hiring" },
    { label: "Founder matches", value: 2, icon: Users, note: "seeking collaborators" },
    { label: "Opportunities", value: 7, icon: Sparkles, note: "worth a reply" },
    { label: "Twin Intelligence", value: `${intelligence}%`, icon: BrainCircuit, note: "and rising" },
  ];

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {greeting()}, {name ?? <Skeleton className="inline-block h-8 w-32 align-middle" />}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your AI Twin analysed hundreds of professionals today and kept the ones that fit.
        </p>
      </header>

      <section aria-label="Today's summary" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="surface-card p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <card.icon aria-hidden="true" className="size-4.5" />
            </span>
            <p className="mt-3 text-2xl font-extrabold tabular-nums">{card.value}</p>
            <p className="text-sm font-medium">{card.label}</p>
            <p className="text-xs text-muted-foreground">{card.note}</p>
          </motion.div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <TwinIntelligencePanel intelligence={intelligence} dimensions={dimensions} />

        <section className="surface-card border-primary/25 bg-primary-soft/50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles aria-hidden="true" className="size-4 text-primary" /> Your Twin says
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            {hasContext
              ? "I understand your career and projects well. Teach me how you write and I'll open conversations in your own voice."
              : "I don't know enough about you yet. Give me one source and I'll start screening people tonight."}
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/twin">
              Improve my Twin <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Today's highest-signal matches</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every match explains itself — shared goals, complementary skills, and a first line.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/network">See all matches</Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {highlights.map((person, i) => (
            <RecommendationCard
              key={person.id}
              person={person}
              index={i}
              connected={state.connectionsMade.includes(person.id)}
              onConnect={() => toggleConnection(person.id)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
