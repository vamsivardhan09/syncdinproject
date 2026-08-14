import { z } from "zod";
import { personById } from "@/lib/demo-data";
import { fallbackTwinReply } from "@/lib/twin-fallback";

export const twinReplyInput = z.object({
  speaker: z.enum(["peer", "user"]),
  peerId: z.string().min(1),
  peerProfile: z
    .object({
      name: z.string().min(1),
      role: z.string().default(""),
      company: z.string().default(""),
      kind: z.string().default("professional"),
      location: z.string().default(""),
      bio: z.string().default(""),
      skills: z.array(z.string()).default([]),
      interests: z.array(z.string()).default([]),
      goals: z.array(z.string()).default([]),
      projects: z.array(z.string()).default([]),
      reasons: z.array(z.string()).default([]),
      suggestedCollaboration: z.string().default(""),
    })
    .optional(),
  userContext: z.object({
    name: z.string().default("the user"),
    headline: z.string().default(""),
    location: z.string().default(""),
    intelligence: z.number().default(0),
    sources: z.array(z.string()).default([]),
    bio: z.string().default(""),
    skills: z.array(z.string()).default([]),
    interests: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    projects: z.array(z.string()).default([]),
  }),
  transcript: z.array(z.object({ sender: z.enum(["user", "peer"]), body: z.string() })).max(40),
});

export type TwinReplyInput = z.infer<typeof twinReplyInput>;

function normalizedWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function isRepetitive(candidate: string, previous: string[]) {
  const next = normalizedWords(candidate);
  if (next.size === 0) return true;
  return previous.some((message) => {
    const prior = normalizedWords(message);
    const shared = [...next].filter((word) => prior.has(word)).length;
    return shared / Math.min(next.size, Math.max(prior.size, 1)) > 0.72;
  });
}

/**
 * Guards against the model echoing its own instructions back into the chat
 * (e.g. "…ary sentence structure and tone.") or emitting prompt scaffolding.
 */
