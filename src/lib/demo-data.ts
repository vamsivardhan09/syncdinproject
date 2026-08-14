export type PersonaKind =
  | "Recruiter"
  | "Founder"
  | "AI Engineer"
  | "Software Engineer"
  | "Product Manager"
  | "Investor"
  | "Student"
  | "Mentor";

export type DemoPerson = {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  kind: PersonaKind;
  location: string;
  match: number;
  bio: string;
  aiSummary: string;
  skills: string[];
  interests: string[];
  goals: string[];
  projects: string[];
  sharedGoals: string[];
  complementarySkills: string[];
  suggestedCollaboration: string;
  conversationStarter: string;
  reasons: string[];
  accent: "violet" | "blue" | "green" | "amber";
};

const person = (p: DemoPerson) => p;

export const demoPeople: DemoPerson[] = [
  person({
    id: "sarah-chen",
    name: "Sarah Chen",
    initials: "SC",
    role: "Founder & CEO",
    company: "Loomlane AI",
    kind: "Founder",
    location: "San Francisco, CA",
    match: 94,
    bio: "Building agentic workflow infrastructure for revenue teams. Second-time founder, previously led growth engineering at a Series C fintech.",
    aiSummary:
      "Sarah's twin is optimising for a technical co-founder with production LLM experience. Your project history maps almost perfectly onto her current hiring gap.",
    skills: ["Product strategy", "LLM orchestration", "Go-to-market", "TypeScript"],
    interests: ["Agent design", "Dev tools", "Pricing psychology"],
    goals: ["Find a technical co-founder", "Ship v2 by Q4", "Raise a seed round"],
    projects: ["Loomlane Agents", "Open-source eval harness"],
    sharedGoals: ["Both building AI products", "Both exploring seed-stage funding"],
    complementarySkills: ["She owns GTM, you own inference infrastructure"],
    suggestedCollaboration: "Prototype an AI SaaS together over a two-week build sprint.",
    conversationStarter:
      "Hi Sarah — our AI Twins noticed we're both building agentic products, from opposite ends of the stack. I'd love to compare notes on evals.",
    reasons: [
      "Both building AI products",
      "Complementary technical and GTM skills",
      "Both open to startup collaboration",
    ],
    accent: "violet",
  }),
  person({
    id: "marcus-hale",
    name: "Marcus Hale",
    initials: "MH",
    role: "Technical Recruiter",
    company: "Northbeam Talent",
    kind: "Recruiter",
    location: "Austin, TX",
    match: 91,
    bio: "Hires senior AI and platform engineers for late-seed to Series B startups. Places 40+ engineers a year.",
    aiSummary:
      "Marcus is actively sourcing for three AI infrastructure roles that match your stack and seniority band within 8%.",
    skills: ["Technical sourcing", "Compensation benchmarking", "Interview design"],
    interests: ["AI infra hiring", "Remote-first teams"],
    goals: ["Fill 3 senior AI roles", "Build a warm engineering pipeline"],
    projects: ["AI infra talent report 2026"],
    sharedGoals: ["You want senior AI roles, he is hiring for them"],
    complementarySkills: ["He has the openings, you have the shipped systems"],
    suggestedCollaboration: "A 15-minute intro call on two roles that fit your profile.",
    conversationStarter:
      "Hi Marcus — my AI Twin flagged your open AI infra roles as a strong fit for what I've shipped. Worth a short call?",
    reasons: [
      "Hiring for your exact stack",
      "Seniority band matches your experience",
      "Roles are remote-friendly like your preference",
    ],
    accent: "blue",
  }),
  person({
    id: "aisha-rahman",
    name: "Aisha Rahman",
    initials: "AR",
    role: "Staff AI Engineer",
    company: "Kestrel Labs",
    kind: "AI Engineer",
    location: "London, UK",
    match: 89,
    bio: "Works on retrieval quality and evaluation tooling for production LLM systems. Writes a weekly newsletter on eval design.",
    aiSummary:
      "Aisha's twin shares your retrieval-quality obsession. She has depth where your twin flagged gaps in evaluation methodology.",
    skills: ["RAG systems", "Evaluation", "Python", "Vector databases"],
    interests: ["Eval benchmarks", "Open source", "Technical writing"],
    goals: ["Publish an eval benchmark", "Mentor two engineers"],
    projects: ["evalkit", "Retrieval quality playbook"],
    sharedGoals: ["Both improving LLM reliability"],
    complementarySkills: ["She brings eval rigour, you bring product velocity"],
    suggestedCollaboration: "Co-author an open benchmark for retrieval quality.",
    conversationStarter:
      "Hi Aisha — our Twins matched on retrieval evaluation. I'd love to hear how you score groundedness in production.",
    reasons: [
      "Overlapping technical focus on retrieval",
      "She fills your twin's evaluation knowledge gap",
      "Both active in open source",
    ],
    accent: "green",
  }),
  person({
    id: "diego-ferrer",
    name: "Diego Ferrer",
    initials: "DF",
    role: "Principal Engineer & Mentor",
    company: "Arcadia Systems",
    kind: "Mentor",
    location: "Barcelona, ES",
    match: 87,
    bio: "18 years across distributed systems. Mentors engineers moving from senior to staff and beyond.",
    aiSummary:
      "Diego mentors exactly the transition your twin detected in your goals: senior engineer to technical leadership.",
    skills: ["Distributed systems", "Technical leadership", "Career coaching"],
    interests: ["Staff-plus career paths", "Systems design"],
    goals: ["Mentor 5 engineers this year", "Write a staff engineer guide"],
    projects: ["Staff-plus mentorship circle"],
    sharedGoals: ["You want to grow into staff scope, he coaches that jump"],
    complementarySkills: ["He offers 18 years of leadership pattern recognition"],
    suggestedCollaboration: "Monthly mentorship session on scope and influence.",
    conversationStarter:
      "Hi Diego — my Twin picked up on your staff-plus mentorship work. I'm making that jump now and would value your perspective.",
    reasons: [
      "Mentors your exact career transition",
      "Deep systems background matching your stack",
      "Actively taking on new mentees",
    ],
    accent: "amber",
  }),
  person({
    id: "lena-novak",
    name: "Lena Novak",
    initials: "LN",
    role: "Partner",
    company: "Halden Ventures",
    kind: "Investor",
    location: "Berlin, DE",
    match: 84,
    bio: "Pre-seed and seed investor in AI infrastructure and developer tools. Writes first cheques of €300k–€1.5M.",
    aiSummary:
      "Lena's thesis overlaps with the product direction your twin extracted from your projects.",
    skills: ["Seed investing", "Market sizing", "Founder coaching"],
    interests: ["AI infra", "Developer tools", "Technical founders"],
    goals: ["Back 6 AI infra teams", "Meet more technical founders"],
    projects: ["AI infra thesis 2026"],
    sharedGoals: ["You may raise, she invests in your category"],
    complementarySkills: ["She brings capital and market framing"],
    suggestedCollaboration: "A thesis conversation before you formally raise.",
    conversationStarter:
      "Hi Lena — our Twins matched on AI infrastructure. I'm early on something in that space and would value your read on the market.",
    reasons: [
      "Invests in your product category",
      "Prefers technical founders",
      "Actively meeting pre-seed teams",
    ],
    accent: "violet",
  }),
  person({
    id: "tomas-ekwueme",
    name: "Tomas Ekwueme",
    initials: "TE",
    role: "Senior Product Manager",
    company: "Sable Health",
    kind: "Product Manager",
    location: "Toronto, CA",
    match: 82,
    bio: "Ships AI features in regulated healthcare. Obsessed with turning model behaviour into trustworthy UX.",
    aiSummary:
      "Tomas frames AI trust as a product problem — a lens your twin flagged as underdeveloped in your profile.",
    skills: ["Product discovery", "AI UX", "Regulated environments"],
    interests: ["Trust and safety UX", "Health AI"],
    goals: ["Launch an AI triage flow", "Find engineering partners"],
    projects: ["Sable Triage Copilot"],
    sharedGoals: ["Both shipping user-facing AI"],
    complementarySkills: ["He brings product framing, you bring model depth"],
    suggestedCollaboration: "Trade design reviews on AI trust patterns.",
    conversationStarter:
      "Hi Tomas — our Twins matched on user-facing AI. How do you communicate model uncertainty to clinicians?",
    reasons: [
      "Both shipping production AI features",
      "Complementary product and engineering skills",
      "Shared interest in trust UX",
    ],
    accent: "blue",
  }),
  person({
    id: "priya-menon",
    name: "Priya Menon",
    initials: "PM",
    role: "Backend Engineer",
    company: "Fleetwise",
    kind: "Software Engineer",
    location: "Bengaluru, IN",
    match: 80,
    bio: "Builds high-throughput event pipelines. Currently moving from platform work into applied AI.",
    aiSummary:
      "Priya's twin is looking for peers who already made the platform-to-AI move you completed.",
    skills: ["Go", "Kafka", "Postgres", "Observability"],
    interests: ["Streaming systems", "Applied AI"],
    goals: ["Move into an AI team", "Ship a side project"],
    projects: ["Event replay engine"],
    sharedGoals: ["Both care about reliable data pipelines"],
    complementarySkills: ["She brings streaming depth, you bring model serving"],
    suggestedCollaboration: "Pair on a streaming inference side project.",
    conversationStarter:
      "Hi Priya — our Twins matched on data pipelines. I made the platform-to-AI jump last year, happy to share what worked.",
    reasons: [
      "Adjacent technical stack",
      "She is targeting your current domain",
      "Both interested in side projects",
    ],
    accent: "green",
  }),
  person({
    id: "noah-adeyemi",
    name: "Noah Adeyemi",
    initials: "NA",
    role: "CS Student & Builder",
    company: "University of Michigan",
    kind: "Student",
    location: "Ann Arbor, MI",
    match: 76,
    bio: "Final-year CS student shipping open-source AI tooling. Looking for an internship and a mentor.",
    aiSummary:
      "Noah's twin requested guidance from engineers with your exact trajectory. High-signal mentee.",
    skills: ["Python", "React", "Fine-tuning"],
    interests: ["Open source", "AI agents", "Internships"],
    goals: ["Land an AI internship", "Find a mentor"],
    projects: ["agentbench-lite", "Campus AI club"],
    sharedGoals: ["He wants the path you have already walked"],
    complementarySkills: ["He brings energy and OSS momentum"],
    suggestedCollaboration: "A short mentorship thread on breaking into AI engineering.",
    conversationStarter:
      "Hi Noah — my Twin flagged your open-source work. Happy to answer questions about breaking into AI engineering.",
    reasons: [
      "Explicitly seeking mentorship in your field",
      "Active open-source contributor",
      "Shared interest in agent tooling",
    ],
    accent: "amber",
  }),
  person({
    id: "rahul-verma",
    name: "Rahul Verma",
    initials: "RV",
    role: "Co-founder",
    company: "Stackfern",
    kind: "Founder",
    location: "Bengaluru, IN",
    match: 88,
    bio: "Building developer infrastructure for AI-native teams. Looking for a technical co-founder to own the platform layer.",
    aiSummary:
      "Rahul's twin is searching for a co-founder with your exact platform and inference background.",
    skills: ["Developer tools", "Distributed systems", "Fundraising"],
    interests: ["AI-native infra", "Open source", "Founder communities"],
    goals: ["Find a co-founder", "Launch private beta"],
    projects: ["Stackfern Runtime"],
    sharedGoals: ["Both want to build a company in AI infra"],
    complementarySkills: ["He brings distribution, you bring the platform layer"],
    suggestedCollaboration: "Explore a co-founder fit over a two-week build sprint.",
    conversationStarter:
      "Hi Rahul — our Twins matched on AI infra. You're looking for a technical co-founder and I'm exploring exactly that.",
    reasons: [
      "Seeking a co-founder in your domain",
      "Shared AI infrastructure thesis",
      "Compatible working style",
    ],
    accent: "violet",
  }),
];

