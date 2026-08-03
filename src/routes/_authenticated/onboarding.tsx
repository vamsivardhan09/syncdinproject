import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FileText,
  Github,
  Globe,
  Linkedin,
  Loader2,
  PartyPopper,
  Sparkles,
  Timer,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { TwinMeter } from "@/components/twin-intelligence";
import { firstRewardBreakdown, importSources, trainingSources } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Build your AI Twin — SyncdIn onboarding" },
      {
        name: "description",
        content:
          "Import your career, train your AI Twin on how you think, and get your first matched connections in about 60 seconds.",
      },
      { property: "og:title", content: "Build your AI Twin in 60 seconds" },
      {
        property: "og:description",
        content: "No forms. Connect a source and watch your Twin Intelligence climb.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const sourceIcon: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  github: Github,
  resume: FileText,
  portfolio: Globe,
};

type Step = 0 | 1 | 2 | 3 | 4;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const { state, intelligence, dimensions, connectSource, trainSource, completeOnboarding } =
    useTwin();

  return (
    <div className="canvas-glow flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <BrandLogo />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles aria-hidden="true" className="size-3.5" /> Twin Intelligence {intelligence}%
        </span>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 ? <Welcome onNext={() => setStep(1)} /> : null}
            {step === 1 ? (
              <ImportCareer
                connected={state.connectedSources}
                onConnect={connectSource}
                onNext={() => setStep(2)}
              />
            ) : null}
            {step === 2 ? (
              <TrainTwin
                trained={state.trainedSources}
                intelligence={intelligence}
                onTrain={trainSource}
                onNext={() => setStep(3)}
              />
            ) : null}
            {step === 3 ? (
              <LearningAnimation dimensions={dimensions} onDone={() => setStep(4)} />
            ) : null}
            {step === 4 ? (
              <FirstReward
                onExplore={() => {
                  completeOnboarding();
                  navigate({ to: "/network" });
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <section className="pt-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <BrainCircuit aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-7 text-4xl font-extrabold sm:text-5xl">
        Let's build your <span className="brand-gradient-text">AI Twin</span>.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
        Your AI Twin discovers recruiters, founders, collaborators and opportunities for you —
        automatically, in the background, every day.
      </p>
      <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
        <Timer aria-hidden="true" className="size-4" /> Around 60 seconds
      </p>
      <div className="mt-8">
        <Button size="lg" className="h-12 px-8 text-base shadow-glow" onClick={onNext}>
          Start building <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function ImportCareer({
  connected,
  onConnect,
  onNext,
}: {
  connected: string[];
  onConnect: (id: string) => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const active = importSources.find((s) => connected.includes(s.id));

  function handleImport(id: string) {
    setBusy(id);
    window.setTimeout(() => {
      onConnect(id);
      setBusy(null);
    }, 1100);
  }

  return (
    <section>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Import your career</h1>
      <p className="mt-3 text-muted-foreground">
        No forms. Pick a source you already own — your Twin reads it and gets smarter instantly.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {importSources.map((source) => {
          const Icon = sourceIcon[source.id] ?? Globe;
          const done = connected.includes(source.id);
          return (
            <article
              key={source.id}
              className={cn(
                "surface-card p-5 transition-shadow hover:shadow-lift",
                done && "border-primary/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="font-mono text-xs font-semibold text-success">
                  +{source.gain}% twin
                </span>
              </div>
              <h2 className="mt-4 text-base font-bold">{source.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{source.subtitle}</p>
              <ul className="mt-3 space-y-1">
                {source.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                variant={done ? "secondary" : "default"}
                disabled={done || busy !== null}
                onClick={() => handleImport(source.id)}
              >
                {busy === source.id ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Reading{" "}
                    {source.name}…
                  </>
                ) : done ? (
                  <>
                    <Check aria-hidden="true" className="size-4" /> Imported
                  </>
                ) : (
                  <>Use my {source.name}</>
                )}
              </Button>
            </article>
          );
        })}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card mt-6 border-primary/30 bg-primary-soft/50 p-5"
          >
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Your Twin discovered
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {active.discovered.map((d, i) => (
                <motion.span
                  key={d}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-soft"
                >
                  {d}
                </motion.span>
              ))}
            </div>
            <p className="mt-4 text-sm italic">“{active.afterMessage}”</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" onClick={onNext} disabled={connected.length === 0}>
          Continue <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
        <Button variant="ghost" onClick={onNext}>
          I'll do this later
        </Button>
      </div>
    </section>
  );
}

function TrainTwin({
  trained,
  intelligence,
  onTrain,
  onNext,
}: {
  trained: string[];
  intelligence: number;
  onTrain: (id: string) => void;
  onNext: () => void;
}) {
  const potential = useMemo(() => {
    const remaining = trainingSources
      .filter((s) => !trained.includes(s.id))
      .reduce((sum, s) => sum + s.gain, 0);
    return Math.min(99, intelligence + remaining);
  }, [trained, intelligence]);

  return (
    <section>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Train your AI Twin</h1>
      <p className="mt-3 text-muted-foreground">
        Your Twin knows what you've done. These sources teach it how you think, write and learn.
      </p>

      <div className="surface-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Current AI accuracy
          </p>
          <p className="text-2xl font-extrabold tabular-nums">{intelligence}%</p>
        </div>
        <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            After connecting all three
          </p>
          <p className="brand-gradient-text text-2xl font-extrabold tabular-nums">{potential}%</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {trainingSources.map((source) => {
          const done = trained.includes(source.id);
          return (
            <article key={source.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold">{source.name}</h2>
                  <p className="mt-1 text-sm font-medium">{source.pitch}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{source.detail}</p>
                  {done ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-sm italic text-primary"
                    >
                      “{source.afterMessage}”
                    </motion.p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-semibold text-success">+{source.gain}%</p>
                  <Button
                    className="mt-2"
                    variant={done ? "secondary" : "default"}
                    disabled={done}
                    onClick={() => onTrain(source.id)}
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

      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" onClick={onNext}>
          My Twin is ready <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
      </div>
    </section>
  );
}

function LearningAnimation({
  dimensions,
  onDone,
}: {
  dimensions: { key: string; label: string; value: number }[];
  onDone: () => void;
}) {
  const [seconds, setSeconds] = useState(11);

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const finish = window.setTimeout(onDone, 5200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <section className="py-6 text-center" aria-live="polite">
      <motion.span
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="brand-gradient-bg mx-auto flex size-16 items-center justify-center rounded-3xl shadow-glow"
      >
        <BrainCircuit aria-hidden="true" className="size-8 text-primary-foreground" />
      </motion.span>
      <h1 className="mt-7 text-3xl font-extrabold">Your AI Twin is learning about you…</h1>
      <p className="mt-2 text-muted-foreground">
        Reading your context, mapping goals and drafting how it will introduce you.
      </p>

      <div className="surface-card mx-auto mt-8 max-w-xl space-y-4 p-6 text-left">
        {dimensions.map((dim, i) => (
          <TwinMeter key={dim.key} label={dim.label} value={dim.value} delay={i * 0.25} />
        ))}
      </div>

      <p className="mt-5 font-mono text-sm text-muted-foreground">
        {seconds > 0 ? `~${seconds}s remaining` : "Almost there…"}
      </p>
    </section>
  );
}

function FirstReward({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="py-4 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
        <PartyPopper aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">
        Your Twin already found people worth meeting
      </h1>
      <p className="mt-3 text-muted-foreground">
        It screened hundreds of professionals while you were setting up.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {firstRewardBreakdown.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="surface-card p-5"
          >
            <p className="brand-gradient-text text-3xl font-extrabold tabular-nums">{item.count}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{item.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-9">
        <Button size="lg" className="h-12 px-8 text-base shadow-glow" onClick={onExplore}>
          Explore my network <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </section>
  );
}
