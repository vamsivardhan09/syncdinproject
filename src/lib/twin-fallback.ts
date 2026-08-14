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
  const shared = overlap(me.skills, them.skills);
  const sharedGoal = them.goals?.[0] ?? me.goals?.[0];
  const themFirst = first(them.name || "there");

  const lines = [
    shared.length
      ? `Hey ${themFirst} — we both work with ${shared.slice(0, 2).join(" and ")}. What are you building with it right now?`
      : `Hey ${themFirst} — ${me.role ? `I'm on ${me.role.toLowerCase()} work` : "good to connect"}${me.company ? ` at ${me.company}` : ""}. What are you focused on this month?`,
    sharedGoal
      ? `That's relevant — ${sharedGoal.toLowerCase()} is on my list too. Want to compare notes properly?`
      : `That sounds relevant to what I'm doing. Want me to set up a proper intro?`,
    me.skills?.length
      ? `I can help on the ${me.skills[0]} side if that's useful. Shall I share what we've already shipped?`
      : `Happy to go deeper whenever you are. Should I suggest a time?`,
  ];

  return lines[turn % lines.length]!;
}
