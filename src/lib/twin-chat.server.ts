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
  if (!key) return { text: fallback() };

  const isOpening = data.transcript.length === 0;
  const voice = isOpening
    ? "Write a natural cold introduction in 2–3 short sentences. Say who you represent, mention one specific reason to talk, and end with one easy question."
    : `Reply directly to the latest message: “${latest}”. First acknowledge or answer what was said, then add one useful thought. Ask a question only when it naturally moves the conversation forward.`;
  const system = `You are ${data.speaker === "peer" ? person.name : u.name || "the user"}'s AI Twin, speaking in first person as their professional representative.

Sound like a thoughtful human in a real direct-message conversation—not a pitch bot. Keep the reply to 1–3 short sentences and under 65 words. Vary sentence structure and tone. Never repeat a previous sentence, repeatedly announce that the Twins matched, or keep offering a “focused introduction.” Do not force profile facts into every reply. Use profile evidence when relevant, but never invent facts. No markdown, bullets, labels, or generic greeting.

${overlap.length ? `Known overlap: ${overlap.join(", ")}.` : "No exact overlap is confirmed; explore adjacent interests without claiming a match."}
${voice}

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
      max_tokens: 180,
      temperature: 0.85,
    }),
  });
  if (!response.ok) return { text: fallback() };

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim();
  const text = raw ? cleanReply(raw) : "";
  if (
    !text ||
    text.split(/\s+/).length < 4 ||
    looksLikeLeak(text) ||
    isRepetitive(text, previousForSpeaker)
  ) {
    return { text: fallback() };
  }
  return { text };
}
