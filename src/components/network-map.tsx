import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Globe2, MapPin, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { demoPeople, photoFor, type DemoPerson } from "@/lib/demo-data";
import { resolveLocation } from "@/lib/geo";
import { WORLD_HEIGHT, WORLD_PATH, WORLD_WIDTH, projectLngLat } from "@/lib/world-map";
import { cn } from "@/lib/utils";

type Placed = DemoPerson & { x: number; y: number };

const accentVar: Record<DemoPerson["accent"], string> = {
  violet: "var(--primary)",
  blue: "var(--info)",
  green: "var(--success)",
  amber: "var(--warning)",
};

function place(person: DemoPerson, i: number): Placed | null {
  const coords = resolveLocation(person.location);
  if (!coords) return null;
  const { x, y } = projectLngLat(coords.lng, coords.lat);
  // Nudge overlapping cities apart so co-located twins stay readable.
  const spread = i % 2 === 0 ? 1 : -1;
  return { ...person, x: x + spread * (i % 3) * 4, y: y + spread * (i % 2) * 5 };
}

export function NetworkMap() {
  const [kind, setKind] = useState<string>("All");
  const [active, setActive] = useState<string | null>(null);
  const [me, setMe] = useState<{ x: number; y: number; label: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const set = (label: string, lat: number, lng: number) => {
      if (cancelled) return;
      const { x, y } = projectLngLat(lng, lat);
      setMe({ x, y, label });
    };

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("location")
        .eq("id", auth.user.id)
        .maybeSingle();
      const coords = resolveLocation(data?.location);
      if (coords) {
        set(data?.location ?? "Your location", coords.lat, coords.lng);
        return;
      }
      // No saved location — detect it from the browser instead.
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => set("Detected location", pos.coords.latitude, pos.coords.longitude),
          () => undefined,
          { timeout: 8000 },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const placed = useMemo(
    () => demoPeople.map(place).filter((p): p is Placed => p !== null),
    [],
  );
  const kinds = useMemo(
    () => ["All", ...Array.from(new Set(placed.map((p) => p.kind)))],
    [placed],
  );
  const visible = kind === "All" ? placed : placed.filter((p) => p.kind === kind);
  const activePerson = visible.find((p) => p.id === active) ?? null;

  return (
    <section aria-labelledby="network-map-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-4">
        <div>
          <h2 id="network-map-heading" className="flex items-center gap-2 text-xl font-bold">
            <Globe2 aria-hidden="true" className="size-5 text-primary" /> Your network on the map
          </h2>
          <p className="text-sm text-muted-foreground">
            {visible.length} matches live in {new Set(visible.map((p) => p.location)).size} cities
            {me ? ` — signals routed to ${me.label}` : ""}.
          </p>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn(
                  "focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  kind === k
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {k}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
          role="img"
          aria-label="World map showing where the people in your AI Twin network are located"
          className="block w-full bg-muted/40"
        >
          <defs>
            <radialGradient id="map-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
            {visible.map((p) => (
              <clipPath key={p.id} id={`clip-${p.id}`}>
                <circle cx={p.x} cy={p.y} r="13" />
              </clipPath>
            ))}
          </defs>

          <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#map-glow)" />
          <path
            d={WORLD_PATH}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />

          {me
            ? visible.map((p, i) => {
                const mid = {
                  x: (me.x + p.x) / 2,
                  y: (me.y + p.y) / 2 - Math.abs(p.x - me.x) * 0.22 - 12,
                };
                return (
                  <motion.path
                    key={`arc-${p.id}`}
                    d={`M ${me.x} ${me.y} Q ${mid.x} ${mid.y} ${p.x} ${p.y}`}
                    fill="none"
                    stroke={accentVar[p.accent]}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeDasharray="4 8"
                    opacity={0.55}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1, strokeDashoffset: [0, -24] }}
                    transition={{
                      pathLength: { duration: 1.1, delay: 0.2 + i * 0.08 },
                      strokeDashoffset: {
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0.2 + i * 0.08,
                      },
                    }}
                  />
                );
              })
            : null}

          {visible.map((p, i) => (
            <motion.g
              key={p.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.09, type: "spring", stiffness: 220, damping: 18 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: "pointer" }}
              onMouseEnter={() => setActive(p.id)}
              onFocus={() => setActive(p.id)}
              onClick={() => setActive(p.id)}
              tabIndex={0}
              role="button"
              aria-label={`${p.name}, ${p.role} in ${p.location}, ${p.match}% match`}
            >
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="13"
                fill={accentVar[p.accent]}
                opacity={0.35}
                animate={{ r: [13, 26, 13], opacity: [0.35, 0, 0.35] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  delay: i * 0.35,
                  ease: "easeOut",
                }}
              />
              <motion.g
                animate={{ y: [0, -2.5, 0] }}
                transition={{ duration: 3 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14.5"
                  fill="var(--card)"
                  stroke={accentVar[p.accent]}
                  strokeWidth="1.5"
                />
                <image
                  href={photoFor(p.id)}
                  x={p.x - 13}
                  y={p.y - 13}
                  width="26"
                  height="26"
                  clipPath={`url(#clip-${p.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              </motion.g>
            </motion.g>
          ))}

          {me ? (
            <g>
              <motion.circle
                cx={me.x}
                cy={me.y}
                r="8"
                fill="var(--primary)"
                opacity={0.3}
                animate={{ r: [8, 30, 8], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
              <circle
                cx={me.x}
                cy={me.y}
                r="6"
                fill="var(--primary)"
                stroke="var(--card)"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>

        {activePerson ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-4 bottom-4 left-4 max-w-sm rounded-2xl border border-border bg-card/95 p-4 shadow-lift backdrop-blur sm:left-auto"
          >
            <div className="flex items-start gap-3">
              <img
                src={photoFor(activePerson.id)}
                alt={activePerson.name}
                loading="lazy"
                className="size-10 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{activePerson.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activePerson.role} · {activePerson.company}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3" /> {activePerson.location}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto font-mono">
                {activePerson.match}%
              </Badge>
            </div>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/messages/$peer" params={{ peer: activePerson.id }}>
                <MessageCircle aria-hidden="true" className="size-4" /> Open Twin chat
              </Link>
            </Button>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
