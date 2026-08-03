import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function TwinMeter({
  label,
  value,
  delay = 0,
  compact = false,
}: {
  label: string;
  value: number;
  delay?: number;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "font-medium text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="brand-gradient-bg h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export function TwinIntelligencePanel({
  intelligence,
  dimensions,
  className,
}: {
  intelligence: number;
  dimensions: { key: string; label: string; value: number }[];
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-6", className)} aria-labelledby="twin-intelligence">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="twin-intelligence" className="text-lg font-bold">
            AI Twin Intelligence
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How well your twin can represent you in conversations with other twins.
          </p>
        </div>
        <div className="text-right">
          <motion.p
            key={intelligence}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="brand-gradient-text text-3xl font-extrabold tabular-nums"
          >
            {intelligence}%
          </motion.p>
          <p className="text-xs font-medium text-muted-foreground">Overall</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {dimensions.map((dim, i) => (
          <TwinMeter key={dim.key} label={dim.label} value={dim.value} delay={i * 0.07} />
        ))}
      </div>
    </section>
  );
}
