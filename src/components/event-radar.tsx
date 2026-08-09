import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Handshake,
  Loader2,
  MapPin,
  MessageSquare,
  Radar,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TwinScreeningModal, type ScreeningTarget } from "@/components/twin-screening-modal";
import { photoFor } from "@/lib/demo-data";
import type { EventNetwork } from "@/lib/event-network";
import {
  activatePresence,
  presentAttendees,
  PRESENCE_WINDOW_MIN,
  rankForEvent,
  readPresence,
  type RadarMatch,
} from "@/lib/event-radar";
import { buildTwinVector } from "@/lib/matching";
import { recordActivities } from "@/lib/network-activity";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

const SCAN_STEPS = [
  "Scanning the SyncdIn network…",
  "Finding people at this event…",
  "Analyzing Twin compatibility…",
];

type Phase = "idle" | "active" | "scanning" | "results" | "error";

export function EventRadar({ network }: { network: EventNetwork }) {
  const { state, intelligence, connect, joinNetwork, hydrated } = useTwin();
  const joined = state.joinedNetworks.includes(network.code);

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [joining, setJoining] = useState(false);
  const [target, setTarget] = useState<ScreeningTarget | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const people = useMemo(() => presentAttendees(network), [network]);

  const ranked = useMemo<RadarMatch[]>(() => {
    const vector = buildTwinVector({
      connectedSources: state.connectedSources,
      trainedSources: state.trainedSources,
      connectionsMade: state.connectionsMade,
      intelligence,
    });
    return rankForEvent(vector, network, people);
  }, [people, network, state, intelligence]);

  const topFive = ranked.slice(0, 5);

  // Restore presence from the backend so Radar Active survives a refresh.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void readPresence(network.code).then((presence) => {
      if (cancelled) return;
      if (presence.active || joined) setPhase((p) => (p === "idle" ? "active" : p));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.code, hydrated]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      await activatePresence(network.code);
      joinNetwork(network.code);
      setPhase("active");
    } catch {
      setPhase("error");
    } finally {
      setJoining(false);
    }
  }, [network.code, joinNetwork]);

  const handleScan = useCallback(() => {
    setPhase("scanning");
    setStep(0);
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)), 800);
    window.setTimeout(() => {
      window.clearInterval(timer);
      if (topFive.length === 0) {
        setPhase("results");
        return;
      }
      setPhase("results");
      void recordActivities([
        {
          title: `Your Twin found ${topFive.length} people worth meeting at ${network.name}`,
          body: `Top match: ${topFive[0]!.candidate.name} at ${topFive[0]!.score}%.`,
        },
      ]);
      // One email per person per event: the radar result is worth returning for.
      void (async () => {
        const me = await currentUserId();
        if (!me) return;
        await sendRelationshipEmail({
          data: {
            kind: "event_match",
            recipientId: me,
            path: `/networks/${network.code}`,
            dedupeKey: `event_match:${me}:${network.code}`,
            eventTitle: network.name,
            reasons: topFive
              .slice(0, 3)
              .map((m) => `${m.candidate.name} — ${m.score}% fit${m.topTopic ? ` on ${m.topTopic}` : ""}`),
          },
        }).catch(() => undefined);
      })();
    }, 2500);
  }, [network.code, network.name, topFive]);

  async function handleConnect(match: RadarMatch, intro: string) {
    const result = await connect(match.candidate.id);
    if (!result.ok) return; // the store already surfaced the real error
    await recordActivities([
      {
        title: `${match.candidate.name.split(" ")[0]}'s Twin is ready to meet at ${network.name}`,
        body: intro.slice(0, 240),
      },
    ]);
    toast.success(`Connected with ${match.candidate.name}`, {
      description: "Saved to your connections — your Twin kept the suggested opener.",
    });
  }

  return (
    <>
      <header className="surface-card mt-3 overflow-hidden p-0">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-primary-soft text-primary">
              Live event
            </Badge>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" /> {network.location}
            </span>
            <span className="text-sm text-muted-foreground">· {network.dates}</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
              <Radar aria-hidden="true" className="size-3.5 text-primary" /> Twin Intelligence{" "}
              <span className="tabular-nums">{intelligence}%</span>
            </span>
          </div>

          <h1 className="mt-4 text-2xl leading-tight font-extrabold sm:text-3xl">{network.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{network.tagline}</p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {(network.topics ?? []).map((topic) => (
              <li
                key={topic}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {topic}
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted/70 p-3 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            Radar only scans SyncdIn members who explicitly joined this event network. No Bluetooth,
            no device or location scanning, and no access to the organiser's attendee list.
          </p>

          <div className="mt-6">
            {phase === "idle" ? (
              <Button size="lg" onClick={() => void handleJoin()} disabled={joining}>
                {joining ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <MapPin aria-hidden="true" className="size-4" />
                )}
                I'm at this event · Activate Radar
              </Button>
            ) : phase === "error" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle aria-hidden="true" className="size-4" /> Could not activate your
                  presence.
                </p>
                <Button variant="outline" onClick={() => void handleJoin()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-sm font-semibold text-success">
                  <span aria-hidden="true" className="relative flex size-2">
                    <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success/70" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  Radar Active
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users aria-hidden="true" className="size-3.5" /> {people.length} SyncdIn members
                  active in the last {PRESENCE_WINDOW_MIN} min
                </span>
                {phase !== "scanning" ? (
                  <Button size="lg" className="ml-auto" onClick={handleScan}>
                    <Radar aria-hidden="true" className="size-4" />
                    {phase === "results" ? "Scan again" : "Scan Event Radar"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {phase === "scanning" ? (
            <motion.div
              key="scan"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-primary-soft/40"
            >
              <ScanStage label={SCAN_STEPS[step] ?? SCAN_STEPS[SCAN_STEPS.length - 1]!} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      {phase === "results" ? (
        topFive.length === 0 ? (
          <section className="surface-card mt-6 p-10 text-center">
            <h2 className="text-lg font-bold">No SyncdIn members active right now</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Presence expires after {PRESENCE_WINDOW_MIN} minutes. Scan again later in the day, or
              browse the global network meanwhile.
            </p>
            <Button asChild className="mt-5">
              <Link to="/network">Browse my network</Link>
            </Button>
          </section>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card mt-6 flex flex-wrap items-center gap-3 border-primary/25 bg-primary-soft/40 p-5"
            >
              <p className="text-sm font-bold">
                Your Twin found {topFive.length} people worth meeting
              </p>
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link to="/network">
                  Continue in my network <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </motion.section>

            <h2 className="mt-7 text-xl font-extrabold sm:text-2xl">
              Top {topFive.length} people you should meet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked for this event: shared tracks and Twin compatibility, not follower counts.
            </p>

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              {topFive.map((match, i) => (
                <RadarCard
                  key={match.candidate.id}
                  rank={i + 1}
                  match={match}
                  connected={state.connectionsMade.includes(match.candidate.id)}
                  open={expanded === match.candidate.id}
                  onToggle={() =>
                    setExpanded((cur) => (cur === match.candidate.id ? null : match.candidate.id))
                  }
                  onScreen={() =>
                    setTarget({
                      person: match.candidate,
                      score: match.score,
                      reasons: match.reasons,
                      topTopic: match.topTopic,
                    })
                  }
                  onConnect={() => handleConnect(match, match.candidate.conversationStarter)}
                />
              ))}
            </section>
          </>
        )
      ) : null}

      <TwinScreeningModal
        target={target}
        networkName={network.name}
        connected={target ? state.connectionsMade.includes(target.person.id) : false}
        onClose={() => setTarget(null)}
        onConnect={(person, intro) => {
          const match = ranked.find((r) => r.candidate.id === person.id);
          if (match) handleConnect(match, intro);
        }}
      />
    </>
  );
}

/** The hero interaction: pulsing rings, rotating sweep and drifting nodes. */
function ScanStage({ label }: { label: string }) {
  const nodes = [
    { x: 22, y: 30 },
    { x: 70, y: 22 },
    { x: 84, y: 62 },
    { x: 36, y: 74 },
    { x: 58, y: 48 },
  ];

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8">
      <div className="relative size-40 sm:size-48" aria-hidden="true">
        {[0, 0.6, 1.2].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-0 rounded-full border border-primary/40"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
          />
        ))}
        <span className="absolute inset-[18%] rounded-full border border-primary/25" />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.53 0.23 287 / 0.35) 40deg, transparent 90deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        {nodes.map((n, i) => (
          <motion.span
            key={`${n.x}-${n.y}`}
            className="absolute size-2 rounded-full bg-primary shadow-sm"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.35], scale: [0.4, 1, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
        <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Radar className="size-4" />
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-sm font-semibold"
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function RadarCard({
  match,
  rank,
  connected,
  open,
  onToggle,
  onScreen,
  onConnect,
}: {
  match: RadarMatch;
  rank: number;
  connected: boolean;
  open: boolean;
  onToggle: () => void;
  onScreen: () => void;
  onConnect: () => void;
}) {
  const p = match.candidate;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(rank * 0.06, 0.3) }}
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
          <p className="text-xs text-success">Active {p.minutesAgo} min ago at this event</p>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-primary-soft font-mono text-primary">
          {match.score}%
        </Badge>
      </header>

      <ul className="mt-4 space-y-1.5">
        {match.reasons.slice(0, 2).map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-muted/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <MessageSquare aria-hidden="true" className="size-3.5" /> Suggested opener
        </p>
        <p className="mt-1 text-sm">{p.conversationStarter}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="focus-ring mt-4 flex items-center gap-1.5 self-start text-sm font-semibold text-primary"
      >
        Why this match?
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-border p-3 text-sm">
              <ul className="space-y-1.5">
                {match.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2 text-muted-foreground">
                <Handshake aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {p.suggestedCollaboration}
              </p>
              {match.eventTopics.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Event relevance: {match.eventTopics.join(", ")}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="flex-1" onClick={onScreen}>
          <Radar aria-hidden="true" className="size-4" /> Let our Twins talk
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
            "Connect"
          )}
        </Button>
      </div>
    </motion.article>
  );
}
