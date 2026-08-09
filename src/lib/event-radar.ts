/**
 * Live Event Radar.
 *
 * Presence is EXPLICIT: a SyncdIn member taps "I'm at this event" and their
 * presence row is stored in `event_presence`. There is no Bluetooth, GPS or
 * device scanning, and no access to the organiser's attendee list.
 *
 * Demo attendees get deterministic, seeded presence timestamps so the radar
 * has a believable "currently active" population; presence older than
 * PRESENCE_WINDOW_MIN is treated as expired and is NOT shown as active.
 */
import { attendeesFor, type Attendee, type EventNetwork } from "@/lib/event-network";
import { matchFor, type TwinVector } from "@/lib/matching";

export const PRESENCE_WINDOW_MIN = 45;

/** Stable pseudo-random from a string seed. */
function seed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type PresentAttendee = Attendee & {
  /** Minutes since this attendee's Twin was last active at the event. */
  minutesAgo: number;
};

/** Seeded presence for an event: who is currently active, and how recently. */
export function presentAttendees(network: EventNetwork): PresentAttendee[] {
  return attendeesFor(network)
    .map((a) => ({ ...a, minutesAgo: seed(`${network.code}:${a.id}`) % 140 }))
    .filter((a) => a.minutesAgo <= PRESENCE_WINDOW_MIN)
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
}

const STOP = new Set(["and", "the", "for", "with", "into", "your", "from", "that", "this"]);

function tokenize(values: string[]) {
  const out = new Set<string>();
  for (const value of values) {
    for (const word of value.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (word.length > 3 && !STOP.has(word)) out.add(word);
    }
  }
  return out;
}

export type RadarMatch = {
  candidate: PresentAttendee;
  score: number;
  reasons: string[];
  topTopic: string | null;
  /** Event topics this person overlaps with, used for event relevance. */
  eventTopics: string[];
};

/**
 * Ranks present attendees for THIS event: the global Twin match, weighted up by
 * how relevant the person is to the event's own topics, so an event shortlist
 * feels different from the global network.
 */
export function rankForEvent(
  vector: TwinVector,
  network: EventNetwork,
  people: PresentAttendee[],
): RadarMatch[] {
  const topics = network.topics ?? [];

  return people
    .map((candidate) => {
      const base = matchFor(vector, candidate);
      const theirs = tokenize([
        ...candidate.skills,
        ...candidate.interests,
        ...candidate.goals,
        ...(candidate.projects ?? []),
        candidate.role,
      ]);
      const eventTopics = topics.filter((topic) => {
        for (const word of topic.toLowerCase().split(/[^a-z0-9+]+/)) {
          if (word.length > 3 && !STOP.has(word) && theirs.has(word)) return true;
        }
        return false;
      });

      const relevance = Math.min(14, eventTopics.length * 5);
      const freshness = candidate.minutesAgo <= 10 ? 3 : candidate.minutesAgo <= 25 ? 2 : 0;
      const score = Math.max(40, Math.min(98, base.score + relevance + freshness));

      const reasons = [...base.reasons];
      if (eventTopics.length > 0) {
        reasons.unshift(
          `Here for the same track: ${eventTopics.slice(0, 2).join(" + ").toLowerCase()}`,
        );
      }
      if (candidate.minutesAgo <= 15) {
        reasons.push(`Active on the event radar ${candidate.minutesAgo} min ago`);
      }

      return {
        candidate,
        score,
        reasons: reasons.slice(0, 4),
        topTopic: base.topTopic,
        eventTopics,
      };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
}

/** Upserts the signed-in member's explicit presence at an event. */
export async function activatePresence(eventCode: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { error } = await supabase.from("event_presence").upsert(
    {
      user_id: data.user.id,
      event_code: eventCode,
      active: true,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "user_id,event_code" },
  );
  return !error;
}

/** Reads the member's presence, treating stale rows as inactive. */
export async function readPresence(eventCode: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("event_presence")
    .select("active, last_active_at")
    .eq("event_code", eventCode)
    .maybeSingle();
  if (!data || !data.active) return { active: false, lastActiveAt: null as string | null };
  const age = (Date.now() - new Date(data.last_active_at).getTime()) / 60000;
  return {
    active: age <= PRESENCE_WINDOW_MIN,
    lastActiveAt: data.last_active_at,
  };
}
