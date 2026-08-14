import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { personById } from "@/lib/demo-data";

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

    const system =
      data.speaker === "peer"
        ? `You are ${person.name}'s AI Twin on SyncdIn, messaging on their behalf. Speak as ${person.name} in first person: warm, casual, human — like a real chat message, not an email. HARD LIMIT: 1-2 short sentences, under 30 words total. Use only the profile facts below; never invent employers or numbers. No greetings after the first message, no emoji, no markdown, no bullet points.\n\nYOUR PROFILE:\n${peerBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${userBrief}`
        : `You are the AI Twin of ${u.name || "the user"} on SyncdIn, messaging on their behalf. Speak as them in first person: casual, direct, human. HARD LIMIT: 1-2 short sentences, under 30 words total. Use only the facts below; keep it general rather than inventing details. Nudge toward one concrete next step. No emoji, no markdown.\n\nYOUR PROFILE:\n${userBrief}\n\nTHE PERSON YOU ARE TALKING TO:\n${peerBrief}`;

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

    /**
     * Deterministic, profile-specific fallback. Used when the AI gateway is
     * unavailable so the conversation still reads like this person's Twin
     * instead of a generic canned paragraph.
     */
    const fallback = (): string => {
      const turn = data.transcript.length;
      const theirFirst = person.name.split(" ")[0] ?? person.name;
      const myFirst = (u.name || "there").split(" ")[0];
      const skill = person.skills[0];
      const goal = person.goals[0];
      const overlap = person.reasons[0];
      if (data.speaker === "peer") {
        const lines = [
          `Hey ${myFirst} — good to connect. I'm deep in ${skill ?? person.role.toLowerCase()} right now. What are you working on?`,
          goal
            ? `Right now I'm focused on ${goal.toLowerCase()}. Does that overlap with what you're doing?`
            : `${person.role} at ${person.company} keeps me busy. Where's your focus at the moment?`,
          overlap
            ? `${overlap.toLowerCase()} — that's the part I'd want to compare notes on. Worth a call?`
            : `Sounds relevant. Want to set up a short call?`,
        ];
        return lines[turn % lines.length] ?? lines[0]!;
      }
      const lines = [
        `Hi ${theirFirst} — our Twins matched${u.headline ? ` on ${u.headline.toLowerCase()}` : ""}. What are you focused on this quarter?`,
        skill
          ? `That's relevant to me — I work close to ${skill.toLowerCase()} too. Where could we help each other?`
          : `That sounds relevant to what I'm building. Where could we help each other?`,
        `Makes sense. Want me to set up a proper intro so you two can take it from here?`,
      ];
      return lines[turn % lines.length] ?? lines[0]!;
    };

    if (!key) return { text: fallback() };

    let text: string | undefined;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({ model: "google/gemini-3.6-flash", messages, max_tokens: 90 }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        text = json.choices?.[0]?.message?.content?.trim();
      }
    } catch {
      /* fall through to the deterministic reply */
    }

    return { text: text && text.length > 0 ? text : fallback() };
  });
