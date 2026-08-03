/**
 * Static content for the networking feed, right rail and onboarding steps.
 * Mocked today; every shape here maps 1:1 to a future Supabase table
 * (recommendations, discussions, notifications) so the UI never has to change.
 */

export type FeedKind =
  | "Founder looking for AI Engineer"
  | "Recruiter hiring Python Developers"
  | "Startup seeking Co-Founder"
  | "Mentor accepting mentees"
  | "Open Source Collaboration";

export type FeedItem = {
  id: string;
  kind: FeedKind;
  personId: string;
  description: string;
  match: number;
  reasons: string[];
};

export const feedItems: FeedItem[] = [
  {
    id: "feed-sarah",
    kind: "Founder looking for AI Engineer",
    personId: "sarah-chen",
    description:
      "Loomlane AI is looking for an engineer who has run LLM inference in production to own the agent platform.",
    match: 94,
    reasons: ["Building AI products", "Same startup goals", "Complementary backend skills"],
  },
  {
    id: "feed-marcus",
    kind: "Recruiter hiring Python Developers",
    personId: "marcus-hale",
    description:
      "Three senior Python / AI infrastructure roles open at late-seed startups, all remote-friendly.",
    match: 91,
    reasons: ["Hiring for your exact stack", "Seniority band matches", "Remote-first like you"],
  },
  {
    id: "feed-rahul",
    kind: "Startup seeking Co-Founder",
    personId: "rahul-verma",
    description:
      "Stackfern is pre-product and looking for a technical co-founder to own the runtime layer.",
    match: 88,
    reasons: ["Co-founder search in your domain", "Shared AI infra thesis", "Equity-stage fit"],
  },
  {
    id: "feed-diego",
    kind: "Mentor accepting mentees",
    personId: "diego-ferrer",
    description:
      "Taking on two more mentees this quarter for the senior → staff engineer transition.",
    match: 87,
    reasons: ["Mentors your exact transition", "Deep systems background", "Slots open now"],
  },
  {
    id: "feed-aisha",
    kind: "Open Source Collaboration",
    personId: "aisha-rahman",
    description:
      "Looking for a co-author on an open benchmark for retrieval quality in production RAG systems.",
    match: 89,
    reasons: ["Overlapping retrieval focus", "Fills your eval gap", "Both active in OSS"],
  },
];

export const trendingDiscussions = [
  {
    id: "d1",
    topic: "Evals",
    title: "Is groundedness scoring actually predictive of user trust?",
    replies: 42,
    voices: "Aisha Rahman and 11 AI engineers",
  },
  {
    id: "d2",
    topic: "Hiring",
    title: "Take-home tasks are dead for senior AI roles. What replaced them?",
    replies: 67,
    voices: "Marcus Hale and 23 recruiters",
  },
  {
    id: "d3",
    topic: "Founders",
    title: "When to hire your first infra engineer vs. buy the platform",
    replies: 31,
    voices: "Sarah Chen and 8 founders",
  },
];

export const suggestedConversations = [
  { id: "s1", personId: "sarah-chen", line: "Ask how she scopes agent reliability before launch." },
  { id: "s2", personId: "priya-menon", line: "Share how you moved from platform work into AI." },
  { id: "s3", personId: "lena-novak", line: "Get her read on the AI infra market before you raise." },
];

export const todaysOpportunities = [
  { id: "o1", label: "Staff AI Engineer · Kestrel Labs", note: "Referral available via Aisha" },
  { id: "o2", label: "Co-founder intro · Stackfern", note: "Rahul replied to 3 twins today" },
  { id: "o3", label: "Seed intro · Halden Ventures", note: "Lena is meeting pre-seed teams" },
];

export const recommendedActions = [
  {
    id: "a1",
    label: "Connect GitHub",
    reward: "+19% Twin Intelligence",
    to: "/onboarding" as const,
  },
  { id: "a2", label: "Reply to Sarah Chen", reward: "94% match waiting", to: "/messages" as const },
  {
    id: "a3",
    label: "Teach your Twin your voice",
    reward: "Outreach in your tone",
    to: "/twin" as const,
  },
];

