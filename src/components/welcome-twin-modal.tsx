import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BrainCircuit, Clock, Radar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTwin } from "@/lib/twin-store";

const headlines = [
  {
    icon: BrainCircuit,
    title: "Your Twin learns you once",
    body: "Add your résumé, GitHub or a short brief — your Twin turns it into skills, goals and intent.",
  },
  {
    icon: Radar,
    title: "It meets other Twins for you",
    body: "While you work, it compares your context against every member and keeps only real overlap.",
  },
  {
    icon: Users,
    title: "You only meet people worth your time",
    body: "Every introduction arrives with the reason attached, so the first message is never cold.",
  },
];

/**
 * Full-screen first-run guide. Shown ONCE per account — only the very first
 * time an untrained (or very low-intelligence) user lands on the dashboard.
 * After either button is clicked we stamp `seen` into per-user local storage
 * and the guide never reappears, even if the Twin stays weak.
 */
export function WelcomeTwinModal() {
  const { state, intelligence } = useTwin();
  const trained = state.connectedSources.length + state.trainedSources.length;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      const key = `syncdin:welcome:${data.user.id}`;
      const seen = localStorage.getItem(key) === "seen";
      // First time only: untrained, or barely trained below 20% intelligence.
      if (!seen && (trained === 0 || intelligence < 20)) setOpen(true);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [trained, intelligence]);

  function dismiss() {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) localStorage.setItem(`syncdin:welcome:${data.user.id}`, "seen");
    });
    setOpen(false);
  }

  // Never render once we've decided this account has seen the guide, or once
  // the Twin is meaningfully trained. This is what stops it reappearing.
  if (!ready || !open || trained > 0) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-twin-title"
          className="fixed inset-0 z-[70] grid place-items-center bg-foreground/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35 }}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-10"
          >
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Welcome to SyncdIn
            </p>
            <h2 id="welcome-twin-title" className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Your network is empty on purpose.{" "}
              <span className="brand-gradient-text">Train your Twin first.</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              SyncdIn doesn&apos;t ask you to add hundreds of strangers. It builds one AI Twin of
              you, and that Twin finds the few people who actually matter.
            </p>

            <ul className="mt-6 space-y-4">
              {headlines.map((item, i) => (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex gap-3 rounded-2xl border border-border bg-background p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <item.icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="flex-1" onClick={dismiss}>
                <Link to="/twin">
                  Build my AI Twin <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" onClick={dismiss}>
                Look around first
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock aria-hidden="true" className="size-3.5" /> Takes about a minute — one upload
              is enough to start matching.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
