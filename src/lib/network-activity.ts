/**
 * Retention plumbing: Twin activity that happened while the user was away.
 * Uses the existing `notifications` and `connections` tables (RLS: own rows).
 */
import { supabase } from "@/integrations/supabase/client";

export type TwinActivity = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Records Twin activity so it can resurface on the dashboard on the next visit. */
export async function recordActivity(title: string, body: string) {
  const user = await uid();
  if (!user) return;
  await supabase.from("notifications").insert({ user_id: user, title, body });
}

export async function recordActivities(items: { title: string; body: string }[]) {
  const user = await uid();
  if (!user || items.length === 0) return;
  await supabase.from("notifications").insert(items.map((i) => ({ ...i, user_id: user })));
}

export async function listUnreadActivity(limit = 5): Promise<TwinActivity[]> {
  const user = await uid();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function markActivityRead(ids: string[]) {
  if (ids.length === 0) return;
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

/** Persists a connection so the loop has memory across devices. */
export async function saveConnection(peerSlug: string) {
  const user = await uid();
  if (!user) return;
  await supabase.from("connections").insert({ user_id: user, peer_slug: peerSlug });
}

const SCORE_KEY = "syncdin.network.scores.v1";

type ScoreMap = Record<string, Record<string, number>>;

function readScores(): ScoreMap {
  try {
    return JSON.parse(window.localStorage.getItem(SCORE_KEY) ?? "{}") as ScoreMap;
  } catch {
    return {};
  }
}

/**
 * Compares the previous top-5 scores for a network with the current ones and
 * returns the genuine improvements (Twin got smarter → matches got better).
 */
export function diffTopScores(
  networkCode: string,
  current: { id: string; name: string; score: number }[],
) {
  const all = readScores();
  const previous = all[networkCode] ?? {};
  const improvements = current
    .filter((c) => typeof previous[c.id] === "number" && c.score > previous[c.id]!)
    .map((c) => ({ name: c.name, from: previous[c.id]!, to: c.score }));

  const next: Record<string, number> = {};
  for (const c of current) next[c.id] = c.score;
  try {
    window.localStorage.setItem(SCORE_KEY, JSON.stringify({ ...all, [networkCode]: next }));
  } catch {
    /* storage unavailable — improvements simply are not tracked */
  }
  const firstSeen = Object.keys(previous).length === 0;
  return { improvements, firstSeen };
}
