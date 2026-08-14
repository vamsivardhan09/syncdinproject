/**
 * Deterministic, context-specific Twin reply used when the AI gateway is
 * unavailable. Never a generic paragraph: it always names real profile facts
 * from both sides so the conversation still reads like the product working.
 */
type Side = {
  name: string;
  role?: string;
  company?: string;
  skills?: string[];
  goals?: string[];
  interests?: string[];
};

function first(name: string) {
  return name.split(/\s+/)[0] || name;
}

function overlap(a: string[] = [], b: string[] = []) {
  const lower = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => lower.has(x.toLowerCase()));
}

export function fallbackTwinReply(opts: {
  speaker: "peer" | "user";
  peer: Side;
  user: Side;
  transcript: { sender: "user" | "peer"; body: string }[];
}): string {
  const { speaker, peer, user, transcript } = opts;
  const me = speaker === "peer" ? peer : user;
  const them = speaker === "peer" ? user : peer;
  const sharedSkills = overlap(me.skills, them.skills);
  const sharedInterests = overlap(me.interests, them.interests);
  const sharedGoal = overlap(me.goals, them.goals)[0] ?? them.goals?.[0];
  const themFirst = first(them.name || "there");
  const theirSkill = them.skills?.[0];

  const identity = [me.role, me.company].filter(Boolean).join(" at ");
  const focus = me.skills?.slice(0, 2).join(" and ") || me.interests?.[0] || me.goals?.[0];

  if (transcript.length === 0) {
    const introduction = identity
      ? `I'm ${me.name}, ${identity}, and my current focus is ${focus ?? "building useful professional relationships"}.`
      : `I'm ${me.name}, and I'm focused on ${focus ?? "building useful professional relationships"}.`;
    const relevance = sharedSkills.length
      ? `We both work on ${sharedSkills.slice(0, 2).join(" and ")}, which is exactly the part I'm pushing on right now.`
      : sharedInterests.length
        ? `We seem to care about the same thing in ${sharedInterests.slice(0, 2).join(" and ")}.`
        : theirSkill
          ? `Your work in ${theirSkill} covers the side I don't own, which is why I'm reaching out.`
          : `Your background looks complementary to mine, which is why I'm reaching out directly.`;
    const ask = sharedGoal
      ? `I'm working toward ${sharedGoal} too — what does that look like on your side, and where do you need help?`
      : `What are you building at the moment, and which part would you rather hand to someone else?`;
    return `${introduction}\n${relevance} ${ask}`;
  }

  const latest = transcript.at(-1)?.body.trim() ?? "";
  const lowerLatest = latest.toLowerCase();
  if (/^(hi|hey|hello|yo)[!.\s]*$/.test(lowerLatest)) {
    const common = sharedSkills[0] ?? sharedInterests[0];
    return common
      ? `${themFirst}, the reason I reached out is ${common} — I'm deep in that right now and curious how you're approaching it. What are you building around it?`
      : `${themFirst}, my current focus is ${focus ?? "this space"}, and I'd like to know what you're working on so we can see whether the two sides fit together.`;

  }
  if (/\b(yes|sure|okay|ok|do it|sounds good|let'?s)\b/.test(lowerLatest)) {
    return sharedGoal
      ? `Great—let’s make it concrete. Since ${sharedGoal} matters to both of us, I’d start by comparing what each of us is working toward and where our experience could complement it.`
      : `Great—let’s make it concrete. Share the main problem you’re working on right now, and I’ll respond with the most relevant part of my background.`;
  }
  if (latest.includes("?")) {
    const detail = focus ?? me.goals?.[0] ?? "finding useful professional collaborations";
    return `From my side, the clearest answer is ${detail}. ${theirSkill ? `Your background in ${theirSkill} could add a useful perspective—how are you applying it today?` : "What part of that is most relevant to you?"}`;
  }
  return sharedSkills.length
    ? `That gives me a clearer picture. The strongest connection I see is ${sharedSkills[0]}, so I’d like to compare how each of us approaches it in practice.`
    : `That helps me understand where you’re coming from. The next useful step is to compare your current priority with my work in ${focus ?? "this area"} and see if there’s a practical fit.`;
}
