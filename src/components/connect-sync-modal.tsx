import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { Check, Loader2, PartyPopper, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { runSyncStep, type SyncFlow } from "@/lib/sync-flows";
import { cn } from "@/lib/utils";

function CountUp({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return <span className="tabular-nums">{display}%</span>;
}

function Confetti() {
  const pieces = Array.from({ length: 18 });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
      {pieces.map((_, i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute top-6 size-1.5 rounded-full",
            i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-success" : "bg-accent-foreground/50",
          )}
          style={{ left: `${(i / pieces.length) * 100}%` }}
          initial={{ y: 0, opacity: 1, scale: 0.6 }}
          animate={{ y: 120, opacity: 0, scale: 1.2, x: (i % 2 ? 1 : -1) * (12 + i * 2) }}
          transition={{ duration: 1.4 + (i % 5) * 0.15, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function ConnectSyncModal({
  flow,
  fromIntelligence,
  toIntelligence,
  onCommit,
  onClose,
}: {
  flow: SyncFlow | null;
  fromIntelligence: number;
  toIntelligence: number;
  /** Called once processing finishes, so state only updates after the AI "learns". */
  onCommit: () => void;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const committed = useRef(false);

  useEffect(() => {
    if (!flow) return;
    setStepIndex(0);
    setDone(false);
    committed.current = false;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < flow.steps.length; i += 1) {
        await runSyncStep(520 + Math.random() * 180);
        if (cancelled) return;
        setStepIndex(i + 1);
      }
      await runSyncStep(420);
      if (cancelled) return;
      setDone(true);
      if (!committed.current) {
        committed.current = true;
        onCommit();
        flow.toasts.forEach((message, i) => {
          setTimeout(() => toast(message), i * 900);
        });
        setTimeout(
          () => toast.success(`✨ AI found ${flow.opportunities} new networking opportunities.`),
          flow.toasts.length * 900,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.id]);

  const progress = flow ? Math.round((stepIndex / flow.steps.length) * 100) : 0;

  return (
    <Dialog open={!!flow} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        {flow ? (
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Sparkles aria-hidden="true" className="size-4 text-primary" />
                  {flow.modalTitle}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your AI Twin is learning. This takes a few seconds.
                </p>

                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="brand-gradient-bg relative h-full rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.span
                      className="absolute inset-0 bg-foreground/20"
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  </motion.div>
                </div>

                <ul className="mt-5 space-y-3">
                  {flow.steps.map((step, i) => {
                    const complete = i < stepIndex;
                    const active = i === stepIndex;
                    return (
                      <motion.li
                        key={step}
                        className="flex items-center gap-3 text-sm"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: complete || active ? 1 : 0.4, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border",
                            complete
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {complete ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check aria-hidden="true" className="size-3.5" />
                            </motion.span>
                          ) : active ? (
                            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                          ) : null}
                        </span>
                        <span className={cn(complete ? "text-foreground" : "text-muted-foreground")}>
                          {step}
                        </span>
                        {active ? (
                          <motion.span
                            className="ml-auto h-2 w-16 rounded-full bg-muted"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                          />
                        ) : null}
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            ) : (
              <motion.div
                key="reward"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <Confetti />
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <PartyPopper aria-hidden="true" className="size-5 text-primary" />
                  {flow.rewardTitle}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">Your AI discovered:</p>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {flow.discovered.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium"
                    >
                      <Check aria-hidden="true" className="size-4 text-success" /> {item}
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-5 rounded-2xl border border-primary/30 bg-primary-soft/60 p-4"
                >
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <TrendingUp aria-hidden="true" className="size-3.5 text-primary" /> Twin
                    Intelligence
                  </p>
                  <p className="mt-2 flex items-baseline gap-3 text-3xl font-extrabold">
                    <span className="text-muted-foreground/70 line-through decoration-1">
                      {fromIntelligence}%
                    </span>
                    <span className="brand-gradient-text">
                      <CountUp value={toIntelligence} />
                    </span>
                  </p>
                </motion.div>

                <Button className="mt-5 w-full" onClick={onClose}>
                  Continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
