import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Bell, Check, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listUnreadActivity,
  markActivityRead,
  type TwinActivity,
} from "@/lib/network-activity";

/**
 * Retention hook: what the user's Twin did since their last visit.
 * Reads real rows from the notifications table (own rows via RLS).
 */
export function WhileYouWereAway() {
  const [items, setItems] = useState<TwinActivity[] | null>(null);

  useEffect(() => {
    let active = true;
    void listUnreadActivity(4).then((rows) => {
      if (active) setItems(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!items || items.length === 0) return null;

  async function dismiss() {
    const ids = items!.map((i) => i.id);
    setItems([]);
    await markActivityRead(ids);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="While you were away"
      className="surface-card border-primary/25 bg-primary-soft/40 p-5"
    >
      <header className="flex items-center gap-2">
        <Bell aria-hidden="true" className="size-4 text-primary" />
        <h2 className="text-sm font-bold">While you were away</h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
          {items.length} new
        </span>
      </header>

      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-sm">
            <Radar aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold">{item.title}</span>
              {item.body ? (
                <span className="block text-xs text-muted-foreground">{item.body}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/networks">
            Open Networking Radar
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void dismiss()}>
          <Check aria-hidden="true" className="size-4" /> Mark as read
        </Button>
      </div>
    </motion.section>
  );
}
