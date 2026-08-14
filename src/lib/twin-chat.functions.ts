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
      u.bio ? `Background: ${u.bio}` : "Background: not provided",
      u.skills.length ? `Skills: ${u.skills.join(", ")}` : "Skills: not provided",
      u.interests.length ? `Interests: ${u.interests.join(", ")}` : "Interests: not provided",
      u.goals.length ? `Goals: ${u.goals.join(", ")}` : "Goals: not provided",
      u.projects.length ? `Projects: ${u.projects.join(", ")}` : "Projects: not provided",
      `Twin intelligence: ${u.intelligence}%`,
      u.sources.length ? `Trained on: ${u.sources.join(", ")}` : "Trained on: no sources yet",
    ].join("\n");

    /** Facts both sides actually share — the conversation must start from these. */
    const lower = (xs: string[]) => xs.map((x) => x.toLowerCase().trim());
    const mine = new Set(lower([...u.skills, ...u.interests, ...u.goals, ...u.projects]));
    const overlap = [...person.skills, ...person.interests, ...person.goals, ...person.projects]
      .filter((x) => mine.has(x.toLowerCase().trim()))
      .slice(0, 3);

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
          skills: u.skills,
          goals: u.goals,
          interests: u.interests,
        },
        turn: data.transcript.length,
      });

    if (!key) return { text: fallback() };

    const isOpening = data.transcript.length === 0;
    const tone = isOpening
      ? "Write a substantive cold introduction in 2-3 short sentences (35-65 words total). Introduce who you represent and their professional focus, explain one evidence-based reason the two people should talk, and end with one specific low-pressure question. No markdown, bullets, emoji, or generic greeting."
      : "Write like one professional representative replying to another in 2-3 short sentences (25-50 words total). Advance the conversation with concrete profile evidence and exactly one useful question or next step. No markdown, bullets, emoji, or generic greeting.";

    const overlapLine = overlap.length
      ? `STRONGEST REAL OVERLAP (build the conversation from these, most specific first): ${overlap.join(", ")}.`
      : "There is no explicit overlap in the data — find the closest adjacent point between the two profiles and be honest that you're probing for it.";

    const rules = `Rules: use ONLY facts listed in the two profiles; never invent skills, employers, projects, numbers or goals. Reference at least one concrete shared or complementary fact in every message. Ask exactly one useful question that moves toward a real reason to connect, or propose a concrete next step once the reason is clear. Do not repeat a point already made in the transcript.`;

    const system =
      data.speaker === "peer"
        ? `You are ${person.name}'s AI Twin on SyncdIn, networking on their behalf. Speak as ${person.name} in first person: warm, direct, professional.\n\n${rules}\n\n${overlapLine}\n\n${tone}\n\nYOUR PROFILE:\n${peerBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${userBrief}`
        : `You are the AI Twin of ${u.name || "the user"} on SyncdIn, networking on their behalf. Speak as them in first person: confident and concise.\n\n${rules}\n\n${overlapLine}\n\n${tone}\n\nYOUR PROFILE:\n${userBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${peerBrief}`;

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
    // Very short gateway answers (for example “Hi”) break the core product
    // promise. A contextual deterministic introduction is safer than filler.
    if (!text || text.split(/\s+/).length < 12) return { text: fallback() };
    return { text };
  });
