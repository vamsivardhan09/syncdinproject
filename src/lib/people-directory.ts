/**
 * Resolves a persisted `peer_slug` back to a person.
 *
 * Connections store only the peer slug, and event attendees are generated
 * deterministically from the demo personas, so a slug like
 * `aws-summit-bengaluru-a12` can be rebuilt exactly after a refresh.
 */
import { demoPeople, personById, type DemoPerson } from "@/lib/demo-data";
import { attendeesFor, networkByCode } from "@/lib/event-network";

const cache = new Map<string, DemoPerson | null>();

export function resolvePerson(slug: string): DemoPerson | null {
  if (cache.has(slug)) return cache.get(slug) ?? null;

  let found: DemoPerson | null = personById(slug) ?? null;

  if (!found) {
    const match = /^(.*)-a\d+$/.exec(slug);
    const network = match?.[1] ? networkByCode(match[1]) : undefined;
    if (network) {
      found = attendeesFor(network).find((a) => a.id === slug) ?? null;
    }
  }

  cache.set(slug, found);
  return found;
}

/** Resolves many slugs, dropping anything unknown. */
export function resolvePeople(slugs: string[]): DemoPerson[] {
  return slugs.map(resolvePerson).filter((p): p is DemoPerson => p !== null);
}

/**
 * Adapts a real SyncdIn member's public profile into the same shape the
 * demo-person UI (and the Twin chat) already consumes.
 */
export function personFromProfile(p: {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  skills: string[] | null;
  goals: string[] | null;
  interests: string[] | null;
  twin_summary: string | null;
  twin_intelligence: number | null;
}): DemoPerson {
  const name = p.full_name?.trim() || "SyncdIn member";
  const headline = p.headline?.trim() || "Building their AI Twin on SyncdIn";
  const skills = p.skills ?? [];
  const first = name.split(" ")[0] ?? name;
  return {
    id: p.id,
    name,
    initials: name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    role: headline,
    company: "SyncdIn",
    kind: "Mentor",
    location: p.location?.trim() || "Location not shared",
    match: Math.max(50, Math.min(99, Math.round(p.twin_intelligence ?? 70))),
    bio: p.twin_summary?.trim() || `${name} is on SyncdIn and their Twin is learning from real work.`,
    aiSummary:
      p.twin_summary?.trim() ||
      `Your Twin will use ${first}'s live profile signals to keep this conversation useful.`,
    skills,
    interests: p.interests ?? [],
    goals: p.goals ?? [],
    projects: [],
    sharedGoals: [],
    complementarySkills: skills.slice(0, 3),
    suggestedCollaboration: "Compare what you're each working on and find the overlap.",
    conversationStarter: `Hi ${first} — our Twins matched. What are you working on right now?`,
    reasons: ["Real SyncdIn member", ...(skills.length ? [`Works with ${skills.slice(0, 3).join(", ")}`] : [])],
    accent: "violet",
  };
}

export { demoPeople };

