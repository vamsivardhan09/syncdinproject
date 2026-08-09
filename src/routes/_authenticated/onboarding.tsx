import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  FileUp,
  Github,
  Linkedin,
  Loader2,
  Plus,
  ShieldCheck,
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
import { analyzeResume } from "@/lib/twin-analyze.functions";
import type { TwinAnalysis } from "@/lib/twin-analyze.functions";
import {
  REFINEMENT_QUESTIONS,
  confidenceOf,
  importGitHub,
  importLinkedIn,
  mergeSignals,
  normalizeLinkedInUrl,
  type ImportSourceKind,
} from "@/lib/profile-import";
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
          "Start with something you already have — a LinkedIn URL or a résumé — and SyncdIn shows you what it understood and who you should meet.",
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

type Phase = "start" | "importing" | "understood" | "people" | "enrich" | "refine" | "ready";

const STAGES = [
  "Reading what you gave us",
  "Extracting skills and focus",
  "Understanding what you want next",
  "Matching against active members",
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIN_IMPORT_MS = 2400;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

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

/** Illustrative Twin confidence meter — always framed as growing with signals. */
function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold">Twin confidence</p>
        <p className="font-mono text-sm font-semibold text-primary">{value}%</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="brand-gradient-bg h-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        An illustrative measure of how much usable signal your Twin has. It rises every time you add
        a source or confirm a detail.
      </p>
    </div>
  );
}

