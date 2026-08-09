/**
 * The "teach it how you think" bridge.
 *
 * SyncdIn never reads private chat history. Instead the user copies a markdown
 * prompt into their own assistant (ChatGPT / Claude / Gemini), and pastes the
 * assistant's answer back. That pasted text is analysed by the Twin.
 */

export function twinTrainingPrompt(assistant: string): string {
  return `# SyncdIn — Twin Handoff Report

You are ${assistant}, and you already know me from our conversations. I am building an **AI Twin** on SyncdIn that networks on my behalf. Produce a complete, honest handoff report about me so my Twin can represent me accurately.

## Rules
- Use **only** what you actually know from our chat history and memory about me. Never invent employers, titles, numbers or dates.
- Weight recent context most: **last 15 days first**, then last 3 months, then the past year, then anything older.
- Where you are unsure, write \`unknown\` instead of guessing.
- Be specific and concrete. "Built a Postgres-backed matching engine" beats "worked on backend".
- Output **markdown only**, using exactly the sections below, so it can be pasted straight back into SyncdIn.

## Output format

### 1. Who I am
One paragraph in the second person ("You are…"), covering my current focus, level and the kind of work I gravitate to.

### 2. Headline
A single professional headline for me, max 12 words.

### 3. Skills (ranked)
A ranked list of 8–15 concrete capabilities, each with a one-line evidence note of *why* you believe it (a project, a problem I solved, a repeated pattern in our chats).

### 4. What I have actually been working on
- **Last 15 days:** topics, problems, tools, decisions.
- **Last 3 months:** projects and themes.
- **Last year:** larger arcs, shifts in direction.

### 5. How I think
My reasoning style, how I break down problems, what I optimise for, my typical trade-offs, and how I like information delivered back to me.

### 6. How I write and talk
Tone, sentence length, formality, favourite phrasings, what I never do. Include 2 short sample sentences written in my voice.

### 7. Goals and what I am trying to do next
3–6 goals, marked \`stated\` or \`inferred\`.

### 8. What I want from a network
Who is genuinely useful for me to meet right now (roles, stages, domains) and what I want from them — intros, advice, collaborators, hiring, customers, funding.

### 9. Interests and curiosities
5–10 topics I keep returning to.

### 10. Strengths and gaps
What I am unusually good at, and where a complementary person would help me most.

### 11. Do-not-represent list
Things my Twin should never claim about me, and topics I would not want raised on my behalf.

End with one line: \`Confidence: <0-100>\` — how much real signal you had about me.`;
}
