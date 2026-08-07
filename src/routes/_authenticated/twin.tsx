import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, FileText, Github, Globe, Link2, Linkedin, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ConnectSyncModal } from "@/components/connect-sync-modal";
import { TwinIntelligencePanel } from "@/components/twin-intelligence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importSources, trainingSources } from "@/lib/demo-data";
import { syncFlows, type SyncFlow } from "@/lib/sync-flows";
import { analyzePortfolio, analyzeResume } from "@/lib/twin-analyze.functions";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/twin")({
  head: () => ({
    meta: [
      { title: "My AI Twin — train it, watch it improve" },
      {
        name: "description",
        content:
          "Connect LinkedIn, GitHub, résumé, ChatGPT, Claude or Gemini and watch your Twin Intelligence score rise in real time.",
      },
      { property: "og:title", content: "Train your SyncdIn AI Twin" },
      {
        property: "og:description",
        content: "Every source you connect makes your Twin a sharper networker on your behalf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Twin,
});

const icons: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  github: Github,
  resume: FileText,
  portfolio: Globe,
};

function Twin() {
  const { state, intelligence, dimensions, connectSource, trainSource, reset } = useTwin();
  const [activeFlow, setActiveFlow] = useState<SyncFlow | null>(null);
  const [baseline, setBaseline] = useState(0);
  const [pending, setPending] = useState<{ id: string; kind: "import" | "training" } | null>(null);

  const startSync = (id: string, kind: "import" | "training") => {
    const flow = syncFlows[id];
    if (!flow) return;
    setBaseline(intelligence);
    setPending({ id, kind });
    setActiveFlow(flow);
  };

  const commit = () => {
    if (!pending) return;
    if (pending.kind === "import") connectSource(pending.id);
    else trainSource(pending.id);
  };



  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">My AI Twin</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Your Twin gets smarter with every source. More intelligence means better matches and
            outreach that actually sounds like you.
          </p>
        </div>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw aria-hidden="true" className="size-4" /> Reset demo
        </Button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <TwinIntelligencePanel intelligence={intelligence} dimensions={dimensions} />
        <section className="surface-card border-primary/25 bg-primary-soft/50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles aria-hidden="true" className="size-4 text-primary" /> What improves next
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Career and project sources sharpen <strong className="text-foreground">who</strong> your
            Twin finds. Assistant sources sharpen{" "}
            <strong className="text-foreground">how</strong> it speaks for you.
          </p>
          <p className="mt-4 text-sm">
            Your Twin currently reads {state.connectedSources.length + state.trainedSources.length}{" "}
            of {importSources.length + trainingSources.length} available sources.
          </p>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Career &amp; project sources</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {importSources.map((source) => {
            const Icon = icons[source.id] ?? Globe;
            const done = state.connectedSources.includes(source.id);
            return (
              <motion.article
                key={source.id}
                layout
                className={cn("surface-card p-5", done && "border-primary/40")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-success">
                    +{source.gain}%
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold">{source.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{source.subtitle}</p>
                {done ? (
                  <p className="mt-3 text-sm italic text-primary">“{source.afterMessage}”</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Connecting {source.name} could improve matching by ~
                    {Math.round(source.gain)}%. Never required — connect whenever you're ready.
                  </p>
                )}
                <Button
                  className="mt-4 w-full"
                  variant={done ? "secondary" : "default"}
                  disabled={done}
                  onClick={() => startSync(source.id, "import")}
                >
                  {done ? (
                    <>
                      <Check aria-hidden="true" className="size-4" /> Connected
                    </>
                  ) : (
                    `Connect ${source.name}`
                  )}
                </Button>

              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Teach it how you think</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect an AI assistant so your Twin borrows your reasoning and your voice.
        </p>
        <div className="mt-5 space-y-4">
          {trainingSources.map((source) => {
            const done = state.trainedSources.includes(source.id);
            return (
              <article key={source.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">{source.name}</h3>
                    <p className="mt-1 text-sm font-medium">{source.pitch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{source.detail}</p>
                    {done ? (
                      <p className="mt-3 text-sm italic text-primary">“{source.afterMessage}”</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-success">+{source.gain}%</p>
                    <Button
                      className="mt-2"
                      variant={done ? "secondary" : "default"}
                      disabled={done}
                      onClick={() => startSync(source.id, "training")}
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
      </section>

      <ConnectSyncModal
        flow={activeFlow}
        fromIntelligence={baseline}
        toIntelligence={intelligence}
        onCommit={commit}
        onClose={() => {
          setActiveFlow(null);
          setPending(null);
        }}
      />
    </AppShell>

  );
}
