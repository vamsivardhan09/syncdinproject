import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  FileText,
  Github,
  Globe,
  Link2,
  Linkedin,
  Radar,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ConnectSyncModal } from "@/components/connect-sync-modal";
import { TwinIntelligencePanel } from "@/components/twin-intelligence";
import { Badge } from "@/components/ui/badge";
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
import { SOURCE_SIGNALS } from "@/lib/matching";
import { importGitHub, importLinkedIn, normalizeLinkedInUrl } from "@/lib/profile-import";
import { syncFlows, type SyncFlow } from "@/lib/sync-flows";
import { TeachTwinModal } from "@/components/teach-twin-modal";
import { analyzePortfolio, analyzeResume, analyzeText } from "@/lib/twin-analyze.functions";
import { openGaps, twinKnowledge } from "@/lib/twin-knowledge";
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

type AnalysisRun = () => Promise<{ discovered: string[]; summary?: string }>;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function Twin() {
  const { state, intelligence, dimensions, gainFor, connectSource, trainSource, reset } = useTwin();
  const [activeFlow, setActiveFlow] = useState<SyncFlow | null>(null);
  const [baseline, setBaseline] = useState(0);
  const [pending, setPending] = useState<{ id: string; kind: "import" | "training" } | null>(null);
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [urlAsk, setUrlAsk] = useState<"linkedin" | "github" | null>(null);
  const [askValue, setAskValue] = useState("");
  const [teach, setTeach] = useState<string | null>(null);

  const [result, setResult] = useState<{
    name: string;
    signals: number;
    from: number;
    to: number;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const sources = [...state.connectedSources, ...state.trainedSources];
  const knowledge = twinKnowledge(sources).filter((g) => g.items.length > 0);
  const gaps = openGaps(sources);

  const startSync = (id: string, kind: "import" | "training", analysis: AnalysisRun | null = null) => {
    const flow = syncFlows[id];
    if (!flow) return;
    setBaseline(intelligence);
    setPending({ id, kind });
    setRun(analysis ? () => analysis : null);
    setActiveFlow(flow);
  };

  const commit = () => {
    if (!pending) return;
    const gain = gainFor(pending.id);
    const signals = SOURCE_SIGNALS[pending.id]?.length ?? 3;
    const name =
      importSources.find((s) => s.id === pending.id)?.name ??
      trainingSources.find((s) => s.id === pending.id)?.name ??
      "New source";
    if (pending.kind === "import") connectSource(pending.id);
    else trainSource(pending.id);
    setResult({ name, signals, from: baseline, to: Math.min(99, baseline + gain) });
  };


  const handleResumeFile = async (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Please upload a file under 12MB.");
      return;
    }
    let fileData: string;
    try {
      fileData = await readAsDataUrl(file);
    } catch {
      toast.error("Could not read that file.");
      return;
    }
    startSync("resume", "import", async () => {
      const result = await analyzeResume({
        data: {
          filename: file.name,
          mimeType: file.type || "application/pdf",
          fileData,
        },
      });
      return {
        summary: result.summary,
        discovered: [`${Math.round(result.strengthPct)}% résumé signal`, ...result.discovered],
      };
    });
  };

  const submitPortfolio = () => {
    const url = portfolioUrl.trim().startsWith("http")
      ? portfolioUrl.trim()
      : `https://${portfolioUrl.trim()}`;
    try {
      new URL(url);
    } catch {
      toast.error("That doesn't look like a valid URL.");
      return;
    }
    setPortfolioOpen(false);
    setPortfolioUrl("");
    startSync("portfolio", "import", async () => {
      const result = await analyzePortfolio({ data: { url } });
      return {
        summary: result.summary,
        discovered: [`${Math.round(result.strengthPct)}% portfolio signal`, ...result.discovered],
      };
    });
  };

  /** LinkedIn / GitHub: ask for the profile URL first, then read it during the sync animation. */
  const submitProfileUrl = () => {
    const raw = askValue.trim();
    if (!raw) return;

    if (urlAsk === "linkedin") {
      const normalized = normalizeLinkedInUrl(raw);
      if (!normalized) {
        toast.error("Paste your linkedin.com/in/… profile URL.");
        return;
      }
      setUrlAsk(null);
      setAskValue("");
      startSync("linkedin", "import", async () => {
        try {
          const live = await analyzePortfolio({ data: { url: normalized.url } });
          if (live.skills.length >= 3) {
            return {
              summary: live.summary,
              discovered: [`${Math.round(live.strengthPct)}% profile signal`, ...live.discovered],
            };
          }
        } catch {
          // LinkedIn gates most profiles — fall back to the structured demo adapter.
        }
        const demo = importLinkedIn(normalized.url);
        return { summary: demo.summary, discovered: demo.discovered };
      });
      return;
    }

    if (urlAsk === "github") {
      setUrlAsk(null);
      setAskValue("");
      startSync("github", "import", async () => {
        const signals = await importGitHub(raw);
        return { summary: signals.summary, discovered: signals.discovered };
      });
    }
  };

  /** ChatGPT / Claude / Gemini: the user pastes the assistant's report on themselves. */
  const submitTeachText = (assistant: string, text: string) => {
    startSync(assistant.toLowerCase(), "training", async () => {
      const analysis = await analyzeText({ data: { text } });
      return {
        summary: analysis.summary,
        discovered: [`${Math.round(analysis.strengthPct)}% reasoning signal`, ...analysis.discovered],
      };
    });
  };


  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">My AI Twin</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            One place to make your Twin smarter. Intelligence is simply how much real signal your
            Twin has to reason with — the higher it is, the better and better-explained your matches
            get.
          </p>
        </div>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw aria-hidden="true" className="size-4" /> Reset demo
        </Button>
      </header>

      <AnimatePresence>
        {result ? (
          <motion.section
            key="enrichment-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="surface-card mt-6 border-success/30 bg-success/5 p-6"
          >
            <h2 className="text-lg font-bold">Your Twin just got smarter</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.name} added <strong className="text-foreground">{result.signals} new
              signals</strong> · Twin Intelligence {result.from}% →{" "}
              <strong className="text-foreground">{intelligence}%</strong>. Every match score below
              was recomputed with them.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/network">
                  View better matches <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/networks">
                  <Radar aria-hidden="true" className="size-4" /> Re-scan an event
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)}>
                Dismiss
              </Button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <TwinIntelligencePanel intelligence={intelligence} dimensions={dimensions} />
        <section className="surface-card border-primary/25 bg-primary-soft/50 p-6">
          <h2 className="text-lg font-bold">Your Twin knows…</h2>
          {knowledge.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing about you yet — it is matching on generic AI-industry signal only. Connect one
              source below and this fills in immediately.
            </p>
          ) : (
            <dl className="mt-4 space-y-3">
              {knowledge.map((group) => (
                <div key={group.key}>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Badge key={item} variant="outline" className="font-normal">
                        {item}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 text-sm">
            Reading {state.connectedSources.length + state.trainedSources.length} of{" "}
            {importSources.length + trainingSources.length} available sources.
          </p>
        </section>
      </div>

      {gaps.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Missing signal — and what it unlocks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordered by how much each one improves your matches.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {gaps.map((gap) => (
              <li key={gap.id} className="surface-card p-4">
                <p className="text-sm font-bold">{gap.missing}</p>
                <p className="mt-1 text-sm text-muted-foreground">→ {gap.benefit}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      <section className="mt-10">
        <h2 className="text-xl font-bold">Career &amp; project sources</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {importSources.map((source) => {
            const sourceId: string = source.id;
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
                ) : source.id === "resume" ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Upload a PDF, DOC or text résumé. Your Twin scans it and extracts your
                    experience, projects, skills and certifications.
                  </p>
                ) : source.id === "portfolio" ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Paste your live site or portfolio URL. Your Twin reads it and scores how much
                    signal it adds.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Connecting {source.name} could improve matching by ~
                    {Math.round(source.gain)}%. Never required — connect whenever you're ready.
                    <span className="mt-1 block text-xs">
                      Prototype: live {source.name} OAuth is not enabled yet, so this uses seeded
                      enrichment. No private data is read.
                    </span>
                  </p>
                )}

                <Button
                  className="mt-4 w-full"
                  variant={done ? "secondary" : "default"}
                  disabled={done}
                  onClick={() => {
                    if (source.id === "resume") fileInput.current?.click();
                    else if (source.id === "portfolio") setPortfolioOpen(true);
                    else if (sourceId === "linkedin" || sourceId === "github") {
                      setAskValue("");
                      setUrlAsk(sourceId);
                    } else startSync(sourceId, "import");



                  }}
                >
                  {done ? (
                    <>
                      <Check aria-hidden="true" className="size-4" /> Connected
                    </>
                  ) : source.id === "resume" ? (
                    <>
                      <Upload aria-hidden="true" className="size-4" /> Upload résumé
                    </>
                  ) : source.id === "portfolio" ? (
                    <>
                      <Link2 aria-hidden="true" className="size-4" /> Add live demo link
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
          Connect an AI assistant so your Twin borrows your reasoning and your voice. In this
          prototype these are demo integrations — SyncdIn never reads private chat history without an
          official export or API permission.
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

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,application/pdf,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleResumeFile(file);
        }}
      />

      <Dialog open={portfolioOpen} onOpenChange={setPortfolioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share your URL</DialogTitle>
            <DialogDescription>
              Portfolio, personal site or live demo. Your Twin reads the page and extracts your
              craft, positioning and featured work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="portfolio-url">Link</Label>
            <Input
              id="portfolio-url"
              placeholder="yourname.com or https://myproject.vercel.app"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitPortfolio();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPortfolioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPortfolio} disabled={!portfolioUrl.trim()}>
              Analyze link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConnectSyncModal
        flow={activeFlow}
        fromIntelligence={baseline}
        toIntelligence={intelligence}
        run={run}
        onCommit={commit}
        onClose={() => {
          setActiveFlow(null);
          setPending(null);
          setRun(null);
        }}
      />
    </AppShell>

  );
}
