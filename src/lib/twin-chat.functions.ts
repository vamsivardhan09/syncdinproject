import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { personById } from "@/lib/demo-data";
import { fallbackTwinReply } from "@/lib/twin-fallback";

const PeerProfile = z.object({
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
});

const ReplyInput = z.object({
  /** Which twin is speaking: the matched person's twin, or the signed-in user's twin. */
  speaker: z.enum(["peer", "user"]),
  peerId: z.string().min(1),
  /** Seeded attendees are not in the demo directory, so their profile travels with the call. */
  peerProfile: PeerProfile.optional(),
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
  transcript: z
    .array(z.object({ sender: z.enum(["user", "peer"]), body: z.string() }))
    .max(40),
});

export const generateTwinReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReplyInput.parse(input))
  .handler(async ({ data }) => {
    const person = data.peerProfile ?? personById(data.peerId);
    if (!person) throw new Error("Unknown match");

    const key = process.env["LOVABLE_API_KEY"];


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
      `Twin intelligence: ${u.intelligence}%`,
      u.sources.length ? `Trained on: ${u.sources.join(", ")}` : "Trained on: no sources yet",
    ].join("\n");

    const fallback = () =>
      fallbackTwinReply({
        speaker: data.speaker,
        peer: {
          name: person.name,
          role: person.role,
          company: person.company,
          skills: person.skills,
          goals: person.goals,
          interests: person.interests,
        },
        user: {
          name: u.name,
          role: u.headline,
          skills: [],
          goals: [],
        },
        turn: data.transcript.length,
      });

    if (!key) return { text: fallback() };

    const tone =
      "Write like a real person texting, not an assistant. Exactly 1-2 short sentences, under 30 words total. No markdown, no bullet points, no greetings after the first message.";

    const system =
      data.speaker === "peer"
        ? `You are ${person.name}'s AI Twin on SyncdIn — an AI that networks on their behalf. Speak as ${person.name} in first person, warm, direct, professional. Use only the profile facts below; never invent employers or numbers. Reference the other person's context when it helps. Ask one useful question. 1-3 short sentences, no greetings after the first message, no emoji spam, no markdown.\n\n${tone}\n\nYOUR PROFILE:\n${peerBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${userBrief}`
        : `You are the AI Twin of ${u.name || "the user"} on SyncdIn, networking on their behalf. Speak as them in first person, confident and concise. Use only the facts below; if something is unknown, keep it general instead of inventing it. Move the conversation toward a concrete next step. 1-3 short sentences, no markdown.\n\n${tone}\n\nYOUR PROFILE:\n${userBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${peerBrief}`;

    const messages = [
      { role: "system", content: system },
      ...data.transcript.map((m) => ({
        role:
          (data.speaker === "peer" ? m.sender === "user" : m.sender === "peer")
            ? "user"
            : "assistant",
        content: m.body,
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: "google/gemini-3.6-flash", messages, max_tokens: 120 }),
    });

    // A gateway hiccup must not break the loop — fall back to a contextual line.
    if (!res.ok) return { text: fallback() };

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return { text: fallback() };
    return { text };
  });
