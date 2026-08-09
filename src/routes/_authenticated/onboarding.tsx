import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  FileUp,
  Link2,
  Loader2,
  PencilLine,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { demoPeople } from "@/lib/demo-data";
import { buildTwinVector, rankCandidates } from "@/lib/matching";
import {
  displayName,
  getMyProfile,
  initialsOf,
  saveTwinSignals,
  searchPeopleRanked,
  type PublicProfile,
} from "@/lib/real-people";
import { analyzePortfolio, analyzeResume, analyzeText } from "@/lib/twin-analyze.functions";
import type { TwinAnalysis } from "@/lib/twin-analyze.functions";
import { profileSignals, rankProfiles, type RankedProfile } from "@/lib/twin-compatibility";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Build your AI Twin in 60 seconds — SyncdIn" },
      {
        name: "description",
        content:
          "Add one source — a résumé, a link, or a few sentences — and SyncdIn shows you what it learned and who you should meet.",
      },
      { property: "og:title", content: "Build your SyncdIn AI Twin in 60 seconds" },
      {
        property: "og:description",
        content: "One source in. Personal Intelligence and people worth meeting out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

type Phase = "source" | "analyzing" | "understood" | "people";
type SourceKind = "resume" | "link" | "words";

const STAGES = [
  "Reading your source",
  "Extracting skills and focus",
  "Understanding what you want next",
  "Matching against active members",
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

/** Editable chip list — the user always stays in control of what their Twin claims. */
function ChipEditor({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value].slice(0, 30));
    }
    setDraft("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing found here — add what matters to you.
          </p>
        ) : null}
        {values.map((value) => (
          <motion.span
            key={value}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary"
          >
            {value}
            <button
              type="button"
              className="focus-ring rounded-full"
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              <X aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Remove {value}</span>
            </button>
          </motion.span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          aria-label={`Add to ${label}`}
          placeholder={`Add ${label.toLowerCase()}`}
          className="h-9"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={add}>
          <Plus aria-hidden="true" className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { intelligence, connectSource, completeOnboarding, state } = useTwin();

  const [phase, setPhase] = useState<Phase>("source");
  const [kind, setKind] = useState<SourceKind>("resume");
  const [stage, setStage] = useState(0);
  const [url, setUrl] = useState("");
  const [words, setWords] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);

  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  // Animates the learning sequence while the real analysis is in flight.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const t = window.setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      900,
    );
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    void getMyProfile()
      .then((row) => setMyName(row?.full_name ?? null))
      .catch(() => setMyName(null));
  }, []);

  function applyAnalysis(analysis: TwinAnalysis) {
    setHeadline(analysis.headline);
    setSummary(analysis.summary);
    setSkills(analysis.skills);
    setGoals(analysis.goals);
    setInterests(analysis.interests);
    setDiscovered(analysis.discovered);
    setPhase("understood");
  }

  async function analyze(run: () => Promise<TwinAnalysis>, sourceId: string) {
    setError(null);
    setStage(0);
    setPhase("analyzing");
    try {
      const analysis = await run();
      connectSource(sourceId);
      applyAnalysis(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That source could not be analysed.");
      setPhase("source");
    }
  }

  async function onFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("Please upload a file under 8 MB.");
      return;
    }
    setFileName(file.name);
    const fileData = await readFile(file);
    await analyze(
      () =>
        analyzeResume({
          data: { filename: file.name, mimeType: file.type || "application/pdf", fileData },
        }),
      "resume",
    );
  }

  async function confirmSignals() {
    setSaving(true);
    try {
      await saveTwinSignals({
        headline: headline || null,
        twin_summary: summary || null,
        skills,
        goals,
        interests,
      });
      completeOnboarding();
      const list = await searchPeopleRanked("", 12);
      setPeople(list);
      setPhase("people");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your Twin signals.");
    } finally {
      setSaving(false);
    }
  }

  const vector = useMemo(
    () =>
      buildTwinVector({
        connectedSources: state.connectedSources,
        trainedSources: state.trainedSources,
        connectionsMade: state.connectionsMade,
        intelligence,
        headline,
        profileSignals: profileSignals({ skills, goals, interests }),
      }),
    [state, intelligence, headline, skills, goals, interests],
  );

  const rankedMembers: RankedProfile[] = useMemo(
    () => rankProfiles(vector, people ?? [], { name: myName, headline }).slice(0, 5),
    [vector, people, myName, headline],
  );
  const rankedDemo = useMemo(
    () => rankCandidates(vector, demoPeople).slice(0, 5),
    [vector],
  );

  const progress = phase === "source" ? 20 : phase === "analyzing" ? 55 : phase === "understood" ? 80 : 100;

  const canSubmit =
    kind === "link" ? url.trim().length > 8 : kind === "words" ? words.trim().length >= 40 : true;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {phase === "source"
                ? "One source is enough"
                : phase === "analyzing"
                  ? "Building your Twin"
                  : phase === "understood"
                    ? "What SyncdIn learned about you"
                    : "Who you should meet"}
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
            key={phase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="surface-card mt-6 p-6 sm:p-8"
          >
            {phase === "source" ? (
              <>
                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  Give your Twin <span className="brand-gradient-text">one thing</span> to read.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  A résumé, a link, or a few sentences about your current work. You&apos;ll see what
                  it understood before anything is saved — and you can enrich it later.
                </p>

                <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Source type">
                  {(
                    [
                      { id: "resume", label: "Upload résumé", icon: FileUp },
                      { id: "link", label: "Paste a link", icon: Link2 },
                      { id: "words", label: "In your own words", icon: PencilLine },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={kind === tab.id}
                      onClick={() => {
                        setKind(tab.id);
                        setError(null);
                      }}
                      className={cn(
                        "focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        kind === tab.id
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <tab.icon aria-hidden="true" className="size-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  {kind === "resume" ? (
                    <label className="focus-within:ring-ring/40 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50 focus-within:ring-2">
                      <FileUp aria-hidden="true" className="size-6 text-primary" />
                      <span className="text-sm font-semibold">
                        {fileName ?? "Choose a PDF, DOCX or TXT résumé"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Read once to build your Twin. Max 8 MB.
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onFile(file);
                        }}
                      />
                    </label>
                  ) : null}

                  {kind === "link" ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        className="h-12"
                        type="url"
                        inputMode="url"
                        aria-label="Portfolio or profile URL"
                        placeholder="https://your-site.com or a public profile URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <Button
                        className="h-12"
                        disabled={!canSubmit}
                        onClick={() =>
                          void analyze(
                            () => analyzePortfolio({ data: { url: url.trim() } }),
                            "portfolio",
                          )
                        }
                      >
                        Build my Twin <ArrowRight aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ) : null}

                  {kind === "words" ? (
                    <div>
                      <Textarea
                        rows={5}
                        aria-label="Describe your current work"
                        placeholder="I'm a product engineer working on AI onboarding flows. Right now I'm trying to find design partners and people who've shipped retention loops at seed stage…"
                        value={words}
                        onChange={(e) => setWords(e.target.value)}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                          className="h-12"
                          disabled={!canSubmit}
                          onClick={() =>
                            void analyze(
                              () => analyzeText({ data: { text: words.trim() } }),
                              "own-words",
                            )
                          }
                        >
                          Build my Twin <ArrowRight aria-hidden="true" className="size-4" />
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {words.trim().length < 40
                            ? "A couple of sentences is enough — 40 characters minimum."
                            : "Looks good."}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      completeOnboarding();
                      void navigate({ to: "/dashboard" });
                    }}
                  >
                    Skip for now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Without a source your matches stay generic until you add one in My Twin.
                  </p>
                </div>
              </>
            ) : null}

            {phase === "analyzing" ? (
              <div className="py-10 text-center">
                <Loader2 aria-hidden="true" className="mx-auto size-8 animate-spin text-primary" />
                <h1 className="mt-6 text-xl font-bold">Your Twin is reading</h1>
                <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left">
                  {STAGES.map((label, i) => (
                    <li
                      key={label}
                      className={cn(
                        "flex items-center gap-2 text-sm transition-colors",
                        i <= stage ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {i < stage ? (
                        <Check aria-hidden="true" className="size-4 text-success" />
                      ) : i === stage ? (
                        <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
                      ) : (
                        <span aria-hidden="true" className="size-4" />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {phase === "understood" ? (
              <div>
                <Badge className="bg-success-soft text-success hover:bg-success-soft">
                  Personal Intelligence
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Here&apos;s what your Twin understood.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Edit anything that&apos;s off. This is what other Twins will match against.
                </p>

                {discovered.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {discovered.map((d) => (
                      <motion.span
                        key={d}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success"
                      >
                        {d}
                      </motion.span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold">Headline</h3>
                    <Input
                      className="mt-2 h-11"
                      aria-label="Your headline"
                      value={headline}
                      maxLength={140}
                      placeholder="What you do, in one line"
                      onChange={(e) => setHeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">How your Twin describes you</h3>
                    <Textarea
                      className="mt-2"
                      rows={3}
                      aria-label="Twin summary"
                      value={summary}
                      maxLength={800}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </div>
                  <ChipEditor
                    label="Skills"
                    hint="What you can do"
                    values={skills}
                    onChange={setSkills}
                  />
                  <ChipEditor
                    label="Goals"
                    hint="What you want next"
                    values={goals}
                    onChange={setGoals}
                  />
                  <ChipEditor
                    label="Interests"
                    hint="Topics you care about"
                    values={interests}
                    onChange={setInterests}
                  />
                </div>

                <Button
                  className="mt-7 h-12 w-full text-base"
                  disabled={saving}
                  onClick={() => void confirmSignals()}
                >
                  {saving ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : null}
                  This is me — show me who to meet
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : null}

            {phase === "people" ? (
              <div>
                <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                  Your first matches
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  People worth meeting, based on what your Twin just learned.
                </h1>

                {rankedMembers.length > 0 ? (
                  <ul className="mt-6 divide-y divide-border">
                    {rankedMembers.map(({ profile, brief, activity }) => (
                      <li key={profile.id} className="py-3">
                        <Link
                          to="/people/$id"
                          params={{ id: profile.id }}
                          className="focus-ring flex items-center gap-3"
                        >
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName(profile)}
                              loading="lazy"
                              className="size-11 rounded-full object-cover ring-1 ring-border"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid size-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary"
                            >
                              {initialsOf(displayName(profile))}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {displayName(profile)}
                              </span>
                              {brief.hasEvidence ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  {brief.score}% fit
                                </Badge>
                              ) : null}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {brief.reasons[0] ??
                                profile.headline ??
                                "Their Twin is still learning"}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {activity.label}
                            </span>
                          </span>
                          <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground">
                      No other real members are discoverable yet, so here are the demo Twins your
                      profile lines up with most closely.
                    </p>
                    <ul className="mt-4 divide-y divide-border">
                      {rankedDemo.map(({ candidate, score, reasons }) => (
                        <li key={candidate.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{candidate.name}</p>
                            <Badge variant="secondary" className="text-[11px]">
                              {score}% fit
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {reasons[0] ?? candidate.role}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    className="h-12 flex-1 text-base"
                    onClick={() => void navigate({ to: "/dashboard" })}
                  >
                    Go to my dashboard <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => void navigate({ to: "/network" })}
                  >
                    Browse everyone
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Want sharper matches? Add more sources any time in My Twin — recommendations
                  improve as your Twin learns.
                </p>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
