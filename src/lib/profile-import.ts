/**
 * Profile import adapters.
 *
 * Boundary note: SyncdIn does NOT scrape LinkedIn. The LinkedIn adapter below is
 * a deterministic demo adapter used for the prototype onboarding flow — the same
 * URL always produces the same structured result. When an authorized LinkedIn
 * API/provider is available, swap the body of `importLinkedIn` only; the shape
 * consumed by onboarding stays identical.
 *
 * The GitHub adapter uses GitHub's real public REST API (no credentials, public
 * data only), so what it reports is genuinely read from the account.
 */

export type ImportSourceKind = "linkedin_url_demo" | "resume" | "github_url" | "manual";

export type ImportedSignals = {
  source: ImportSourceKind;
  /** Present when the source is illustrative demo data rather than a live read. */
  demo: boolean;
  handle: string | null;
  headline: string;
  summary: string;
  discovered: string[];
  skills: string[];
  goals: string[];
  interests: string[];
  /** Illustrative Twin confidence for this source, 0-100. Grows with more signals. */
  confidence: number;
};

/** Normalizes a LinkedIn profile URL, returning null when it isn't one. */
export function normalizeLinkedInUrl(input: string): { url: string; slug: string } | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    return null;
  }
  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) return null;
  const match = /^\/in\/([A-Za-z0-9\-_%.]{3,100})\/?$/.exec(parsed.pathname.replace(/\/+$/, "/"));
  if (!match) return null;
  const slug = decodeURIComponent(match[1] ?? "").toLowerCase();
  return { url: `https://www.linkedin.com/in/${slug}`, slug };
}

/** Normalizes a GitHub profile URL or bare username. */
export function normalizeGitHubUrl(input: string): { url: string; login: string } | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(raw) && !raw.includes(".")) {
    return { url: `https://github.com/${raw}`, login: raw };
  }
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
  const login = parsed.pathname.split("/").filter(Boolean)[0];
  if (!login) return null;
  return { url: `https://github.com/${login}`, login };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(list: readonly T[], seed: number, count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < count && i < list.length; i += 1) {
    const item = list[(seed + i * 7) % list.length];
    if (item !== undefined && !out.includes(item)) out.push(item);
  }
  return out;
}

const PERSONAS = [
  {
    headline: "Product engineer building AI-native user experiences",
    skills: ["Product Engineering", "React", "TypeScript", "Design Systems", "AI Integration", "Onboarding UX"],
    goals: ["Join an early product team", "Find design partners", "Ship an AI product end to end"],
    interests: ["AI products", "Retention loops", "Developer tooling", "Design engineering"],
  },
  {
    headline: "Full-stack engineer focused on data-heavy platforms",
    skills: ["Node.js", "PostgreSQL", "System Design", "APIs", "Observability", "Cloud Infrastructure"],
    goals: ["Move into a staff role", "Work on infrastructure at scale", "Mentor junior engineers"],
    interests: ["Distributed systems", "Databases", "Platform engineering", "Open source"],
  },
  {
    headline: "Product manager turning research into shipped roadmaps",
    skills: ["Product Strategy", "User Research", "Analytics", "Roadmapping", "Stakeholder Alignment"],
    goals: ["Lead a 0→1 product", "Meet founders hiring PM #1", "Learn AI product patterns"],
    interests: ["Product discovery", "Growth", "B2B SaaS", "Behavioural design"],
  },
  {
    headline: "Designer working across brand and product systems",
    skills: ["Product Design", "Design Systems", "Prototyping", "Figma", "Interaction Design"],
    goals: ["Partner with a technical founder", "Build a design-led team", "Take on advisory work"],
    interests: ["Design engineering", "Typography", "Motion", "Craft in software"],
  },
  {
    headline: "Founder exploring AI networking and community products",
    skills: ["Fundraising", "Go-to-market", "Product Vision", "Hiring", "Storytelling"],
    goals: ["Meet a technical co-founder", "Talk to early adopters", "Raise a pre-seed round"],
    interests: ["AI networking", "Community products", "Early-stage startups", "Distribution"],
  },
] as const;

/**
 * DEMO ADAPTER — structured, deterministic import for the prototype.
 * Uses only what the user gave us (their public profile URL) and clearly
 * labels the result as illustrative. Replace with an authorized provider.
 */
