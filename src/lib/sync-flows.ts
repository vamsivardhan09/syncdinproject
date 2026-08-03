/**
 * Mocked AI sync flows. Each entry describes the believable "AI is learning"
 * sequence shown after a Connect click. Replace `run` with a real OAuth /
 * ingestion call later — the UI only depends on the step + reward shape.
 */
export type SyncFlow = {
  id: string;
  modalTitle: string;
  steps: string[];
  rewardTitle: string;
  discovered: string[];
  toasts: string[];
  opportunities: number;
};

export const syncFlows: Record<string, SyncFlow> = {
  linkedin: {
    id: "linkedin",
    modalTitle: "Connecting LinkedIn…",
    steps: [
      "Secure authentication",
      "Reading professional profile",
      "Extracting experience",
      "Understanding skills",
      "Analyzing projects",
      "Building AI career graph",
    ],
    rewardTitle: "Career Intelligence Updated",
    discovered: ["18 Skills", "9 Projects", "4 Companies", "3 Career Interests"],
    toasts: ["🎉 Your Twin learned 18 new skills.", "🚀 Better recruiter matching unlocked."],
    opportunities: 8,
  },
  github: {
    id: "github",
    modalTitle: "Connecting GitHub…",
    steps: [
      "Scanning repositories",
      "Reading commits",
      "Analyzing languages",
      "Understanding architecture",
      "Identifying open-source interests",
      "Learning engineering profile",
    ],
    rewardTitle: "Engineering Intelligence Updated",
    discovered: ["Python", "React", "TypeScript", "Node.js", "AI Projects", "37 Repositories"],
    toasts: ["✨ Engineering profile improved.", "💜 We found 7 stronger connections."],
    opportunities: 7,
  },
  resume: {
    id: "resume",
    modalTitle: "Reading your résumé…",
    steps: [
      "Reading résumé",
      "Extracting experience",
      "Finding projects",
      "Understanding leadership",
      "Identifying skills",
    ],
    rewardTitle: "Résumé Intelligence Updated",
    discovered: ["Experience", "Projects", "Certifications", "Leadership"],
    toasts: ["🎉 Your Twin mapped your full career history.", "🚀 Stronger mentor matching unlocked."],
    opportunities: 5,
  },
  portfolio: {
    id: "portfolio",
    modalTitle: "Reading your portfolio…",
    steps: [
      "Fetching site",
      "Reading case studies",
      "Understanding craft",
      "Extracting positioning",
      "Building taste profile",
    ],
    rewardTitle: "Craft Intelligence Updated",
    discovered: ["Case Studies", "Design Taste", "Positioning", "Featured Work"],
    toasts: ["✨ Your Twin can now pitch your work.", "💜 4 collaborator matches improved."],
    opportunities: 4,
  },
  chatgpt: {
    id: "chatgpt",
    modalTitle: "Training AI Twin…",
    steps: [
      "Understanding problem solving style",
      "Learning technical interests",
      "Building communication profile",
      "Identifying learning patterns",
    ],
    rewardTitle: "AI Twin Improved",
    discovered: ["Communication Style", "Technical Interests", "Learning Pattern"],
    toasts: ["🎉 Your Twin now reasons the way you do.", "🚀 Smarter intros unlocked."],
    opportunities: 3,
  },
  claude: {
    id: "claude",
    modalTitle: "Training AI Twin…",
    steps: [
      "Studying professional writing style",
      "Learning tone and phrasing",
      "Building outreach voice",
      "Calibrating message length",
    ],
    rewardTitle: "Writing Style Learned",
    discovered: ["Professional Writing Style", "Tone", "Outreach Voice"],
    toasts: ["✨ Outreach now sounds like you.", "💜 No more templated messages."],
    opportunities: 3,
  },
  gemini: {
    id: "gemini",
    modalTitle: "Training AI Twin…",
    steps: [
      "Mapping learning interests",
      "Tracking curiosity signals",
      "Finding people ahead of you",
      "Building growth profile",
    ],
    rewardTitle: "Learning Interests Learned",
    discovered: ["Learning Interests", "Curiosity Signals", "Growth Areas"],
    toasts: ["✨ Your Twin knows what you're curious about.", "🚀 Mentor discovery improved."],
    opportunities: 2,
  },
};

/** Mocked async integration call — swap for real OAuth/ingestion later. */
export async function runSyncStep(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