/** Onboarding step definitions — replace `simulate` with real OAuth later. */
export type OnboardingStep = {
  id: string;
  sourceId: string;
  chip: string;
  heading: string;
  subtitle: string;
  benefits: string[];
  cta: string;
  loadingStages: string[];
  discovered: { label: string; value: string }[];
  celebration: string;
  skipCost: string;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "career",
    sourceId: "linkedin",
    chip: "Career Intelligence",
    heading: "Unlock Career Intelligence",
    subtitle: "Import your professional experience in under 5 seconds.",
    benefits: [
      "Better recruiter matching",
      "Better founder matching",
      "Better mentors",
      "Better opportunities",
    ],
    cta: "Connect LinkedIn",
    loadingStages: [
      "Connecting...",
      "Reading profile...",
      "Extracting skills...",
      "Analyzing experience...",
    ],
    discovered: [
      { label: "Skills", value: "18" },
      { label: "Projects", value: "6" },
      { label: "Companies", value: "2" },
      { label: "Career goals", value: "4" },
    ],
    celebration: "🎉 Found 18 new skills. Recruiter matching just got sharper.",
    skipCost: "Skipping means weaker recruiter and founder matches.",
  },
  {
    id: "engineering",
    sourceId: "github",
    chip: "Engineering Intelligence",
    heading: "Unlock better engineering matches",
    subtitle: "Your commits explain what a résumé can't.",
    benefits: ["Languages", "Projects", "Open source", "Commit history"],
    cta: "Connect GitHub",
    loadingStages: [
      "Scanning repositories...",
      "Analyzing tech stack...",
      "Reading commit history...",
    ],
    discovered: [
      { label: "Python", value: "Core" },
      { label: "React", value: "Strong" },
      { label: "AI", value: "Deep" },
      { label: "Node", value: "Solid" },
      { label: "Supabase", value: "Shipped" },
    ],
    celebration: "🎉 AI confidence increased. Builders like you are now matchable.",
    skipCost: "Skipping means your engineering depth stays invisible.",
  },
  {
    id: "resume",
    sourceId: "resume",
    chip: "Resume Intelligence",
    heading: "Help your AI Twin understand your best work",
    subtitle: "One file, years of context. Nothing is shared publicly.",
    benefits: ["Projects", "Experience", "Skills", "Education", "Achievements"],
    cta: "Upload résumé",
    loadingStages: ["Reading document...", "Extracting achievements...", "Mapping seniority..."],
    discovered: [
      { label: "Roles", value: "7" },
      { label: "Achievements", value: "14" },
      { label: "Education", value: "1" },
      { label: "Domains", value: "2" },
    ],
    celebration: "🎉 Achievement-level matching unlocked.",
    skipCost: "Skipping means matches see titles, not outcomes.",
  },
];

export const communicationSources = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    pitch: "Help your AI Twin understand how you solve problems.",
    detail:
      "You answer three short prompts in your own words. We never access your private chat history.",
    gain: 12,
  },
  {
    id: "claude",
    name: "Claude",
    pitch: "Help your AI Twin understand your writing style.",
    detail: "Your Twin learns your tone so outreach sounds like you, not a template.",
    gain: 10,
  },
  {
    id: "gemini",
    name: "Gemini",
    pitch: "Help your AI Twin understand your learning interests.",
    detail: "Your Twin tracks what you're curious about and finds people ahead of you on it.",
    gain: 8,
  },
] as const;

/** Scripted opening messages demo contacts send when a chat starts. */
export const demoOpeners: Record<string, string[]> = {
  "sarah-chen": [
    "Hi! I noticed your AI Twin suggested we collaborate on AI infrastructure.",
    "We're 6 weeks from Loomlane v2 and the agent runtime is the bottleneck. What does your inference stack look like?",
  ],
  "marcus-hale": [
    "Hey — we're hiring Python and AI infra engineers at two portfolio startups.",
    "Both are remote-friendly, senior band. Interested in seeing the specs?",
  ],
  "rahul-verma": [
    "Great to match! I'm looking for a technical co-founder for Stackfern.",
    "Would you be open to a two-week build sprint to test the fit?",
  ],
  "aisha-rahman": [
    "Your Twin and mine matched on retrieval evaluation 👋",
    "I'm co-authoring an open benchmark for groundedness — want to take a section?",
  ],
  "diego-ferrer": [
    "Happy to connect. Your Twin mentioned you're moving toward staff scope.",
    "What's the hardest part right now — influence, or scope definition?",
  ],
  "lena-novak": [
    "Nice match. I invest at pre-seed in AI infra.",
    "What are you building, and how far along is it?",
  ],
  "tomas-ekwueme": [
    "Hi! We both ship user-facing AI, so this should be fun.",
    "How do you currently surface model uncertainty to users?",
  ],
  "priya-menon": [
    "Hello! Your Twin says you made the platform → AI move already.",
    "How did you position that transition in interviews?",
  ],
  "noah-adeyemi": [
    "Hi! Thanks for connecting — I'm hunting for an AI internship.",
    "Would you mind reviewing my agentbench-lite project sometime?",
  ],
};

export const demoFollowUps = [
  "That's helpful, thank you.",
  "Makes sense — want to put 20 minutes on the calendar this week?",
  "I'll send over the details so your Twin can pre-read them.",
  "Appreciate the context. Let's keep this thread going.",
];
