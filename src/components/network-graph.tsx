import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Globe2, MapPin, MessageCircle, Network, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoPeople, photoFor, type DemoPerson } from "@/lib/demo-data";
import { demoCoordsFor } from "@/lib/geo-locations";
import { getMyLocation } from "@/lib/map-location.functions";
import { rankCandidates } from "@/lib/matching";
import { resolvePeople } from "@/lib/people-directory";
import {
  currentUserId,
  displayName,
  initialsOf,
  listRealConnections,
  searchPeopleRanked,
  type PublicProfile,
} from "@/lib/real-people";
import { rankProfiles } from "@/lib/twin-compatibility";
import { useTwinVector } from "@/lib/use-twin-vector";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";
import { WORLD_PATH, projectLngLat } from "@/lib/world-map";

/** A node is either a real SyncdIn account or a demo persona. */
type NodePerson =
  | { kind: "real"; id: string; name: string; subtitle: string; photo: string | null; location: string | null }
  | { kind: "demo"; id: string; name: string; subtitle: string; photo: string; location: string | null };

type GraphItem = {
  person: NodePerson;
  score: number;
  connected: boolean;
  latitude: number | null;
  longitude: number | null;
};
/** A person with real stored coordinates, projected into map space. */
type MapNode = GraphItem & { x: number; y: number };

/** Cropped viewport of the 1000x500 equirectangular world (drops the poles). */
const VIEW = { x: 8, y: 46, w: 984, h: 372 };

function toPercent(lat: number, lng: number) {
  const { x, y } = projectLngLat(lng, lat);
  return {
    left: ((x - VIEW.x) / VIEW.w) * 100,
    top: ((y - VIEW.y) / VIEW.h) * 100,
  };
}

function toDemoNode(person: DemoPerson): NodePerson {
  return {
    kind: "demo",
    id: person.id,
    name: person.name,
    subtitle: `${person.role} · ${person.company}`,
    photo: photoFor(person.id),
    location: person.location,
  };
}

function toRealNode(profile: PublicProfile): NodePerson {
  return {
    kind: "real",
    id: profile.id,
    name: displayName(profile),
    subtitle: profile.headline || "Building their AI Twin",
    photo: profile.avatar_url,
    location: profile.location,
  };
}

function NodeAvatar({ person, className }: { person: NodePerson; className?: string }) {
  if (person.photo) {
    return <img src={person.photo} alt="" loading="lazy" className={cn("object-cover", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center bg-primary-soft text-xs font-bold text-primary",
        className,
      )}
    >
      {initialsOf(person.name)}
    </span>
  );
}

/**
 * SyncdIn geographic network map: the world your Twin is reaching into. Every
 * marker sits at a coordinate that was actually stored — real members use their
 * own saved position, demo personas use the coordinates on their seeded record.
 * Nobody is placed on the map without one.
 */
