/**
 * Event / community networks.
 *
 * Attendees are SEEDED DEMO DATA generated deterministically from the nine
 * demo personas — there is no live event-platform API in this prototype. The
 * matching, screening and retention behaviour on top of them is real.
 */
import { demoPeople, type DemoPerson, type PersonaKind } from "@/lib/demo-data";

export type EventNetwork = {
  code: string;
  name: string;
  kind: "Conference" | "Community";
  tagline: string;
  location: string;
  dates: string;
  attendeeCount: number;
  host: string;
};

export const networks: EventNetwork[] = [
  {
    code: "ai-builders-summit-2026",
    name: "AI Builders Summit 2026",
    kind: "Conference",
    tagline: "Two days of applied AI, infrastructure and agent design.",
    location: "San Francisco, CA",
    dates: "12–13 March 2026",
    attendeeCount: 104,
    host: "Loomlane AI + Kestrel Labs",
  },
  {
    code: "staff-plus-circle",
    name: "Staff+ Engineering Circle",
    kind: "Community",
    tagline: "A trusted community for engineers moving into staff-plus scope.",
    location: "Remote",
    dates: "Ongoing",
    attendeeCount: 68,
    host: "Arcadia Systems",
  },
];

export function networkByCode(code: string) {
  return networks.find((n) => n.code === code);
}

export type Attendee = DemoPerson & { attendeeOf: string };

const FIRST = [
  "Maya","Jonas","Ife","Camila","Rohan","Elena","Tobias","Nadia","Felix","Amara",
  "Ravi","Sofia","Lukas","Hana","Omar","Clara","Bruno","Yuki","Idris","Nora",
  "Anders","Leila","Mateo","Zara","Kwame","Ingrid","Dario","Mei","Samir","Alba",
];

const LAST = [
  "Okafor","Lindqvist","Moreau","Ibrahim","Duarte","Kaminski","Reyes","Halvorsen",
  "Osei","Bianchi","Nakamura","Petrov","Almeida","Fischer","Sandoval","Bergström",
];

const COMPANIES = [
  "Northwind Labs","Cobalt Systems","Verity AI","Tessellate","Harbor Compute",
  "Lumen Retrieval","Fathom Data","Beacon Robotics","Quill AI","Anchorpoint",
  "Meridian Health","Openframe","Riverstack","Nimbus Eval","Foundry Nine",
];

const EXTRA_SKILLS = [
  "Prompt evaluation","Fine-tuning","Inference cost control","Data labelling",
  "Vector search","Model routing","Analytics","Design systems","Security review",
];

/** Stable pseudo-random from a string seed, so results never shuffle on reload. */
function seeded(seed: string, i: number) {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k += 1) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(list: T[], n: number): T {
  return list[n % list.length]!;
}

/**
 * Builds the seeded attendee list for a network: the nine rich demo personas
 * plus generated variants derived from them, so every attendee has coherent
 * skills, goals and projects for the matching engine to reason about.
 */
export function attendeesFor(network: EventNetwork): Attendee[] {
  const base: Attendee[] = demoPeople.map((p) => ({ ...p, attendeeOf: network.code }));
  const generated: Attendee[] = [];
  const target = network.attendeeCount - base.length;

  for (let i = 0; i < target; i += 1) {
    const archetype = demoPeople[i % demoPeople.length]!;
    const r = seeded(network.code, i);
    const first = pick(FIRST, r);
    const last = pick(LAST, r >> 3);
    const company = pick(COMPANIES, r >> 5);
    const extra = pick(EXTRA_SKILLS, r >> 7);
    const droppedSkills = archetype.skills.filter((_, k) => (r >> (k + 2)) % 4 !== 0);

    generated.push({
      ...archetype,
      attendeeOf: network.code,
      id: `${network.code}-a${i}`,
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      company,
      location: archetype.location,
      skills: [...droppedSkills, extra],
      interests: archetype.interests.filter((_, k) => (r >> (k + 1)) % 5 !== 0),
      goals: archetype.goals.filter((_, k) => (r >> (k + 4)) % 4 !== 0),
      bio: archetype.bio,
      aiSummary: `${first}'s Twin is active in this network and overlaps with your work on ${extra.toLowerCase()}.`,
      conversationStarter: `Hi ${first} — our Twins matched inside ${network.name}. I'd love to compare notes on ${extra.toLowerCase()}.`,
      reasons: archetype.reasons,
    });
  }

  return [...base, ...generated];
}

export const attendeeFilters: (PersonaKind | "All")[] = [
  "All",
  "Founder",
  "Recruiter",
  "AI Engineer",
  "Software Engineer",
  "Investor",
  "Mentor",
  "Product Manager",
  "Student",
];

/** Collaboration band shown on the screening outcome card. */
export function collaborationBand(score: number) {
  if (score >= 90) return { label: "Very high", tone: "text-success" };
  if (score >= 80) return { label: "High", tone: "text-primary" };
  if (score >= 70) return { label: "Worth exploring", tone: "text-info" };
  return { label: "Low priority", tone: "text-muted-foreground" };
}
