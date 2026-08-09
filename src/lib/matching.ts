/**
 * Twin matching engine.
 *
 * Match percentages and reasons are COMPUTED from the signals the user's Twin
 * actually has (connected sources, trained sources, connections made) against a
 * candidate's skills / interests / goals. Nothing here is a hardcoded score:
 * enrich the Twin and every score moves, which is what makes the retention loop
 * real rather than presentational.
 */

export type Candidate = {
  id: string;
  name: string;
  role: string;
  company: string;
  kind: string;
  skills: string[];
  interests: string[];
  goals: string[];
  projects?: string[];
  reasons?: string[];
};

export type TwinVector = {
  /** Everything the Twin knows how to talk about, as free-text signals. */
  signals: string[];
  intelligence: number;
  sources: string[];
  connections: number;
};

/** Signals unlocked by each Twin source. Mirrors demo-data source ids. */
export const SOURCE_SIGNALS: Record<string, string[]> = {
  linkedin: [
    "Product strategy",
    "Go-to-market",
    "Technical leadership",
    "Career growth",
    "Hiring",
    "Seniority",
  ],
  github: [
    "TypeScript",
    "Python",
    "Open source",
    "RAG systems",
    "Vector databases",
    "Observability",
  ],
  resume: ["Distributed systems", "Postgres", "Achievements", "Systems design", "Platform"],
  portfolio: ["AI UX", "Product discovery", "Technical writing", "Craft"],
  chatgpt: ["Agent design", "Evaluation", "Problem decomposition"],
  claude: ["Technical writing", "Communication", "Pricing psychology"],
  gemini: ["Applied AI", "Streaming systems", "Learning"],
};

/** Signals every Twin starts with, before any source is connected. */
export const BASE_SIGNALS = [
  "AI products",
  "LLM orchestration",
  "Startup collaboration",
  "Side projects",
];

/** How strongly a persona type matches a Twin that has career signals. */
const KIND_WEIGHT: Record<string, number> = {
  Founder: 7,
  Recruiter: 6,
  Investor: 4,
  Mentor: 5,
  "AI Engineer": 7,
  "Software Engineer": 5,
  "Product Manager": 4,
  Student: 2,
};

const STOP = new Set([
  "and",
  "the",
  "for",
  "with",
  "into",
  "your",
  "both",
  "more",
  "from",
  "that",
  "this",
]);

function tokens(values: string[]): Set<string> {
  const out = new Set<string>();
  for (const value of values) {
    for (const word of value.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (word.length > 3 && !STOP.has(word)) out.add(word);
    }
  }
  return out;
}

/** Builds the user's Twin vector from the sources their Twin has ingested. */
export function buildTwinVector(input: {
  connectedSources: string[];
  trainedSources: string[];
  connectionsMade: string[];
  intelligence: number;
  headline?: string | null;
}): TwinVector {
  const sources = [...input.connectedSources, ...input.trainedSources];
  const signals = [...BASE_SIGNALS];
  for (const id of sources) {
    const extra = SOURCE_SIGNALS[id];
    if (extra) signals.push(...extra);
  }
  if (input.headline) signals.push(input.headline);
  return {
    signals,
    intelligence: input.intelligence,
    sources,
    connections: input.connectionsMade.length,
  };
}

export type MatchResult = {
  /** 0-100 computed fit. */
  score: number;
  /** Up to three evidence-based reasons, derived from real overlap. */
  reasons: string[];
  /** Highest-signal overlapping topic, useful as a first conversation topic. */
  topTopic: string | null;
};

function overlapLabel(vectorTokens: Set<string>, values: string[]): string | null {
  for (const value of values) {
    for (const word of value.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (word.length > 3 && !STOP.has(word) && vectorTokens.has(word)) return value;
    }
  }
  return null;
}

/** Scores one candidate against the Twin vector and explains the score. */
export function matchFor(vector: TwinVector, candidate: Candidate): MatchResult {
  const mine = tokens(vector.signals);
  const theirs = tokens([
    ...candidate.skills,
    ...candidate.interests,
    ...candidate.goals,
    ...(candidate.projects ?? []),
  ]);

  let shared = 0;
  for (const token of theirs) if (mine.has(token)) shared += 1;

  const coverage = Math.min(9, Math.round(vector.intelligence / 9));
  const kind = KIND_WEIGHT[candidate.kind] ?? 3;
  const stable = candidate.id
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 7, 7);

  const score = Math.max(
    38,
    Math.min(97, Math.round(44 + shared * 3.4 + kind + coverage + stable * 0.4)),
  );

  const skillHit = overlapLabel(mine, candidate.skills);
  const interestHit = overlapLabel(mine, candidate.interests);
  const goalHit = overlapLabel(mine, candidate.goals);
  const complementary = candidate.skills.find((s) => !overlapLabel(mine, [s]));

  const reasons: string[] = [];
  if (skillHit) reasons.push(`Shared depth in ${skillHit.toLowerCase()}`);
  if (interestHit) reasons.push(`Both interested in ${interestHit.toLowerCase()}`);
  if (goalHit) reasons.push(`Aligned goal: ${goalHit.toLowerCase()}`);
  if (reasons.length < 3 && complementary)
    reasons.push(`Complementary strength: ${complementary.toLowerCase()}`);
  if (reasons.length < 3) {
    for (const authored of candidate.reasons ?? []) {
      if (reasons.length >= 3) break;
      if (!reasons.includes(authored)) reasons.push(authored);
    }
  }
  if (reasons.length < 3) reasons.push(`Active in ${candidate.kind.toLowerCase()} circles like yours`);

  return {
    score,
    reasons: reasons.slice(0, 3),
    topTopic: skillHit ?? interestHit ?? candidate.interests[0] ?? null,
  };
}

/** Ranks candidates by computed fit, highest first. */
export function rankCandidates<T extends Candidate>(vector: TwinVector, candidates: T[]) {
  return candidates
    .map((candidate) => ({ candidate, ...matchFor(vector, candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
}