export const importSources = [
  {
    id: "linkedin",
    name: "LinkedIn",
    title: "Unlock career intelligence",
    subtitle: "Import your experience in under 5 seconds.",
    benefits: [
      "Sharper recruiter matching",
      "Stronger founder matching",
      "Relevant mentors",
      "Better opportunity signals",
    ],
    gain: 24,
    discovered: ["18 Skills", "9 Projects", "5 Industries", "3 Career Goals"],
    afterMessage: "I already understand your career. Now help me understand how you think.",
  },
  {
    id: "github",
    name: "GitHub",
    title: "Unlock better engineering matches",
    subtitle: "Your commits explain what your résumé can't.",
    benefits: [
      "Real signal on your stack",
      "Matches with builders like you",
      "Project-based introductions",
    ],
    gain: 18,
    discovered: ["12 Repositories", "6 Languages", "4 Focus Areas"],
    afterMessage: "Awesome. I now understand your coding style much better.",
  },
  {
    id: "resume",
    name: "Résumé",
    title: "Help your AI Twin understand your best work",
    subtitle: "One file, years of context.",
    benefits: ["Deeper role history", "Achievement-level matching", "Clearer seniority signals"],
    gain: 15,
    discovered: ["7 Roles", "14 Achievements", "2 Domains"],
    afterMessage: "Got it. Your strongest work is now part of how I introduce you.",
  },
  {
    id: "portfolio",
    name: "Portfolio site",
    title: "Show your taste, not just your titles",
    subtitle: "Your twin learns how you present your work.",
    benefits: ["Better collaborator matching", "Design and craft signals"],
    gain: 11,
    discovered: ["5 Case Studies", "3 Themes"],
    afterMessage: "Now I can describe your craft the way you would.",
  },
] as const;

