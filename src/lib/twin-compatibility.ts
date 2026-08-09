/**
 * Twin-to-Twin compatibility for REAL SyncdIn members.
 *
 * This deliberately reuses the single scoring engine in `matching.ts`
 * (`matchFor`) so real members and demo personas are scored the same way.
 * Everything here is derived from signals both people actually stored — when
 * there is no overlap the result says so instead of inventing a reason.
 */
import { matchFor, type Candidate, type TwinVector } from "@/lib/matching";
import type { PublicProfile } from "@/lib/real-people";

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
  "using",
  "about",
]);

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

function tokenSet(values: string[]): Set<string> {
  const out = new Set<string>();
  for (const value of values) for (const w of words(value)) out.add(w);
  return out;
}

/** Signals from a profile the Twin can reason about. */
export function profileSignals(p: {
  skills?: string[] | null;
  goals?: string[] | null;
  interests?: string[] | null;
  headline?: string | null;
  twin_summary?: string | null;
}): string[] {
  return [
    ...(p.skills ?? []),
    ...(p.goals ?? []),
    ...(p.interests ?? []),
    ...(p.headline ? [p.headline] : []),
  ].filter(Boolean);
}

/** Adapts a real member into the shape the shared matching engine expects. */
export function candidateFromProfile(p: PublicProfile): Candidate {
  return {
    id: p.id,
    name: p.full_name ?? "SyncdIn member",
    role: p.headline ?? "",
    company: "",
    kind: "",
    skills: p.skills ?? [],
    interests: p.interests ?? [],
    goals: p.goals ?? [],
    projects: [],
    // No authored fallback reasons for real people — evidence only.
    reasons: [],
  };
}

export type ActivityTier = "live" | "today" | "week" | "month" | "dormant";

export type Activity = {
  tier: ActivityTier;
  label: string;
  /** Ranking adjustment: active people surface above dormant ones. */
  weight: number;
  minutesAgo: number | null;
};

/** Turns `last_active_at` into a ranking weight and an honest label. */
export function activityOf(lastActiveAt: string | null | undefined): Activity {
  if (!lastActiveAt) {
    return { tier: "dormant", label: "Activity unknown", weight: -10, minutesAgo: null };
  }
  const minutes = Math.max(0, Math.round((Date.now() - new Date(lastActiveAt).getTime()) / 60000));
  if (minutes <= 45) return { tier: "live", label: "Active now", weight: 10, minutesAgo: minutes };
  if (minutes <= 60 * 24)
    return { tier: "today", label: "Active today", weight: 7, minutesAgo: minutes };
  if (minutes <= 60 * 24 * 7)
    return { tier: "week", label: "Active this week", weight: 4, minutesAgo: minutes };
  if (minutes <= 60 * 24 * 30)
    return { tier: "month", label: "Active this month", weight: 0, minutesAgo: minutes };
  return { tier: "dormant", label: "Dormant account", weight: -14, minutesAgo: minutes };
}

export type TwinBrief = {
  /** Computed fit from the shared engine — never hardcoded. */
  score: number;
  /** Evidence-only reasons. Empty when the two Twins share nothing yet. */
  reasons: string[];
  /** Labels both Twins hold. */
  sharedSignals: string[];
  /** Their strengths the user does not have. */
  complementary: string[];
  /** Their stated goals, useful as "what they're looking for". */
  theirGoals: string[];
  /** A concrete thing the two could do together, when the data supports one. */
  collaboration: string | null;
  /** A copyable opening message. */
  opener: string;
  /** True when at least one reason comes from real overlap. */
  hasEvidence: boolean;
  topTopic: string | null;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function lower(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * Compares the signed-in user's Twin with a real member's Twin.
 * `me` is only used for the suggested opener, never for scoring.
 */
export function twinBrief(
  vector: TwinVector,
  profile: PublicProfile,
  me?: { name?: string | null; headline?: string | null },
): TwinBrief {
  const candidate = candidateFromProfile(profile);
  const { score, topTopic } = matchFor(vector, candidate);

  const mine = tokenSet(vector.signals);
  const overlaps = (values: string[]) =>
    values.filter((value) => words(value).some((w) => mine.has(w)));

  const sharedSkills = overlaps(profile.skills ?? []);
  const sharedInterests = overlaps(profile.interests ?? []);
  const sharedGoals = overlaps(profile.goals ?? []);
  const sharedSignals = Array.from(new Set([...sharedSkills, ...sharedInterests, ...sharedGoals]));
  const complementary = (profile.skills ?? [])
    .filter((s) => !words(s).some((w) => mine.has(w)))
    .slice(0, 4);

  const reasons: string[] = [];
  if (sharedSkills[0]) reasons.push(`You both work with ${lower(sharedSkills[0])}`);
  if (sharedInterests[0]) reasons.push(`Shared interest in ${lower(sharedInterests[0])}`);
  if (sharedGoals[0]) reasons.push(`Aligned goal: ${lower(sharedGoals[0])}`);
  if (reasons.length < 3 && complementary[0])
    reasons.push(`They add ${lower(complementary[0])}, which your Twin does not cover yet`);

  const theirGoals = profile.goals ?? [];
  const anchor = sharedSkills[0] ?? sharedInterests[0] ?? sharedGoals[0] ?? null;

  let collaboration: string | null = null;
  if (anchor && theirGoals[0]) {
    collaboration = `Use your shared ground in ${lower(anchor)} to help with their goal: ${lower(theirGoals[0])}.`;
  } else if (anchor) {
    collaboration = `Compare notes on ${lower(anchor)} — it is the strongest overlap between your Twins.`;
  } else if (complementary[0]) {
    collaboration = `Trade expertise: they go deep on ${lower(complementary[0])}.`;
  }

  const name = firstName(profile.full_name ?? "there");
  const myHeadline = me?.headline?.trim();
  const opener = anchor
    ? `Hi ${name} — our Twins flagged ${lower(anchor)} as common ground${
        myHeadline ? `. I'm ${lower(myHeadline)}` : ""
      }${theirGoals[0] ? `, and I saw you're working on ${lower(theirGoals[0])}` : ""}. Worth a short conversation?`
    : `Hi ${name} — ${
        profile.headline
          ? `I came across your work on ${lower(profile.headline)}`
          : "your profile came up in my SyncdIn network"
      } and thought it was worth reaching out${
        myHeadline ? `. I'm ${lower(myHeadline)}` : ""
      }. Open to a short conversation?`;

  return {
    score,
    reasons: reasons.slice(0, 3),
    sharedSignals,
    complementary,
    theirGoals,
    collaboration,
    opener,
    hasEvidence: reasons.length > 0,
    topTopic,
  };
}

export type RankedProfile<T extends PublicProfile = PublicProfile> = {
  profile: T;
  brief: TwinBrief;
  activity: Activity;
  /** Fit adjusted for activity — what the list is ordered by. */
  ranked: number;
};

/** Ranks real members by computed fit AND how recently their Twin was active. */
export function rankProfiles<T extends PublicProfile>(
  vector: TwinVector,
  profiles: T[],
  me?: { name?: string | null; headline?: string | null },
): RankedProfile<T>[] {
  return profiles
    .map((profile) => {
      const brief = twinBrief(vector, profile, me);
      const activity = activityOf(profile.last_active_at);
      return {
        profile,
        brief,
        activity,
        ranked: brief.score + activity.weight,
      };
    })
    .sort(
      (a, b) =>
        b.ranked - a.ranked ||
        b.brief.score - a.brief.score ||
        (a.profile.full_name ?? "").localeCompare(b.profile.full_name ?? ""),
    );
}