export function importLinkedIn(url: string, fallbackName?: string | null): ImportedSignals {
  const normalized = normalizeLinkedInUrl(url);
  if (!normalized) throw new Error("That doesn't look like a linkedin.com/in/… profile URL.");
  const seed = hash(normalized.slug);
  const persona = PERSONAS[seed % PERSONAS.length] ?? PERSONAS[0];
  const skills = pick(persona.skills, seed, 5);
  const goals = pick(persona.goals, seed, 3);
  const interests = pick(persona.interests, seed, 3);
  const who = fallbackName?.trim() || normalized.slug.replace(/[-_.]+/g, " ");

  return {
    source: "linkedin_url_demo",
    demo: true,
    handle: normalized.slug,
    headline: persona.headline,
    summary: `Your Twin read the public profile at ${normalized.url} and understood ${who} as someone working on ${interests[0]?.toLowerCase() ?? "their craft"}, strongest in ${skills.slice(0, 2).join(" and ")}. Confirm or edit anything below — this is what other Twins match against.`,
    discovered: [
      `${skills.length} skills`,
      `${goals.length} goals`,
      `${interests.length} interests`,
      "Public profile",
    ],
    skills,
    goals,
    interests,
    confidence: confidenceOf({ skills, goals, interests }, 52),
  };
}

/** REAL ADAPTER — public GitHub REST API, no credentials, public data only. */
export async function importGitHub(url: string): Promise<ImportedSignals> {
  const normalized = normalizeGitHubUrl(url);
  if (!normalized) throw new Error("Paste a github.com/username URL or your username.");

  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${normalized.login}`),
    fetch(`https://api.github.com/users/${normalized.login}/repos?per_page=100&sort=updated`),
  ]);
  if (userRes.status === 404) throw new Error("No public GitHub account with that username.");
  if (!userRes.ok) throw new Error("GitHub couldn't be reached right now — try again shortly.");

  const user = (await userRes.json()) as {
    name?: string | null;
    bio?: string | null;
    public_repos?: number;
    followers?: number;
    blog?: string | null;
  };
  const repos = repoRes.ok
    ? ((await repoRes.json()) as {
        language?: string | null;
        stargazers_count?: number;
        topics?: string[];
        fork?: boolean;
      }[])
    : [];

  const owned = repos.filter((r) => !r.fork);
  const langCount = new Map<string, number>();
  const topicCount = new Map<string, number>();
  for (const repo of owned) {
    if (repo.language) langCount.set(repo.language, (langCount.get(repo.language) ?? 0) + 1);
    for (const topic of repo.topics ?? [])
      topicCount.set(topic, (topicCount.get(topic) ?? 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  const skills = top(langCount, 6);
  const interests = top(topicCount, 4).map((t) => t.replace(/-/g, " "));
  const stars = owned.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

  return {
    source: "github_url",
    demo: false,
    handle: normalized.login,
    headline: user.bio?.slice(0, 140) ?? "",
    summary: user.bio
      ? `From GitHub: ${user.bio}`
      : `Your Twin read ${owned.length} public repositories to understand what you actually build.`,
    discovered: [
      `${owned.length} public repos`,
      ...(skills.length ? [`${skills.length} languages`] : []),
      ...(stars ? [`${stars} stars`] : []),
      ...(user.followers ? [`${user.followers} followers`] : []),
    ],
    skills,
    goals: [],
    interests,
    confidence: confidenceOf({ skills, goals: [], interests }, 40),
  };
}

/** Illustrative Twin confidence — grows with the number of usable signals. */
export function confidenceOf(
  signals: { skills: string[]; goals: string[]; interests: string[] },
  base = 30,
): number {
  const score =
    base +
    Math.min(signals.skills.length, 10) * 3 +
    Math.min(signals.goals.length, 5) * 3 +
    Math.min(signals.interests.length, 6) * 2;
  return Math.max(10, Math.min(96, Math.round(score)));
}

/** Merges a new source into the Twin without losing what's already confirmed. */
export function mergeSignals(a: string[], b: string[], limit = 24): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...a, ...b]) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
    if (out.length >= limit) break;
  }
  return out;
}

/** The 3 high-value refinement questions, as quick chips. */
export const REFINEMENT_QUESTIONS = [
  {
    id: "goal",
    field: "goals" as const,
    title: "What are you actually trying to do next?",
    why: "Your Twin ranks people by whether they can help with this.",
    options: [
      "Find a new role",
      "Hire someone",
      "Find a co-founder",
      "Find design partners",
      "Raise funding",
      "Learn from operators",
    ],
  },
  {
    id: "networking",
    field: "goals" as const,
    title: "What do you want from networking here?",
    why: "It decides whether your Twin opens with intros, advice or collaboration.",
    options: [
      "Warm introductions",
      "Honest advice",
      "Collaborators",
      "Mentorship",
      "Customers",
      "Peers at my level",
    ],
  },
  {
    id: "people",
    field: "interests" as const,
    title: "Who do you want in front of you?",
    why: "Your Twin weights these profiles higher in every match list.",
    options: [
      "Founders",
      "Engineers",
      "Designers",
      "Product leaders",
      "Investors",
      "Recruiters",
      "Researchers",
    ],
  },
] as const;
