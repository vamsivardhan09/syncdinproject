/**
 * Real (non-demo) SyncdIn users.
 *
 * Every read goes through an auth-gated `SECURITY DEFINER` lookup that projects
 * only safe columns — the `profiles` table itself stays owner-only, so emails
 * and private fields are never reachable from the browser.
 */
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Real users are identified by their auth UUID; demo personas use slugs. */
export function isRealUserId(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export type PublicProfile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  goals: string[] | null;
  interests: string[] | null;
  twin_summary: string | null;
  twin_intelligence: number | null;
  last_active_at: string | null;
};

export type ConnectionProfile = PublicProfile & { connected_at: string | null };

export type RequestStatus = "pending" | "accepted" | "declined";

export type ConnectionRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
  /** Opening note the requester attached, visible to both participants. */
  intro_note: string | null;
};

const REQUEST_COLUMNS =
  "id, requester_id, recipient_id, status, created_at, responded_at, intro_note";


export function displayName(p: { full_name: string | null } | null | undefined) {
  return p?.full_name?.trim() || "SyncdIn member";
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "SI";
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Discoverable members, ordered by how recently their Twin was active. */
export async function searchPeopleRanked(query = "", limit = 24): Promise<PublicProfile[]> {
  const { data, error } = await supabase.rpc("search_people_ranked", {
    _q: query.slice(0, 120),
    _limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicProfile[];
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  if (!isRealUserId(id)) return null;
  const { data, error } = await supabase.rpc("get_public_profile", { _id: id });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PublicProfile[];
  return rows[0] ?? null;
}

/** Accepted connections, from either direction of the request. */
export async function listRealConnections(): Promise<ConnectionProfile[]> {
  const { data, error } = await supabase.rpc("list_my_connections");
  if (error) throw new Error(error.message);
  return (data ?? []) as ConnectionProfile[];
}

/** The signed-in user's own profile row (owner-only RLS). */
export type MyProfile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  goals: string[] | null;
  interests: string[] | null;
  twin_summary: string | null;
  twin_intelligence: number | null;
  onboarded: boolean;
  public_card: boolean;
  last_active_at: string | null;
  previous_active_at: string | null;
};

const MY_COLUMNS =
  "id, full_name, headline, location, avatar_url, skills, goals, interests, twin_summary, twin_intelligence, onboarded, public_card, last_active_at, previous_active_at";

export async function getMyProfile(): Promise<MyProfile | null> {
  const me = await currentUserId();
  if (!me) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(MY_COLUMNS)
    .eq("id", me)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MyProfile | null) ?? null;
}

export type TwinSignals = {
  headline?: string | null;
  skills?: string[];
  goals?: string[];
  interests?: string[];
  twin_summary?: string | null;
};

/** Persists the signals the user confirmed during onboarding / on their Twin page. */
export async function saveTwinSignals(signals: TwinSignals): Promise<void> {
  const me = await currentUserId();
  if (!me) throw new Error("You need to be signed in.");
  const clean = (values: string[] | undefined) =>
    values
      ? Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).slice(0, 40)
      : undefined;

  const payload: {
    headline?: string | null;
    twin_summary?: string | null;
    skills?: string[];
    goals?: string[];
    interests?: string[];
  } = {};
  if (signals.headline !== undefined) payload.headline = signals.headline?.slice(0, 140) ?? null;
  if (signals.twin_summary !== undefined)
    payload.twin_summary = signals.twin_summary?.slice(0, 800) ?? null;
  const skills = clean(signals.skills);
  const goals = clean(signals.goals);
  const interests = clean(signals.interests);
  if (skills) payload.skills = skills;
  if (goals) payload.goals = goals;
  if (interests) payload.interests = interests;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from("profiles").update(payload).eq("id", me);

  if (error) throw new Error(error.message);
}

export async function setPublicCard(enabled: boolean): Promise<void> {
  const me = await currentUserId();
  if (!me) throw new Error("You need to be signed in.");
  const { error } = await supabase.from("profiles").update({ public_card: enabled }).eq("id", me);
  if (error) throw new Error(error.message);
}

const ACTIVITY_KEY = "syncdin.activity.pinged";
const ACTIVITY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Lightweight, debounced presence ping. Returns the previous visit timestamp
 * the first time it runs in a session so the dashboard can show what changed.
 */
export async function touchActivity(): Promise<string | null> {
  try {
    const last = Number(window.sessionStorage.getItem(ACTIVITY_KEY) ?? 0);
    if (Date.now() - last < ACTIVITY_INTERVAL_MS) return null;
    window.sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — still ping once */
  }
  const me = await currentUserId();
  if (!me) return null;
  const { data, error } = await supabase.rpc("touch_activity");
  if (error) return null;
  return (data as string | null) ?? null;
}