export const trainingSources = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    pitch: "Help your AI Twin understand how you solve problems.",
    detail: "Your twin learns your reasoning patterns and how you break down hard problems.",
    gain: 12,
    afterMessage: "I can feel how you reason now. Introductions will sound like you.",
  },
  {
    id: "claude",
    name: "Claude",
    pitch: "Help your AI Twin understand your writing and communication style.",
    detail: "Your twin drafts messages in your voice instead of a generic template.",
    gain: 10,
    afterMessage: "Your voice is mine now. No more templated outreach.",
  },
  {
    id: "gemini",
    name: "Gemini",
    pitch: "Help your AI Twin understand your learning interests.",
    detail: "Your twin tracks what you're curious about and finds people ahead of you on it.",
    gain: 8,
    afterMessage: "I know what you're curious about. I'll watch for people worth meeting.",
  },
] as const;

export const twinDimensions = [
  { key: "career", label: "Career", base: 22 },
  { key: "projects", label: "Projects", base: 16 },
  { key: "skills", label: "Skills", base: 18 },
  { key: "communication", label: "Communication", base: 10 },
  { key: "goals", label: "Goals", base: 20 },
  { key: "learning", label: "Learning", base: 12 },
  { key: "networking", label: "Networking", base: 14 },
] as const;

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Neutral initials placeholder for a real account that hasn't uploaded a photo. */
export function neutralAvatar(name?: string | null) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const label = initials || "·";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#ece9fb"/><text x="48" y="59" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="#6d4aff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Deterministic professional headshot for seeded network identities.
 * Stable per id (same person always gets the same photo). Real accounts (UUID
 * ids) never borrow someone else's face: they get a neutral placeholder until
 * they upload their own photo.
 */
export function photoFor(id: string, name?: string | null) {
  if (UUID_SHAPE.test(id.trim())) return neutralAvatar(name);
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  const gender = hash % 2 === 0 ? "men" : "women";
  return `https://randomuser.me/api/portraits/${gender}/${hash % 90}.jpg`;
}

export function personById(id: string) {
  return demoPeople.find((p) => p.id === id);
}

export const firstRewardBreakdown = [
  { label: "Recruiters", count: 4 },
  { label: "Startup founders", count: 2 },
  { label: "Mentors", count: 3 },
  { label: "Engineers", count: 6 },
];
