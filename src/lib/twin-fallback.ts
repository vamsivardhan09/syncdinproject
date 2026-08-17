/**
 * Deterministic, context-specific reply used when the AI gateway is
 * unavailable. It never returns a generic paragraph: it answers the actual
 * question using real stored profile facts from both sides.
 */
type Side = {
  name: string;
  role?: string;
  company?: string;
  location?: string;
  skills?: string[];
  goals?: string[];
  interests?: string[];
  projects?: string[];
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
  const project = me.projects?.[0];

  if (transcript.length === 0) {
    const introduction = identity
      ? `I'm ${me.name}, ${identity}, currently spending most of my time on ${project ?? focus ?? "work in this space"}.`
      : `I'm ${me.name}, currently spending most of my time on ${project ?? focus ?? "work in this space"}.`;
    const relevance = sharedSkills.length
      ? `We overlap on ${sharedSkills.slice(0, 2).join(" and ")}, which is the part I'm pushing hardest on.`
      : sharedInterests.length
        ? `Looks like we both care about ${sharedInterests.slice(0, 2).join(" and ")}.`
        : theirSkill
          ? `Your work in ${theirSkill} covers the side I don't own.`
          : `Your background looks complementary to mine.`;
    const ask = sharedGoal
      ? `How are you approaching ${sharedGoal} at the moment?`
      : `What are you building right now?`;
    return `${introduction} ${relevance} ${ask}`;
  }

  const latest = transcript.at(-1)?.body.trim() ?? "";
  const lower = latest.toLowerCase();

  // Where are you from / based?
  if (/\b(where.*(from|based|located)|which city|what city|whereabouts)\b/.test(lower)) {
    return me.location
      ? `I'm based in ${me.location}${them.location ? ` — you're in ${them.location}, right?` : "."}`
      : `I move around a fair bit, so nothing fixed at the moment.`;
  }

  // What are you working on / your project?
  if (/\b(working on|what.*(project|building)|your project|up to these days)\b/.test(lower)) {
    if (project) {
      return focus
        ? `Right now it's ${project}, mostly on the ${focus} side of it.`
        : `Right now it's ${project}.`;
    }
    return focus
      ? `Mostly ${focus} at the moment${identity ? `, day to day at ${me.company ?? identity}` : ""}.`
      : `Nothing I can share in detail yet, but it's close to ${sharedInterests[0] ?? "the work you're doing"}.`;
  }

  if (/^(hi|hey|hello|yo)[!.\s]*$/.test(lower)) {
    const common = sharedSkills[0] ?? sharedInterests[0];
    return common
      ? `${themFirst} — I reached out because of ${common}. How are you approaching it?`
      : `${themFirst} — right now I'm deep in ${project ?? focus ?? "this space"}. What are you working on?`;
  }

  if (/\b(yes|sure|okay|ok|do it|sounds good|let'?s)\b/.test(lower)) {
    return sharedGoal
      ? `Works for me. Since ${sharedGoal} matters to both of us, let's compare notes on a call this week.`
      : `Works for me — send a couple of times that suit you and we'll talk properly.`;
  }

  if (latest.includes("?")) {
    const detail = project ?? focus ?? me.goals?.[0] ?? "the work I'm on right now";
    return `Short answer: ${detail}. ${theirSkill ? `Curious how you handle it with ${theirSkill}.` : ""}`.trim();
  }

  return sharedSkills.length
    ? `That tracks. The closest overlap is ${sharedSkills[0]}, and on my side that shows up in ${project ?? focus ?? "the current work"}.`
    : `Makes sense. On my side the nearest thing is ${project ?? focus ?? "what I'm building now"}.`;
}
