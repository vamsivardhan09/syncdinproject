import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Loader2, PartyPopper } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TwinMeter } from "@/components/twin-intelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { communicationSources, onboardingSteps } from "@/lib/feed-data";
import { firstRewardBreakdown } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Train your AI Twin — about 60 seconds" },
      {
        name: "description",
        content:
          "Connect LinkedIn, GitHub and your résumé, teach your Twin how you think, and watch Twin Intelligence climb step by step.",
      },
      { property: "og:title", content: "Train your SyncdIn AI Twin" },
      {
        property: "og:description",
        content: "Each source unlocks sharper matches — and you can see exactly what it unlocked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

type Phase = "pitch" | "loading" | "reward";

function Onboarding() {
  const navigate = useNavigate();
  const { state, intelligence, dimensions, connectSource, trainSource, completeOnboarding } =
    useTwin();

  const totalSteps = onboardingSteps.length + 2;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("pitch");
  const [stage, setStage] = useState(0);

  const current = onboardingSteps[step];
  const isComms = step === onboardingSteps.length;
  const isFinish = step === onboardingSteps.length + 1;

  // Drives the "Reading profile… Extracting skills…" sequence.
  useEffect(() => {
    if (phase !== "loading" || !current) return;
    if (stage >= current.loadingStages.length) {
      const done = window.setTimeout(() => {
        connectSource(current.sourceId);
        setPhase("reward");
      }, 400);
      return () => window.clearTimeout(done);
    }
    const t = window.setTimeout(() => setStage((s) => s + 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, stage, current, connectSource]);

  function advance() {
    setPhase("pitch");
    setStage(0);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  const progress = useMemo(() => Math.round(((step + 1) / totalSteps) * 100), [step, totalSteps]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Step {step + 1} of {totalSteps}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Twin Intelligence {intelligence}%
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="brand-gradient-bg h-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={`${step}-${phase}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="surface-card mt-6 p-6 sm:p-8"
          >
            {current && phase === "pitch" ? (
              <>
                <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                  {current.chip}
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{current.heading}</h1>
                <p className="mt-2 text-muted-foreground">{current.subtitle}</p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {current.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    className="h-12 flex-1 text-base"
                    onClick={() => {
                      setStage(0);
                      setPhase("loading");
                    }}
                  >
                    {current.cta}
                  </Button>
                  <Button variant="ghost" className="h-12" onClick={advance}>
                    Skip for now
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{current.skipCost}</p>
              </>
            ) : null}

            {current && phase === "loading" ? (
              <div className="py-10 text-center">
                <Loader2
                  aria-hidden="true"
                  className="mx-auto size-8 animate-spin text-primary"
                />
                <h1 className="mt-6 text-xl font-bold">Your Twin is learning</h1>
                <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left">
                  {current.loadingStages.map((label, i) => (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-2 text-sm transition-colors",
                        i < stage ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {i < stage ? (
                        <Check aria-hidden="true" className="size-4 text-success" />
                      ) : (
                        <span aria-hidden="true" className="size-4" />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {current && phase === "reward" ? (
              <div>
                <PartyPopper aria-hidden="true" className="size-7 text-primary" />
                <h1 className="mt-4 text-2xl font-extrabold">{current.celebration}</h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  {current.discovered.map((d) => (
                    <motion.span
                      key={d.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success"
                    >
                      {d.value} {d.label}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  {dimensions.slice(0, 4).map((d, i) => (
                    <TwinMeter key={d.key} label={d.label} value={d.value} delay={i * 0.06} compact />
                  ))}
                </div>
                <Button className="mt-7 h-12 w-full text-base" onClick={advance}>
                  Keep going <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : null}

            {isComms ? (
              <>
                <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                  Communication Intelligence
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Teach your Twin how you think
                </h1>
                <p className="mt-2 text-muted-foreground">
                  This is what makes outreach sound like you instead of a template.
                </p>
                <div className="mt-6 space-y-3">
                  {communicationSources.map((s) => {
                    const done = state.trainedSources.includes(s.id);
                    return (
                      <article
                        key={s.id}
                        className={cn(
                          "rounded-2xl border border-border p-4",
                          done && "border-primary/40 bg-primary-soft/40",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base font-bold">{s.name}</h2>
                            <p className="mt-1 text-sm font-medium">{s.pitch}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs font-semibold text-success">
                              +{s.gain}%
                            </p>
                            <Button
                              className="mt-2"
                              variant={done ? "secondary" : "default"}
                              disabled={done}
                              onClick={() => trainSource(s.id)}
                            >
                              {done ? (
                                <>
                                  <Check aria-hidden="true" className="size-4" /> Learned
                                </>
                              ) : (
                                "Teach my Twin"
                              )}
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <Button className="mt-7 h-12 w-full text-base" onClick={advance}>
                  See what my Twin found <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </>
            ) : null}

            {isFinish ? (
              <div>
                <Badge className="bg-success-soft text-success hover:bg-success-soft">
                  Your first reward
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Your Twin found{" "}
                  <span className="brand-gradient-text">
                    {firstRewardBreakdown.reduce((t, r) => t + r.count, 0)} people
                  </span>{" "}
                  worth meeting.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Twin Intelligence is now {intelligence}%. Every future source sharpens this list.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {firstRewardBreakdown.map((r) => (
                    <div key={r.label} className="rounded-2xl border border-border p-4">
                      <p className="text-2xl font-extrabold tabular-nums">{r.count}</p>
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    className="h-12 flex-1 text-base"
                    onClick={() => {
                      completeOnboarding();
                      void navigate({ to: "/dashboard" });
                    }}
                  >
                    Go to my dashboard <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => {
                      completeOnboarding();
                      void navigate({ to: "/network" });
                    }}
                  >
                    Browse my matches
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          You can leave any time — your Twin keeps everything it has already learned.
        </p>
      </div>
    </AppShell>
  );
}