/** Opt-in public Personal Intelligence card. Safe columns only. */
export type SharedCard = {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  goals: string[] | null;
  interests: string[] | null;
  twin_summary: string | null;
  twin_intelligence: number | null;
};

export async function getSharedCard(id: string): Promise<SharedCard | null> {
  if (!isRealUserId(id)) return null;
  const { data, error } = await supabase.rpc("get_shared_card", { _id: id });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SharedCard[];
  return rows[0] ?? null;
}

/** The single request row between the signed-in user and `peerId`, if any. */
export async function getRequestWith(peerId: string): Promise<ConnectionRequest | null> {
  if (!isRealUserId(peerId)) return null;
  const me = await currentUserId();
  if (!me) return null;
  const { data, error } = await supabase
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .or(
      `and(requester_id.eq.${me},recipient_id.eq.${peerId}),and(requester_id.eq.${peerId},recipient_id.eq.${me})`,
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConnectionRequest | null) ?? null;
}

/** Requests waiting for the signed-in user to accept or decline. */
export async function listIncomingRequests(): Promise<
  { request: ConnectionRequest; actor: PublicProfile | null }[]
> {
  const me = await currentUserId();
  if (!me) return [];
  const { data, error } = await supabase
    .from("connection_requests")
    .select(REQUEST_COLUMNS)
    .eq("recipient_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ConnectionRequest[];
  const actors = await fetchActors(rows.map((r) => r.requester_id));
  return rows.map((request) => ({
    request,
    actor: actors.get(request.requester_id) ?? null,
  }));
}

export async function sendConnectionRequest(
  peerId: string,
  introNote?: string | null,
): Promise<ConnectionRequest> {
  if (!isRealUserId(peerId)) throw new Error("That is not a real SyncdIn member.");
  const me = await currentUserId();
  if (!me) throw new Error("You need to be signed in.");
  if (me === peerId) throw new Error("You cannot connect with yourself.");
  const note = introNote?.trim().slice(0, 400) || null;
  const { data, error } = await supabase
    .from("connection_requests")
    .insert({ requester_id: me, recipient_id: peerId, status: "pending", intro_note: note })
    .select(REQUEST_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      const existing = await getRequestWith(peerId);
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  const request = data as ConnectionRequest;
  // Email only after the row is persisted; a failed email never fails the connection.
  void sendRelationshipEmail({
    data: {
      kind: "connection_request",
      recipientId: request.recipient_id,
      path: `/people/${me}`,
      dedupeKey: `connection_request:${request.id}`,
      note: request.intro_note,
    },
  }).catch(() => undefined);
  return request;
}

/** Only the recipient may accept or decline — enforced by RLS as well. */
export async function respondToRequest(
  requestId: string,
  status: "accepted" | "declined",
): Promise<ConnectionRequest> {
  const { data, error } = await supabase
    .from("connection_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .select(REQUEST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const request = data as ConnectionRequest;
  if (status === "accepted") {
    void sendRelationshipEmail({
      data: {
        kind: "connection_accepted",
        recipientId: request.requester_id,
        path: `/messages/${request.recipient_id}`,
        dedupeKey: `connection_accepted:${request.id}`,
      },
    }).catch(() => undefined);
  }
  return request;
}

export async function cancelRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from("connection_requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
}

/** Relationship email preference for the signed-in user (default ON). */
export async function getEmailPreference(): Promise<boolean> {
  const me = await currentUserId();
  if (!me) return true;
  const { data, error } = await supabase
    .from("profiles")
    .select("email_relationship_notifications")
    .eq("id", me)
    .maybeSingle();
  if (error) return true;
  return data?.email_relationship_notifications ?? true;
}

export async function setEmailPreference(enabled: boolean): Promise<void> {
  const me = await currentUserId();
  if (!me) throw new Error("You need to be signed in.");
  const { error } = await supabase
    .from("profiles")
    .update({ email_relationship_notifications: enabled })
    .eq("id", me);
  if (error) throw new Error(error.message);
}

/** Safe profile lookup for notification actors / request senders. */
export async function fetchActors(ids: string[]): Promise<Map<string, PublicProfile>> {
  const unique = Array.from(new Set(ids.filter(isRealUserId)));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_notification_actors", { _ids: unique });
  if (error) throw new Error(error.message);
  const map = new Map<string, PublicProfile>();
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      full_name: row.full_name,
      headline: row.headline,
      avatar_url: row.avatar_url,
      location: null,
      skills: null,
      goals: null,
      interests: null,
      twin_summary: null,
      twin_intelligence: null,
      last_active_at: null,
    });
  }
  return map;
}

