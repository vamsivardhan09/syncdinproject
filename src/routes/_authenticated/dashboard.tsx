import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  Flame,
  MessageCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NetworkMap } from "@/components/network-map";
import { WhileYouWereAway } from "@/components/while-you-were-away";
import { TwinMeter } from "@/components/twin-intelligence";
import { RecommendationCard } from "@/components/recommendation-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { demoPeople, personById, photoFor } from "@/lib/demo-data";
import {
  feedItems,
  recommendedActions,
  suggestedConversations,
  todaysOpportunities,
  trendingDiscussions,
} from "@/lib/feed-data";
import { buildTwinVector, rankCandidates } from "@/lib/matching";
import { nextBestAction } from "@/lib/twin-knowledge";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — what your AI Twin found today" },
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

/** Counts come from the demo network, not from invented traffic numbers. */
function demoStats() {
  const count = (kinds: string[]) => demoPeople.filter((p) => kinds.includes(p.kind)).length;
  return [
    {
      id: "recruiters",
      label: "Recruiters in your demo network",
      value: count(["Recruiter"]),
      icon: Briefcase,
      tone: "text-info",
    },
    {
      id: "founders",
      label: "Founder matches",
      value: count(["Founder", "Investor"]),
      icon: Users,
      tone: "text-primary",
    },
    {
      id: "mentors",
      label: "Mentors available",
      value: count(["Mentor"]),
      icon: BrainCircuit,
      tone: "text-success",
    },
    {
      id: "engineers",
      label: "Engineers worth meeting",
      value: count(["AI Engineer", "Software Engineer"]),
      icon: MessageCircle,
      tone: "text-warning",
    },
  ];
}


