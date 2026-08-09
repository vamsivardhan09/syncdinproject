/**
 * What the Twin currently knows, and what is still missing.
 *
 * Derived from the sources the user actually connected (see matching.ts), so the
 * summary and the gap list move whenever the Twin is enriched. Nothing here is
 * hardcoded per user.
 */
import { BASE_SIGNALS, SOURCE_SIGNALS } from "@/lib/matching";

export type KnowledgeGroup = {
  key: "skills" | "goals" | "interests" | "projects" | "career";
  label: string;
  items: string[];
};

const GROUPS: Record<KnowledgeGroup["key"], string[]> = {
  career: ["Technical leadership", "Seniority", "Hiring", "Career growth", "Platform", "Achievements"],
  skills: [
    "TypeScript",
    "Python",
    "Distributed systems",
    "Postgres",
    "Systems design",
    "Vector databases",
    "Observability",
    "Streaming systems",
  ],
  projects: ["Open source", "RAG systems", "Agent design", "Applied AI", "AI UX", "Craft"],
  goals: ["Go-to-market", "Product strategy", "Product discovery", "Startup collaboration", "Side projects"],
  interests: [
    "AI products",
    "LLM orchestration",
    "Evaluation",
    "Technical writing",
    "Communication",
    "Learning",
    "Problem decomposition",
    "Pricing psychology",
  ],
};

const LABELS: Record<KnowledgeGroup["key"], string> = {
  career: "Career signal",
  skills: "Skills",
  projects: "Projects",
  goals: "Goals",
  interests: "Interests",
};

/** Every signal the Twin can currently reason about. */
export function twinSignals(sources: string[]) {
  const out = new Set(BASE_SIGNALS);
  for (const id of sources) for (const s of SOURCE_SIGNALS[id] ?? []) out.add(s);
  return Array.from(out);
}

/** Groups the Twin's signals into the categories shown on the Twin page. */
export function twinKnowledge(sources: string[]): KnowledgeGroup[] {
  const signals = new Set(twinSignals(sources));
  return (Object.keys(GROUPS) as KnowledgeGroup["key"][]).map((key) => ({
    key,
    label: LABELS[key],
    items: GROUPS[key].filter((item) => signals.has(item)),
  }));
}

export type SignalGap = {
  id: string;
  /** What is missing. */
  missing: string;
  /** The concrete matching benefit of closing it. */
  benefit: string;
  /** Source id that closes the gap. */
  source: string;
};

const GAPS: SignalGap[] = [
  {
    id: "career",
    missing: "Career history and seniority",
    benefit: "Unlocks recruiter and hiring-manager matches at the right level",
    source: "linkedin",
  },
  {
    id: "projects",
    missing: "Shipped projects and code",
    benefit: "Lets your Twin match on what you actually built, not job titles",
    source: "github",
  },
  {
    id: "achievements",
    missing: "Achievements and systems experience",
    benefit: "Stronger founder and staff-plus engineering matches",
    source: "resume",
  },
  {
    id: "craft",
    missing: "Craft and positioning",
    benefit: "Better product and design collaborations",
    source: "portfolio",
  },
  {
    id: "goals",
    missing: "Career goals in your own words",
    benefit: "Aligns matches with where you're heading, not where you've been",
    source: "chatgpt",
  },
  {
    id: "voice",
    missing: "Your writing voice",
    benefit: "Outreach that sounds like you instead of a template",
    source: "claude",
  },
  {
    id: "learning",
    missing: "What you're learning now",
    benefit: "Surfaces mentors and peers on the same curve",
    source: "gemini",
  },
];

/** The gaps still open, highest value first. */
export function openGaps(sources: string[], limit = 4) {
  return GAPS.filter((g) => !sources.includes(g.source)).slice(0, limit);
}

/** The single highest-value next action for the Twin. */
export function nextBestAction(sources: string[]) {
  return openGaps(sources, 1)[0] ?? null;
}