export function NetworkGraph() {
  const { state, intelligence } = useTwin();
  const { vector, profile: myProfile } = useTwinVector();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"all" | "connections">("all");
  const [realConnections, setRealConnections] = useState<PublicProfile[]>([]);
  const [realSuggested, setRealSuggested] = useState<PublicProfile[]>([]);
  const [myPoint, setMyPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const me = await currentUserId();
        if (!me) return;
        const connections = await listRealConnections();
        const discoverable = await searchPeopleRanked("", 24);
        if (!alive) return;
        const connectedIds = new Set(connections.map((c) => c.id));
        setRealConnections(connections);
        setRealSuggested(discoverable.filter((p) => p.id !== me && !connectedIds.has(p.id)));
      } catch {
        /* map still renders with the signal we already have */
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.connectionsMade, intelligence]);

  // Reuses the existing stored-location infrastructure — no new permission prompt.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const mine = await getMyLocation();
        if (!alive) return;
        if (typeof mine.latitude === "number" && typeof mine.longitude === "number") {
          setMyPoint({ latitude: mine.latitude, longitude: mine.longitude });
        }
      } catch {
        /* no stored position — we fall back to the centre of the network */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo<GraphItem[]>(() => {
    const ranked = rankCandidates(vector, demoPeople);
    const scoreOf = (id: string) => ranked.find((r) => r.candidate.id === id)?.score ?? 0;

    const rankedReal = rankProfiles(vector, realSuggested, {
      name: myProfile?.full_name ?? null,
      headline: myProfile?.headline ?? null,
    });

    const realConnected: GraphItem[] = realConnections.map((profile) => ({
      person: toRealNode(profile),
      score: profile.twin_intelligence ?? 0,
      connected: true,
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
    }));

    const demoConnected: GraphItem[] = resolvePeople(state.connectionsMade).map((person) => {
      const coords = demoCoordsFor(person.location);
      return {
        person: toDemoNode(person),
        score: scoreOf(person.id) || person.match,
        connected: true,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      };
    });

    const connectedIds = new Set([...realConnected, ...demoConnected].map((c) => c.person.id));

    if (mode === "connections") return [...realConnected, ...demoConnected];

    const realSuggestedItems: GraphItem[] = rankedReal
      .filter((entry) => !connectedIds.has(entry.profile.id))
      .slice(0, 6)
      .map((entry) => ({
        person: toRealNode(entry.profile),
        score: entry.brief.score,
        connected: false,
        latitude: entry.profile.latitude ?? null,
        longitude: entry.profile.longitude ?? null,
      }));

    const demoSuggested: GraphItem[] = ranked
      .filter((r) => !connectedIds.has(r.candidate.id))
      .slice(0, Math.max(8 - realSuggestedItems.length, 2))
      .map((r) => {
        const coords = demoCoordsFor(r.candidate.location);
        return {
          person: toDemoNode(r.candidate),
          score: r.score,
          connected: false,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        };
      });

    return [...realConnected, ...demoConnected, ...realSuggestedItems, ...demoSuggested];
  }, [vector, myProfile, realConnections, realSuggested, state.connectionsMade, mode]);

  const mapped = useMemo<MapNode[]>(
    () =>
      items
        .filter(
          (i): i is GraphItem & { latitude: number; longitude: number } =>
            typeof i.latitude === "number" && typeof i.longitude === "number",
        )
        .map((i) => {
          const { x, y } = projectLngLat(i.longitude, i.latitude);
          return { ...i, x, y };
        }),
    [items],
  );

  const unmapped = useMemo(
    () => items.filter((i) => typeof i.latitude !== "number" || typeof i.longitude !== "number"),
    [items],
  );

  /** "You" sits at your stored position, or at the centre of your network. */
  const you = useMemo(() => {
    if (myPoint) return projectLngLat(myPoint.longitude, myPoint.latitude);
    if (mapped.length > 0) {
      const sum = mapped.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }), { x: 0, y: 0 });
      return { x: sum.x / mapped.length, y: sum.y / mapped.length };
    }
    return { x: VIEW.x + VIEW.w / 2, y: VIEW.y + VIEW.h / 2 };
  }, [myPoint, mapped]);

  const arcs = useMemo(
    () =>
      mapped.map((n) => {
        const mx = (n.x + you.x) / 2;
        const my = (n.y + you.y) / 2 - Math.hypot(n.x - you.x, n.y - you.y) * 0.3;
        return { id: n.person.id, connected: n.connected, d: `M${n.x},${n.y} Q${mx},${my} ${you.x},${you.y}` };
      }),
    [mapped, you],
  );

  const active = items.find((n) => n.person.id === selected) ?? null;
  const connectedCount = items.filter((n) => n.connected).length;
  const locationCount = new Set(
    mapped.map((n) => `${n.latitude.toFixed(1)},${n.longitude.toFixed(1)}`),
  ).size;

  const youPos = toPercent(
    ((90 - (you.y / 500) * 180) as number),
    ((you.x / 1000) * 360 - 180) as number,
  );

  return (
    <section aria-labelledby="network-graph-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <h2 id="network-graph-heading" className="flex items-center gap-2 text-xl font-bold">
            <Network aria-hidden="true" className="size-5 text-primary" /> Your network graph
          </h2>
          <p className="text-sm text-muted-foreground">
            {locationCount === 0
              ? "Nobody on your map yet — your Twin places people the moment they share where they work from."
              : `Your Twin is connecting you across ${locationCount} location${
                  locationCount > 1 ? "s" : ""
                } · ${connectedCount} connected · ${items.length - connectedCount} Twin matches.`}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter the network map">
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
        className="relative w-full overflow-hidden border-t border-border bg-[radial-gradient(circle_at_50%_45%,var(--color-primary-soft),transparent_70%)]"
        role="group"
        aria-label="World map of the people in your AI Twin network"
      >
        <div className="relative aspect-[1000/430] w-full sm:aspect-[1000/380]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            preserveAspectRatio="none"
          >
            <path d={WORLD_PATH} className="fill-primary/12 stroke-primary/20" strokeWidth={0.4} />

            {arcs.map((arc, k) => (
              <g key={arc.id}>
                <path
                  d={arc.d}
                  fill="none"
                  className={arc.connected ? "stroke-primary/50" : "stroke-primary/25"}
                  strokeWidth={arc.connected ? 1.4 : 1}
                  strokeDasharray={arc.connected ? undefined : "5 5"}
                />
                <motion.path
                  d={arc.d}
                  fill="none"
                  className={arc.connected ? "stroke-primary" : "stroke-primary/60"}
                  strokeWidth={arc.connected ? 2 : 1.4}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 0.28, 0],
                    pathOffset: [0, 0.72, 1],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    delay: (k % 6) * 0.5,
                    ease: "easeInOut",
                  }}
                />
              </g>
            ))}
          </svg>

          {/* You / Your Twin — at your stored position. */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${youPos.left}%`, top: `${youPos.top}%` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-3 animate-ping rounded-full bg-primary/20"
            />
            <span className="relative grid size-12 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-lift sm:size-14 sm:text-sm">
              You
            </span>
          </div>

          {mapped.map((n, i) => {
            const pos = toPercent(n.latitude, n.longitude);
            return (
              <motion.button
                key={n.person.id}
                type="button"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => setSelected((cur) => (cur === n.person.id ? null : n.person.id))}
                aria-label={`${n.person.name}, ${n.person.subtitle}${
                  n.person.location ? `, ${n.person.location}` : ""
                }`}
                aria-pressed={selected === n.person.id}
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                className="focus-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              >
                <span className="relative block">
                  <NodeAvatar
                    person={n.person}
                    className={cn(
                      "size-8 rounded-full ring-2 transition-transform hover:scale-110 sm:size-10",
                      n.connected ? "ring-primary" : "ring-card",
                    )}
                  />
                  {n.connected ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-success"
                    />
                  ) : null}
                </span>
              </motion.button>
            );
          })}

          {mapped.length === 0 ? (
            <p className="absolute inset-x-6 bottom-6 text-center text-sm text-muted-foreground">
              No shared locations yet. Once you or the people your Twin finds save a location, they
              appear here — we never place anyone on a guessed spot.
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
                <NodeAvatar person={active.person} className="size-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{active.person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{active.person.subtitle}</p>
                  {active.person.location ? (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-3 text-primary" />
                      {active.person.location}
                    </p>
                  ) : null}
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
                  <Link to="/people/$id" params={{ id: active.person.id }}>
                    <UserRound aria-hidden="true" className="size-4" /> Profile
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 bg-card/70 px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Globe2 aria-hidden="true" className="size-3.5 text-primary" /> Legend
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full border-2 border-primary bg-card"
            />{" "}
            Connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-5 border-t-2 border-dashed border-primary/60" />{" "}
            Twin match
          </span>
        </div>
      </div>

      {unmapped.length > 0 ? (
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {unmapped.length} {unmapped.length === 1 ? "person hasn't" : "people haven't"} shared
            coordinates yet — open them to see the location they wrote.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unmapped.slice(0, 8).map((n) => (
              <button
                key={n.person.id}
                type="button"
                onClick={() => setSelected((cur) => (cur === n.person.id ? null : n.person.id))}
                className="focus-ring flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <NodeAvatar person={n.person} className="size-5 rounded-full" />
                <span className="max-w-[10rem] truncate">{n.person.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {connectedCount === 0
              ? "Your map fills up as your Twin learns you"
              : "Sharper signal, closer matches"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Right now your Twin is matching on {intelligence}% of your story. Add one more source and
            the people on this map change — closer roles, closer goals, fewer strangers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/twin">Improve my matches</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/network">Browse people</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
