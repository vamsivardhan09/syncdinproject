import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MessageCircle, Network, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoPeople, photoFor, type DemoPerson } from "@/lib/demo-data";
import { buildTwinVector, rankCandidates } from "@/lib/matching";
import { resolvePeople } from "@/lib/people-directory";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

type GraphNode = {
  person: DemoPerson;
  score: number;
  connected: boolean;
  x: number;
  y: number;
};

/** Stable pseudo-random in [0,1) so positions never reshuffle between renders. */
function seeded(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 1000) / 1000;
}

/** Places people on two abstract rings — no geography, no device location. */
function layout(people: { person: DemoPerson; score: number; connected: boolean }[]): GraphNode[] {
  const inner = people.filter((p) => p.connected);
  const outer = people.filter((p) => !p.connected);

  const place = (
    list: typeof people,
    radiusX: number,
    radiusY: number,
    offset: number,
  ): GraphNode[] =>
    list.map((item, i) => {
      const jitter = seeded(item.person.id);
      const angle = ((i + offset) / Math.max(list.length, 1)) * Math.PI * 2 + jitter * 0.5;
      const rx = radiusX * (0.85 + jitter * 0.3);
      const ry = radiusY * (0.85 + (1 - jitter) * 0.3);
      return {
        ...item,
        x: 50 + Math.cos(angle) * rx,
        y: 50 + Math.sin(angle) * ry,
      };
    });

  return [...place(inner, 21, 24, 0.25), ...place(outer, 39, 38, 0.5)];
}

/**
 * SyncdIn-native network visualisation: an abstract canvas of avatar nodes
 * joined by relationship lines. Positions are seeded, never geographic.
 */
export function NetworkGraph() {
  const { state, intelligence } = useTwin();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"all" | "connections">("all");

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

  const nodes = useMemo(() => {
    const ranked = rankCandidates(vector, demoPeople);
    const scoreOf = (id: string) =>
      ranked.find((r) => r.candidate.id === id)?.score ?? 0;

    const connected = resolvePeople(state.connectionsMade).map((person) => ({
      person,
      score: scoreOf(person.id) || person.match,
      connected: true,
    }));
    const connectedIds = new Set(connected.map((c) => c.person.id));

    const suggested =
      mode === "connections"
        ? []
        : ranked
            .filter((r) => !connectedIds.has(r.candidate.id))
            .slice(0, 8)
            .map((r) => ({ person: r.candidate, score: r.score, connected: false }));

    return layout([...connected, ...suggested]);
  }, [vector, state.connectionsMade, mode]);

  const active = nodes.find((n) => n.person.id === selected) ?? null;
  const connectedCount = nodes.filter((n) => n.connected).length;

  return (
    <section aria-labelledby="network-graph-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <h2 id="network-graph-heading" className="flex items-center gap-2 text-xl font-bold">
            <Network aria-hidden="true" className="size-5 text-primary" /> Your network graph
          </h2>
          <p className="text-sm text-muted-foreground">
            {connectedCount === 0
              ? "No connections yet — the outer ring is who your Twin thinks you should meet."
              : `${connectedCount} connection${connectedCount > 1 ? "s" : ""} · ${
                  nodes.length - connectedCount
                } suggested by your Twin.`}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter the network graph">
          {(["all", "connections"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {m === "all" ? "All signals" : "My connections"}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative h-[360px] w-full overflow-hidden border-t border-border bg-[radial-gradient(circle_at_50%_45%,var(--color-primary-soft),transparent_65%)] sm:h-[460px]"
        role="group"
        aria-label="Abstract graph of your AI Twin network"
      >
        {/* Soft grid + orbit rings, purely decorative. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at 50% 50%, black, transparent 78%)",
          }}
        />
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <ellipse cx="50" cy="50" rx="24" ry="26" className="fill-none stroke-primary/20" strokeWidth="0.15" />
          <ellipse cx="50" cy="50" rx="42" ry="41" className="fill-none stroke-primary/15" strokeWidth="0.15" />
          {nodes.map((n) => (
            <line
              key={n.person.id}
              x1="50"
              y1="50"
              x2={n.x}
              y2={n.y}
              className={n.connected ? "stroke-primary/45" : "stroke-primary/20"}
              strokeWidth={n.connected ? 0.3 : 0.2}
              strokeDasharray={n.connected ? undefined : "1.2 1.2"}
            />
          ))}
        </svg>

        {/* You, at the centre. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-3 animate-ping rounded-full bg-primary/15"
          />
          <span className="relative grid size-14 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lift">
            You
          </span>
        </div>

        {nodes.map((n, i) => (
          <motion.button
            key={n.person.id}
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
            onClick={() => setSelected((cur) => (cur === n.person.id ? null : n.person.id))}
            aria-label={`${n.person.name}, ${n.person.role} at ${n.person.company}`}
            aria-pressed={selected === n.person.id}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            className="focus-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            <span className="relative block">
              <img
                src={photoFor(n.person.id)}
                alt=""
                loading="lazy"
                className={cn(
                  "size-11 rounded-full object-cover ring-2 transition-transform hover:scale-110 sm:size-12",
                  n.connected ? "ring-primary" : "ring-card",
                )}
              />
              {n.connected ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card bg-success"
                />
              ) : null}
            </span>
          </motion.button>
        ))}

        {nodes.length === 0 ? (
          <p className="absolute inset-x-6 bottom-6 text-center text-sm text-muted-foreground">
            Connect with someone from Event Radar or your network and they appear here.
          </p>
        ) : null}

        {active ? (
          <motion.div
            key={active.person.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-3 bottom-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur sm:inset-x-auto sm:left-4 sm:w-72"
          >
            <div className="flex items-start gap-3">
              <img
                src={photoFor(active.person.id)}
                alt=""
                className="size-10 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{active.person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {active.person.role} · {active.person.company}
                </p>
                <Badge
                  variant="secondary"
                  className="mt-1 bg-primary-soft font-mono text-[10px] text-primary"
                >
                  {active.connected ? "Connected" : `${active.score}% match`}
                </Badge>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setSelected(null)}
                className="focus-ring rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to="/messages/$peer" params={{ peer: active.person.id }}>
                  <MessageCircle aria-hidden="true" className="size-4" /> Chat
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link to="/network">
                  <UserRound aria-hidden="true" className="size-4" /> Profile
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