const LEAK_PATTERNS = [
  /sentence structure and tone/i,
  /\b(2|two)\s*[–-]\s*5 (short )?sentences\b/i,
  /under \d+ words/i,
  /\bno markdown\b/i,
  /\b(YOUR PROFILE|THE OTHER PERSON|Known overlap|Suggested collaboration|Why matched)\b/,
  /\bas an ai\b/i,
  /\b(system|assistant) (prompt|message)\b/i,
  /\byou are [a-z' ]+'s ai twin\b/i,
  /\bfirst person as their professional representative\b/i,
];


function looksLikeLeak(text: string) {
  return LEAK_PATTERNS.some((re) => re.test(text));
}

/** Strips leading fragments/labels the model sometimes prepends. */
function cleanReply(text: string) {
  let out = text.replace(/^\s*(assistant|system|user)\s*:\s*/i, "").trim();
  out = out.replace(/^[^A-Z"“'(]*(?=[A-Z"“'(])/u, "").trim();
  return out || text.trim();
}
/**
 * A conversation has reached a useful outcome once a concrete next step is
 * agreed. Automatic Twin replies stop there so the real person takes over.
 */
const OUTCOME_PATTERNS = [
  /\b(let'?s|we'?ll|i'?ll) (set up|schedule|book|jump on|hop on|do) (a )?(call|chat|meeting|zoom|intro)/i,
  /\b(send|share) (you |me )?(a |the )?(calendar|invite|link|times|availability)/i,
  /\bworks for me\b|\bsounds like a plan\b|\bdeal\b/i,
  /\b(i can|you can) (own|take) (the )?[a-z/ ]{2,30}(layer|side|side of it)\b/i,
  /\blet'?s (start|kick) (this |it )?off\b/i,
  /\bhappy to (mentor|advise|refer|intro(duce)? you)\b/i,
];

function reachedOutcome(text: string, priorTurns: number) {
  if (priorTurns < 3) return false;
  return OUTCOME_PATTERNS.some((re) => re.test(text));
}



export async function handleTwinReply(data: TwinReplyInput) {
  const person = data.peerProfile ?? personById(data.peerId);
  if (!person) throw new Error("Unknown match");

  const u = data.userContext;
  const peerBrief = [
    `Name: ${person.name}`,
    `Role: ${person.role} at ${person.company} (${person.kind})`,
    `Location: ${person.location}`,
    `Bio: ${person.bio}`,
    `Skills: ${person.skills.join(", ")}`,
    `Interests: ${person.interests.join(", ")}`,
    `Goals: ${person.goals.join(", ")}`,
    `Projects: ${person.projects.join(", ")}`,
    `Why matched: ${person.reasons.join("; ")}`,
    `Suggested collaboration: ${person.suggestedCollaboration}`,
  ].join("\n");
  const userBrief = [
    `Name: ${u.name || "the user"}`,
    u.headline ? `Headline: ${u.headline}` : "Headline: not provided",
    u.location ? `Location: ${u.location}` : "Location: not provided",
    u.bio ? `Background: ${u.bio}` : "Background: not provided",
    u.skills.length ? `Skills: ${u.skills.join(", ")}` : "Skills: not provided",
    u.interests.length ? `Interests: ${u.interests.join(", ")}` : "Interests: not provided",
    u.goals.length ? `Goals: ${u.goals.join(", ")}` : "Goals: not provided",
    u.projects.length ? `Projects: ${u.projects.join(", ")}` : "Projects: not provided",
  ].join("\n");

  const mine = new Set(
    [...u.skills, ...u.interests, ...u.goals, ...u.projects].map((item) =>
      item.toLowerCase().trim(),
    ),
  );
  const overlap = [...person.skills, ...person.interests, ...person.goals, ...person.projects]
    .filter((item) => mine.has(item.toLowerCase().trim()))
    .slice(0, 3);
  const previousForSpeaker = data.transcript
    .filter((message) => message.sender === data.speaker)
    .map((message) => message.body);
  const latest = data.transcript.at(-1)?.body ?? "";
  const fallback = () =>
    fallbackTwinReply({
      speaker: data.speaker,
      peer: person,
      user: {
        name: u.name,
        role: u.headline,
        skills: u.skills,
        goals: u.goals,
        interests: u.interests,
      },
      transcript: data.transcript,
    });

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { text: fallback(), outcome: false };

  const isOpening = data.transcript.length === 0;
  const voice = isOpening
    ? "Open the conversation: say concretely what you are working on right now, name the specific overlap or complementary strength you see in their work, and ask one direct question about their side of it."
    : `Respond to the latest message: “${latest}”. Answer what was actually said, add one concrete detail from your own work, and push the conversation one step closer to a real outcome (collaboration, mentorship, hiring, intro, or a call).`;
  const system = `You are ${data.speaker === "peer" ? person.name : u.name || "the user"}, writing your own direct messages in first person.

Write like a real professional exploring whether a connection is worth it. 2–5 natural sentences. Be specific about work: what you build, the stack or domain, the problem you are solving. Use only facts present in the profiles below — never invent employers, projects, numbers, or history. Never open with a bare greeting like "Hi <name>", never mention Twins, matching, compatibility scores, or "our AIs connected". Do not repeat any point you already made. No markdown, bullets, or labels.

${overlap.length ? `Genuine overlap you may reference: ${overlap.join(", ")}.` : "There is no confirmed overlap; look for complementary strengths instead of claiming a match."}
${voice}

When a concrete next step has been agreed (a call, an intro, splitting work, an interview, a follow-up), confirm it in one clear sentence and stop proposing new ideas.

YOUR PROFILE:
${data.speaker === "peer" ? peerBrief : userBrief}

THE OTHER PERSON:
${data.speaker === "peer" ? userBrief : peerBrief}`;
  const messages = [
    { role: "system", content: system },
    ...data.transcript.map((message) => ({
      role: (data.speaker === "peer" ? message.sender === "user" : message.sender === "peer")
        ? "user"
        : "assistant",
      content: message.body,
    })),
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages,
      max_tokens: 420,
      temperature: 0.85,
    }),
  });
  if (!response.ok) return { text: fallback(), outcome: false };

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim();
  const text = raw ? cleanReply(raw) : "";
  if (
    !text ||
    text.split(/\s+/).length < 8 ||
    looksLikeLeak(text) ||
    isRepetitive(text, previousForSpeaker)
  ) {
    const fb = fallback();
    return { text: fb, outcome: reachedOutcome(fb, data.transcript.length) };
  }
  return { text, outcome: reachedOutcome(text, data.transcript.length) };
}

