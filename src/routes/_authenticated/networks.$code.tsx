import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Handshake,
  Loader2,
  Radar,
  Sparkle,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TwinScreeningModal, type ScreeningTarget } from "@/components/twin-screening-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { photoFor } from "@/lib/demo-data";
import {
  attendeeFilters,
  attendeesFor,
  networkByCode,
  type Attendee,
} from "@/lib/event-network";
import { buildTwinVector, rankCandidates } from "@/lib/matching";
import { diffTopScores, recordActivities, saveConnection } from "@/lib/network-activity";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/networks/$code")({
  loader: ({ params }) => {
    const network = networkByCode(params.code);
    if (!network) throw notFound();
    return { network };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Network unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.network.name} — your Twin's shortlist`;
    const description = `Your AI Twin read all ${loaderData.network.attendeeCount} people in ${loaderData.network.name} and shortlisted the five worth your time, with reasons.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: NetworkRoom,
});

const ANALYSIS_STEPS = [
  "Reading attendee Twin profiles",
  "Matching against your goals and projects",
  "Removing low-signal overlaps",
  "Ranking the people worth your time",
];

type Ranked = { candidate: Attendee; score: number; reasons: string[]; topTopic: string | null };

function NetworkRoom() {
  const { network } = Route.useLoaderData();
  const { state, intelligence, connect, joinNetwork, hydrated } = useTwin();
  const [phase, setPhase] = useState<"analyzing" | "ready">("analyzing");
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);
  const [target, setTarget] = useState<ScreeningTarget | null>(null);

  const attendees = useMemo(() => attendeesFor(network), [network]);

  const ranked = useMemo(() => {
    const vector = buildTwinVector({
      connectedSources: state.connectedSources,
      trainedSources: state.trainedSources,
      connectionsMade: state.connectionsMade,
      intelligence,
    });
    return rankCandidates(vector, attendees) as Ranked[];
  }, [attendees, state, intelligence]);

  const filtered = useMemo(
    () => (filter === "All" ? ranked : ranked.filter((r) => r.candidate.kind === filter)),
    [ranked, filter],
  );
  const topFive = filtered.slice(0, 5);

  // Animate the analysis pass, then record what the Twin found for the retention loop.
  useEffect(() => {
    if (!hydrated) return;
    setPhase("analyzing");
    setStep(0);
    const timer = window.setInterval(() => setStep((s) => s + 1), 620);
    const done = window.setTimeout(() => {
      window.clearInterval(timer);
      setPhase("ready");
      joinNetwork(network.code);

      const top = ranked
        .slice(0, 5)
        .map((r) => ({ id: r.candidate.id, name: r.candidate.name, score: r.score }));
      const { improvements, firstSeen } = diffTopScores(network.code, top);
      const activity: { title: string; body: string }[] = [];
      if (firstSeen && top.length > 0) {
        activity.push({
          title: `Your Twin found ${top.length} people worth meeting in ${network.name}`,
          body: `Top match: ${top[0]!.name} at ${top[0]!.score}%.`,
        });
      }
      for (const imp of improvements.slice(0, 2)) {
        activity.push({
          title: `1 match improved from ${imp.from}% → ${imp.to}%`,
          body: `${imp.name} moved up after your Twin learned more about you.`,
        });
      }
      void recordActivities(activity);
    }, ANALYSIS_STEPS.length * 620 + 320);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(done);
    };
    // Re-runs only when the network changes; ranked is read at completion time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.code, hydrated]);

  function handleConnect(person: Attendee, intro: string) {
    connect(person.id);
    void saveConnection(person.id);
    void recordActivities([
      {
        title: `${person.name.split(" ")[0]}'s Twin suggested a collaboration`,
        body: intro.slice(0, 240),
      },
    ]);
    toast.success(`Connected with ${person.name}`, {
      description: "Your Twin saved the suggested introduction.",
    });
  }

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/networks">
          <ArrowLeft aria-hidden="true" className="size-4" /> All networks
        </Link>
      </Button>

      <header className="surface-card mt-3 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-primary-soft text-primary">
            {network.kind}
          </Badge>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users aria-hidden="true" className="size-3.5" /> {network.attendeeCount} attendees
          </span>
          <span className="text-sm text-muted-foreground">· {network.dates}</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
            <Radar aria-hidden="true" className="size-3.5 text-primary" /> Twin Intelligence{" "}
            <span className="tabular-nums">{intelligence}%</span>
          </span>
        </div>
        <h1 className="mt-4 text-2xl leading-tight font-extrabold sm:text-3xl">{network.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{network.tagline}</p>

        <AnimatePresence mode="wait">
          {phase === "analyzing" ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-2xl border border-primary/20 bg-primary-soft/50 p-5"
            >
              <p className="flex items-center gap-2 text-sm font-bold">
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
                Your Twin is analyzing {network.attendeeCount} attendees
              </p>
              <ul className="mt-3 space-y-2">
                {ANALYSIS_STEPS.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {i < step ? (
                      <Check aria-hidden="true" className="size-4 text-success" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border border-primary/40"
                      />
                    )}
                    <span className={cn(i > step && "text-muted-foreground")}>{label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border border-border bg-muted/50 p-5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <Check aria-hidden="true" className="size-4" /> Your Twin analyzed the network
              </p>
              <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">
                {topFive.length} people worth meeting
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Out of {filtered.length} {filter === "All" ? "attendees" : `${filter}s`}. Every pick
                below comes with the evidence your Twin used.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter attendees by type">
        {attendeeFilters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {phase === "ready" ? (
        <>
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {topFive.map((r, i) => (
              <MatchCard
                key={r.candidate.id}
                rank={i + 1}
                ranked={r}
                connected={state.connectionsMade.includes(r.candidate.id)}
                onScreen={() =>
                  setTarget({
                    person: r.candidate,
                    score: r.score,
                    reasons: r.reasons,
                    topTopic: r.topTopic,
                  })
                }
                onConnect={() => handleConnect(r.candidate, r.candidate.conversationStarter)}
              />
            ))}
            {topFive.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {filter} profiles in this network. Try another filter.
              </p>
            ) : null}
          </section>

          <section className="mt-7">
            <Button variant="outline" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? "Hide all attendees" : `Show all ${filtered.length} attendees`}
              <ChevronDown
                aria-hidden="true"
                className={cn("size-4 transition-transform", showAll && "rotate-180")}
              />
            </Button>

            {showAll ? (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((r) => (
                  <li
                    key={r.candidate.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <img
                      src={photoFor(r.candidate.id)}
                      alt={r.candidate.name}
                      loading="lazy"
                      className="size-9 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.candidate.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.candidate.role} · {r.candidate.company}
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {r.score}%
                    </span>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </section>

          <section className="surface-card mt-7 border-primary/25 bg-primary-soft/40 p-6">
            <h2 className="text-base font-bold">Why this matters</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Instead of asking you to network with {network.attendeeCount} people, SyncdIn lets your
              Twin narrow the room to the people most worth your time. Scores here are computed from
              what your Twin actually knows about you — connect another source and this shortlist
              changes.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Attendees are seeded demo profiles for this prototype; the matching, screening and
              follow-up behaviour is real.
            </p>
          </section>
        </>
      ) : null}

      <TwinScreeningModal
        target={target}
        networkName={network.name}
        connected={target ? state.connectionsMade.includes(target.person.id) : false}
        onClose={() => setTarget(null)}
        onConnect={(person, intro) => handleConnect(person, intro)}
      />
    </AppShell>
  );
}

function MatchCard({
  ranked,
  rank,
  connected,
  onScreen,
  onConnect,
}: {
  ranked: Ranked;
  rank: number;
  connected: boolean;
  onScreen: () => void;
  onConnect: () => void;
}) {
  const p = ranked.candidate;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(rank * 0.06, 0.3) }}
      className="surface-card flex h-full flex-col p-5 transition-shadow hover:shadow-lift"
    >
      <header className="flex items-start gap-3">
        <span className="relative shrink-0">
          <img
            src={photoFor(p.id)}
            alt={`${p.name}, ${p.role} at ${p.company}`}
            loading="lazy"
            className="size-11 rounded-xl object-cover"
          />
          <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
            {rank}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{p.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {p.role} · {p.company}
          </p>
          <p className="truncate text-xs text-muted-foreground">{p.location}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-primary-soft font-mono text-primary">
          {ranked.score}%
        </Badge>
      </header>

      <ul className="mt-4 space-y-1.5">
        {ranked.reasons.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-muted/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Handshake aria-hidden="true" className="size-3.5" /> What you could do together
        </p>
        <p className="mt-1 text-sm">{p.suggestedCollaboration}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="flex-1" onClick={onScreen}>
          <Sparkle aria-hidden="true" className="size-4" /> Let our Twins talk
        </Button>
        <Button
          variant={connected ? "secondary" : "outline"}
          className="flex-1"
          onClick={onConnect}
          aria-pressed={connected}
        >
          {connected ? (
            <>
              <Check aria-hidden="true" className="size-4" /> Connected
            </>
          ) : (
            "Save / Connect"
          )}
        </Button>
      </div>
    </motion.article>
  );
}
