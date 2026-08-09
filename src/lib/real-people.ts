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
  twin_intelligence: number | null;
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
};

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

/** Discoverable members, filtered server-side by name / headline / location / skills. */
export async function searchPeople(query = "", limit = 24): Promise<PublicProfile[]> {
  const { data, error } = await supabase.rpc("search_people", {
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

/** The single request row between the signed-in user and `peerId`, if any. */
export async function getRequestWith(peerId: string): Promise<ConnectionRequest | null> {
  if (!isRealUserId(peerId)) return null;
  const me = await currentUserId();
  if (!me) return null;
  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, recipient_id, status, created_at, responded_at")
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
    .select("id, requester_id, recipient_id, status, created_at, responded_at")
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

export async function sendConnectionRequest(peerId: string): Promise<ConnectionRequest> {
  if (!isRealUserId(peerId)) throw new Error("That is not a real SyncdIn member.");
  const me = await currentUserId();
  if (!me) throw new Error("You need to be signed in.");
  if (me === peerId) throw new Error("You cannot connect with yourself.");
  const { data, error } = await supabase
    .from("connection_requests")
    .insert({ requester_id: me, recipient_id: peerId, status: "pending" })
    .select("id, requester_id, recipient_id, status, created_at, responded_at")
    .single();
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate")) {
      const existing = await getRequestWith(peerId);
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  return data as ConnectionRequest;
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
    .select("id, requester_id, recipient_id, status, created_at, responded_at")
    .single();
  if (error) throw new Error(error.message);
  return data as ConnectionRequest;
}

export async function cancelRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from("connection_requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
}

/** Safe profile lookup for notification actors / request senders. */
export async function fetchActors(ids: string[]): Promise<Map<string, PublicProfile>> {
  const unique = Array.from(new Set(ids.filter(isRealUserId)));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_notification_actors", { _ids: unique });
  if (error) throw new Error(error.message);
  const map = new Map<string, PublicProfile>();
  for (const row of (data ?? []) as PublicProfile[]) map.set(row.id, row);
  return map;
}
