import { motion } from "motion/react";
import { WORLD_HEIGHT, WORLD_PATH, WORLD_WIDTH } from "@/lib/world-map";

/** Cities shown as active Twin nodes, in equirectangular map coordinates. */
const NODES = [
  { label: "San Francisco", x: 165, y: 190 },
  { label: "New York", x: 275, y: 178 },
  { label: "London", x: 480, y: 145 },
  { label: "Berlin", x: 522, y: 143 },
  { label: "Bengaluru", x: 715, y: 258 },
  { label: "Singapore", x: 782, y: 285 },
  { label: "Sydney", x: 890, y: 370 },
  { label: "São Paulo", x: 350, y: 350 },
];

/** Twin-to-Twin links drawn as animated arcs between city nodes. */
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [1, 7],
  [0, 4],
];

function arc(a: (typeof NODES)[number], b: (typeof NODES)[number]) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.28;
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
}

/** Global AI-network illustration for the auth left panel. */
export function AuthWorldMap() {
  return (
    <div aria-hidden="true" className="relative w-full max-w-md">
      <svg
        viewBox={`60 90 880 330`}
        className="w-full"
        style={{ overflow: "visible" }}
        role="presentation"
      >
        <path
          d={WORLD_PATH}
          className="fill-primary-foreground/12"
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT}
        />

        {LINKS.map(([i, j], k) => (
          <g key={`link-${k}`}>
            <path
              d={arc(NODES[i], NODES[j])}
              fill="none"
              className="stroke-primary-foreground/20"
              strokeWidth={1}
            />
            <motion.path
              d={arc(NODES[i], NODES[j])}
              fill="none"
              className="stroke-primary-foreground/80"
              strokeWidth={1.6}
              strokeLinecap="round"
              initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
              animate={{ pathLength: [0, 0.35, 0], pathOffset: [0, 0.65, 1], opacity: [0, 1, 0] }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                delay: k * 0.45,
                ease: "easeInOut",
              }}
            />
          </g>
        ))}

        {NODES.map((n, i) => (
          <g key={n.label}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={3}
              className="fill-primary-foreground/25"
              animate={{ r: [3, 13], opacity: [0.5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
            />
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={2.6}
              className="fill-primary-foreground"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