function MatchList({ ranked }: { ranked: RankedProfile[] }) {
  return (
    <ul className="mt-5 divide-y divide-border">
      {ranked.map(({ profile, brief, activity }) => (
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
                <span className="truncate text-sm font-semibold">{displayName(profile)}</span>
                {brief.hasEvidence ? (
                  <Badge variant="secondary" className="text-[11px]">
                    {brief.score}% fit
                  </Badge>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {brief.reasons[0] ?? profile.headline ?? "Their Twin is still learning"}
              </span>
              <span className="block text-[11px] text-muted-foreground">{activity.label}</span>
            </span>
            <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { intelligence, connectSource, completeOnboarding, state } = useTwin();

  const [phase, setPhase] = useState<Phase>("start");
  const [stage, setStage] = useState(0);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<ImportSourceKind[]>([]);

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<string[]>([]);

  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (phase !== "importing") return;
    setStage(0);
    const t = window.setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      700,
    );
    return () => window.clearInterval(t);
  }, [phase]);

  // Pre-fill from whatever the account already knows, so "Skip for now" still works.
  useEffect(() => {
    void getMyProfile()
      .then((row) => {
        if (!row) return;
        setMyName(row.full_name ?? null);
        setHeadline((h) => h || (row.headline ?? ""));
        setSummary((s) => s || (row.twin_summary ?? ""));
        setSkills((v) => (v.length ? v : (row.skills ?? [])));
        setGoals((v) => (v.length ? v : (row.goals ?? [])));
        setInterests((v) => (v.length ? v : (row.interests ?? [])));
      })
      .catch(() => setMyName(null));
  }, []);

  const confidence = useMemo(
    () => confidenceOf({ skills, goals, interests }, sources.length > 1 ? 46 : 34),
    [skills, goals, interests, sources],
  );

  function noteSource(kind: ImportSourceKind, twinSourceId: string) {
    setSources((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
    connectSource(twinSourceId);
  }

  /** LinkedIn URL → demo import adapter. No scraping, no LinkedIn API claim. */
  async function runLinkedIn() {
    const normalized = normalizeLinkedInUrl(linkedinUrl);
    if (!normalized) {
      setError("Enter a profile URL that looks like linkedin.com/in/your-name");
      return;
    }
    setError(null);
    setPhase("importing");
    const started = Date.now();
    try {
      const result = importLinkedIn(normalized.url, myName);
      await new Promise((r) => window.setTimeout(r, Math.max(0, MIN_IMPORT_MS - (Date.now() - started))));
      setHeadline((h) => h || result.headline);
      setSummary(result.summary);
      setSkills((v) => mergeSignals(v, result.skills));
      setGoals((v) => mergeSignals(v, result.goals, 12));
      setInterests((v) => mergeSignals(v, result.interests, 12));
      setDiscovered(result.discovered);
      noteSource("linkedin_url_demo", "linkedin");
      setPhase("understood");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That profile URL couldn't be imported.");
      setPhase("start");
    }
  }

  async function onFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("Please upload a file under 8 MB.");
      return;
    }
    setError(null);
    setFileName(file.name);
    setPhase("importing");
    try {
      const fileData = await readFile(file);
      const analysis: TwinAnalysis = await analyzeResume({
        data: { filename: file.name, mimeType: file.type || "application/pdf", fileData },
      });
      setHeadline((h) => h || analysis.headline);
      setSummary(analysis.summary);
      setSkills((v) => mergeSignals(v, analysis.skills));
      setGoals((v) => mergeSignals(v, analysis.goals, 12));
      setInterests((v) => mergeSignals(v, analysis.interests, 12));
      setDiscovered(analysis.discovered);
      noteSource("resume", "resume");
      setPhase("understood");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That résumé could not be read.");
      setPhase("start");
    }
  }

  /** Persists the current signals, then loads the payoff list. */
  async function saveAndShowPeople() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function runGitHub() {
    setEnrichError(null);
    setBusy(true);
    try {
      const result = await importGitHub(githubUrl);
      setSkills((v) => mergeSignals(v, result.skills));
      setInterests((v) => mergeSignals(v, result.interests, 12));
      setDiscovered(result.discovered);
      if (!headline && result.headline) setHeadline(result.headline);
      noteSource("github_url", "github");
      toast.success("GitHub added — your Twin now knows what you build.");
      setPhase("refine");
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "GitHub couldn't be read.");
    } finally {
      setBusy(false);
    }
  }

  function togglePick(option: string) {
    setPicked((prev) =>
      prev.includes(option) ? prev.filter((p) => p !== option) : [...prev, option],
    );
  }

  /** Applies the refinement chips to the right signal fields and saves. */
  async function finishRefinement() {
    const nextGoals = mergeSignals(
      goals,
      REFINEMENT_QUESTIONS.filter((q) => q.field === "goals").flatMap((q) =>
        q.options.filter((o) => picked.includes(o)),
      ),
      12,
    );
    const nextInterests = mergeSignals(
      interests,
      REFINEMENT_QUESTIONS.filter((q) => q.field === "interests").flatMap((q) =>
        q.options.filter((o) => picked.includes(o)),
      ),
      12,
    );
    setGoals(nextGoals);
    setInterests(nextInterests);
    setBusy(true);
    try {
      await saveTwinSignals({
        headline: headline || null,
        twin_summary: summary || null,
        skills,
        goals: nextGoals,
        interests: nextInterests,
      });
      const list = await searchPeopleRanked("", 12);
      setPeople(list);
      setPhase("ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your refinements.");
    } finally {
      setBusy(false);
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
  const rankedDemo = useMemo(() => rankCandidates(vector, demoPeople).slice(0, 5), [vector]);

  const progress =
    phase === "start"
      ? 12
      : phase === "importing"
        ? 34
        : phase === "understood"
          ? 52
          : phase === "people"
            ? 70
            : phase === "enrich"
              ? 82
              : phase === "refine"
                ? 92
                : 100;

  const eyebrow =
    phase === "start"
      ? "Start with something you already have"
      : phase === "importing"
        ? "Building your Twin"
        : phase === "understood"
          ? "Your Twin is taking shape"
          : phase === "people"
            ? "People you may want to meet"
            : phase === "enrich"
              ? "Make your Twin smarter"
              : phase === "refine"
                ? "Three quick questions"
                : "Your Twin is ready";

  function skipToDashboard() {
    completeOnboarding();
    void navigate({ to: "/dashboard" });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {eyebrow}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Twin confidence {confidence}%
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
            {phase === "start" ? (
              <>
                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  Let&apos;s build your <span className="brand-gradient-text">Twin</span>.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Start with something you already have. One source is enough to see what SyncdIn
                  understands about you — and who you should meet.
                </p>

                <div className="mt-6 rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
                  <div className="flex items-center gap-2">
                    <Linkedin aria-hidden="true" className="size-5 text-primary" />
                    <h2 className="text-sm font-bold">Paste your LinkedIn profile URL</h2>
                    <Badge variant="secondary" className="text-[11px]">
                      Fastest
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    What you get: a first Twin and a ranked list of people worth meeting, in about a
                    minute.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input
                      className="h-12"
                      type="url"
                      inputMode="url"
                      aria-label="LinkedIn profile URL"
                      placeholder="https://www.linkedin.com/in/your-name"
                      value={linkedinUrl}
                      onChange={(e) => {
                        setLinkedinUrl(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void runLinkedIn();
                      }}
                    />
                    <Button className="h-12" onClick={() => void runLinkedIn()}>
                      Continue <ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                  {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                  <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    SyncdIn never asks for your LinkedIn password and does not scrape your account.
                    Only public profile information you point us at is used, and in this prototype
                    the import runs through a demo adapter you can review and edit before anything is
                    saved.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="focus-within:ring-ring/40 flex cursor-pointer flex-col gap-1 rounded-2xl border border-dashed border-border p-5 transition-colors hover:border-primary/50 focus-within:ring-2">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <FileUp aria-hidden="true" className="size-4 text-primary" />
                      {fileName ?? "Upload your résumé"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Read once to extract skills and goals. PDF, DOCX or TXT, max 8 MB.
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

                  <button
                    type="button"
                    className="focus-ring flex flex-col gap-1 rounded-2xl border border-border p-5 text-left transition-colors hover:border-primary/50"
                    onClick={() => setPhase("understood")}
                  >
                    <span className="text-sm font-bold">Skip for now</span>
                    <span className="text-xs text-muted-foreground">
                      Continue with only what&apos;s already in your account. You can add sources any
                      time.
                    </span>
                  </button>
                </div>
              </>
            ) : null}

            {phase === "importing" ? (
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
                <p className="mx-auto mt-6 max-w-sm text-xs text-muted-foreground">
                  Next you&apos;ll see exactly what it understood — and you can correct anything
                  before it is saved.
                </p>
              </div>
            ) : null}

            {phase === "understood" ? (
              <div>
                <Badge className="bg-success-soft text-success hover:bg-success-soft">
                  Personal Intelligence
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  {myName ? `${myName.split(" ")[0]}, your` : "Your"} Twin is taking shape.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {summary ||
                    "Add the details below and your Twin will start matching you against active members."}
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

                <div className="mt-6">
                  <ConfidenceMeter value={confidence} />
                </div>

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
                  <ChipEditor label="Skills" hint="What you can do" values={skills} onChange={setSkills} />
                  <ChipEditor
                    label="Looking for"
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
                  disabled={busy}
                  onClick={() => void saveAndShowPeople()}
                >
                  {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                  This is me — show me who to meet
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
                <div className="mt-3 text-center">
                  <Button variant="ghost" size="sm" onClick={skipToDashboard}>
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === "people" ? (
              <div>
                <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                  Your first matches
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  People you may want to meet.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Ranked by what your Twin just learned — shared skills, overlapping goals and
                  complementary expertise.
                </p>

                {rankedMembers.length > 0 ? (
                  <MatchList ranked={rankedMembers} />
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
                  <Button className="h-12 flex-1 text-base" onClick={() => setPhase("enrich")}>
                    Make my Twin smarter <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                  <Button variant="outline" className="h-12" onClick={skipToDashboard}>
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === "enrich" ? (
              <div>
                <Badge variant="secondary">Optional</Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Add GitHub to help your Twin understand what you build.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Your public repositories show the languages and problems you actually work on, so
                  engineering matches get noticeably sharper than a résumé alone allows.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Input
                    className="h-12"
                    aria-label="GitHub profile URL or username"
                    placeholder="https://github.com/your-username"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setEnrichError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void runGitHub();
                    }}
                  />
                  <Button className="h-12" disabled={busy || !githubUrl.trim()} onClick={() => void runGitHub()}>
                    {busy ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    ) : (
                      <Github aria-hidden="true" className="size-4" />
                    )}
                    Add GitHub
                  </Button>
                </div>
                {enrichError ? <p className="mt-3 text-sm text-destructive">{enrichError}</p> : null}
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  Read from GitHub&apos;s public API only — public repositories, languages and
                  topics. No sign-in, no private data.
                </p>

                <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
                  <Button variant="outline" className="h-11" onClick={() => setPhase("refine")}>
                    Not now
                  </Button>
                  <Button variant="ghost" className="h-11" onClick={skipToDashboard}>
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === "refine" ? (
              <div>
                <Badge variant="secondary">30 seconds</Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Three taps to sharpen every match.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Pick whatever applies. This is the strongest signal your Twin can get — it changes
                  who appears at the top of your network.
                </p>

                <div className="mt-6 space-y-6">
                  {REFINEMENT_QUESTIONS.map((q) => (
                    <div key={q.id}>
                      <h3 className="text-sm font-bold">{q.title}</h3>
                      <p className="text-xs text-muted-foreground">{q.why}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.options.map((option) => {
                          const active = picked.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={active}
                              onClick={() => togglePick(option)}
                              className={cn(
                                "focus-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary-soft text-primary"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {active ? (
                                <Check aria-hidden="true" className="mr-1 inline size-3.5" />
                              ) : null}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-7 h-12 w-full text-base"
                  disabled={busy}
                  onClick={() => void finishRefinement()}
                >
                  {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                  Finish my Twin <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
                <div className="mt-3 text-center">
                  <Button variant="ghost" size="sm" onClick={skipToDashboard}>
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === "ready" ? (
              <div>
                <Badge className="bg-success-soft text-success hover:bg-success-soft">
                  Twin ready
                </Badge>
                <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  Your Twin is ready{myName ? `, ${myName.split(" ")[0]}` : ""}.
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {summary || "It now matches you against active members every time you open SyncdIn."}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ConfidenceMeter value={confidence} />
                  <div className="rounded-2xl border border-border p-4">
                    <p className="text-sm font-bold">Signals your Twin uses</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {skills.length} skills · {goals.length} goals · {interests.length} interests
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sources.map((source) => (
                        <Badge key={source} variant="secondary" className="text-[11px]">
                          {source === "linkedin_url_demo"
                            ? "LinkedIn URL (demo import)"
                            : source === "resume"
                              ? "Résumé"
                              : source === "github_url"
                                ? "GitHub (public API)"
                                : "Your answers"}
                        </Badge>
                      ))}
                      {picked.length > 0 ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Your answers
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <h2 className="mt-7 text-sm font-bold">Top matches right now</h2>
                {rankedMembers.length > 0 ? (
                  <MatchList ranked={rankedMembers.slice(0, 3)} />
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {rankedDemo.slice(0, 3).map(({ candidate, score, reasons }) => (
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
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    className="h-12 flex-1 text-base"
                    onClick={() => void navigate({ to: "/network" })}
                  >
                    Explore your network <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                  <Button variant="outline" className="h-12" onClick={skipToDashboard}>
                    Go to dashboard
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Twin confidence keeps rising as you add sources in My Twin and connect with people.
                </p>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
