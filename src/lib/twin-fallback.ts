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
  turn: number;
}): string {
  const { speaker, peer, user, turn } = opts;
  const me = speaker === "peer" ? peer : user;
  const them = speaker === "peer" ? user : peer;
  const sharedSkills = overlap(me.skills, them.skills);
  const sharedInterests = overlap(me.interests, them.interests);
  const sharedGoal = overlap(me.goals, them.goals)[0] ?? them.goals?.[0];
  const themFirst = first(them.name || "there");
  const theirSkill = them.skills?.[0];

  const opener = sharedSkills.length
    ? `We both work on ${sharedSkills.slice(0, 2).join(" and ")} — what does that look like on your side right now?`
    : sharedInterests.length
      ? `${sharedInterests[0]} shows up on both our profiles. What's pulling you toward it at the moment?`
      : theirSkill
        ? `Your ${theirSkill.toLowerCase()} work is the closest thing to what ${me.role ? me.role.toLowerCase() : "I"} focus on. Where are you taking it next?`
        : `${themFirst}, our Twins matched but the overlap isn't obvious yet — what are you focused on this month?`;

  const lines = [
    opener,
    sharedGoal
      ? `${sharedGoal} is on my list too — worth comparing notes properly?`
      : theirSkill
        ? `That lines up with the ${theirSkill.toLowerCase()} side of my work. Want to go deeper on it?`
        : `That's relevant to what I'm doing. Want me to set up a proper intro?`,
    me.skills?.length
      ? `I can help on the ${me.skills[0]} side if it's useful — should I share what we've already shipped?`
      : `Happy to go deeper whenever you are. Should I suggest a time?`,
  ];

  return lines[turn % lines.length]!;
}