function Dashboard() {
  const { state, intelligence, dimensions, toggleConnection } = useTwin();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setName(
        (user?.user_metadata?.["full_name"] as string | undefined) ??
          (user?.user_metadata?.["name"] as string | undefined) ??
          user?.email?.split("@")[0] ??
          null,
      );
    });
  }, []);

  const firstName = useMemo(() => (name ? name.split(" ")[0] : "there"), [name]);
  const sourcesConnected = state.connectedSources.length + state.trainedSources.length;
  const stats = useMemo(() => demoStats(), []);
  const vector = useMemo(
     () =>
       buildTwinVector({
         connectedSources: state.connectedSources,
         trainedSources: state.trainedSources,
         connectionsMade: state.connectionsMade,
         intelligence,
       }),
     [state, intelligence],
   );
  const ranked = useMemo(() => rankCandidates(vector, demoPeople), [vector]);
  const worthMeeting = useMemo(() => ranked.filter((r) => r.score >= 75).length, [ranked]);
  const topMatches = useMemo(() => ranked.slice(0, 3).map((r) => r.candidate), [ranked]);
  const scoreFor = (id: string) => ranked.find((r) => r.candidate.id === id)?.score ?? 0;

  return (
    <AppShell>
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="surface-card overflow-hidden p-6 sm:p-8"
      >
        <p className="text-sm font-semibold text-primary">
          {greeting()}, {firstName}
        </p>
        <h1 className="mt-2 text-2xl leading-tight font-extrabold sm:text-3xl">
          Your Twin read{" "}
          <span className="brand-gradient-text">{demoPeople.length} profiles</span> in your network
          and found {worthMeeting} worth your time.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Nothing to set up first — this is live value. Every match below comes with the reason your
          Twin picked it, recomputed each time your Twin learns something new.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <s.icon aria-hidden="true" className={cn("size-4", s.tone)} />
              <p className="mt-2 text-2xl font-extrabold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.header>


      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <WhileYouWereAway />
          <NetworkMap />

          <section aria-labelledby="feed-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="feed-heading" className="text-xl font-bold">
                  Your intelligent feed
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ranked by Twin-to-Twin compatibility, not by who posted most recently.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/network">
                  See all matches <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>

            <ul className="mt-4 space-y-4">
              {feedItems.map((item, i) => {
                const person = personById(item.personId);
                if (!person) return null;
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                    className="surface-card p-5 transition-shadow hover:shadow-lift"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                        {item.kind}
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {item.match}% match
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-start gap-3">
                      <img
                        src={photoFor(person.id)}
                        alt={`${person.name}, ${person.role}`}
                        loading="lazy"
                        className="size-11 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold">{person.name}</h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {person.role} · {person.company} · {person.location}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed">{item.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {item.reasons.map((r) => (
                        <li key={r}>
                          <Badge variant="outline" className="font-normal">
                            {r}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild>
                        <Link to="/messages/$peer" params={{ peer: person.id }}>
                          <MessageCircle aria-hidden="true" className="size-4" /> Start conversation
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleConnection(person.id)}
                        aria-pressed={state.connectionsMade.includes(person.id)}
                      >
                        {state.connectionsMade.includes(person.id)
                          ? "Twins talking"
                          : "Let our Twins talk"}
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="top-matches">
            <h2 id="top-matches" className="text-xl font-bold">
              Highest-signal matches
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {topMatches.map((person, i) => (
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
        </div>

        <aside className="space-y-5">
          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <BrainCircuit aria-hidden="true" className="size-4 text-primary" /> Twin Intelligence
            </h2>
            <p className="brand-gradient-text mt-2 text-3xl font-extrabold tabular-nums">
              {intelligence}%
            </p>
            <p className="text-xs text-muted-foreground">
              {sourcesConnected === 0
                ? "Your Twin is still guessing. One source changes that."
                : `${sourcesConnected} source${sourcesConnected > 1 ? "s" : ""} connected.`}
            </p>
            <div className="mt-4 space-y-3">
              {dimensions.slice(0, 4).map((d, i) => (
                <TwinMeter key={d.key} label={d.label} value={d.value} delay={i * 0.06} compact />
              ))}
            </div>
            <Button asChild className="mt-4 w-full">
              <Link to="/onboarding">Improve my Twin</Link>
            </Button>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Flame aria-hidden="true" className="size-4 text-warning" /> Recommended actions
            </h2>
            <ul className="mt-3 space-y-2">
              {recommendedActions.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.to}
                    className="focus-ring flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm hover:bg-muted"
                  >
                    <span>
                      <span className="block font-semibold">{a.label}</span>
                      <span className="block text-xs text-muted-foreground">{a.reward}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Briefcase aria-hidden="true" className="size-4 text-info" /> Today's opportunities
            </h2>
            <ul className="mt-3 space-y-3">
              {todaysOpportunities.map((o) => (
                <li key={o.id} className="text-sm">
                  <p className="font-semibold">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.note}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <TrendingUp aria-hidden="true" className="size-4 text-success" /> Trending in your field
            </h2>
            <ul className="mt-3 space-y-3">
              {trendingDiscussions.map((d) => (
                <li key={d.id} className="text-sm">
                  <Badge variant="outline" className="mb-1 font-normal">
                    {d.topic}
                  </Badge>
                  <p className="font-semibold leading-snug">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.replies} replies · {d.voices}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <MessageCircle aria-hidden="true" className="size-4 text-primary" /> Conversations to
              start
            </h2>
            <ul className="mt-3 space-y-3">
              {suggestedConversations.map((c) => {
                const person = personById(c.personId);
                if (!person) return null;
                return (
                  <li key={c.id}>
                    <Link
                      to="/messages/$peer"
                      params={{ peer: person.id }}
                      className="focus-ring flex items-start gap-3 rounded-xl p-2 hover:bg-muted"
                    >
                      <img
                        src={photoFor(person.id)}
                        alt=""
                        loading="lazy"
                        className="size-8 rounded-full object-cover"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-semibold">{person.name}</span>
                        <span className="block text-xs text-muted-foreground">{c.line}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
