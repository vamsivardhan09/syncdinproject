import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Bot, Loader2, MapPin, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  demoPeople,
  importSources,
  photoFor,
  trainingSources,
  type DemoPerson,
} from "@/lib/demo-data";
import { personFromProfile, resolvePeople, resolvePerson } from "@/lib/people-directory";
import { getPublicProfile, isRealUserId, type PublicProfile } from "@/lib/real-people";

import { sendRelationshipEmail } from "@/lib/relationship-email.functions";
import { generateTwinReply } from "@/lib/twin-chat.functions";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages/$peer")({
  loader: ({ params }) => {
    const person = resolvePerson(params.peer);
    // Real members are loaded from the backend in the component, so only an
    // unknown demo slug is a genuine not-found.
    if (!person) {
      if (isRealUserId(params.peer)) return null;
      throw notFound();
    }
    return { name: person.name, role: person.role, company: person.company };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Twin conversation — SyncdIn" }, { name: "robots", content: "noindex" }],
      };
    }

    const title = `Chat with ${loaderData.name} — SyncdIn`;
    const description = `Your AI Twin is talking to ${loaderData.name}, ${loaderData.role} at ${loaderData.company}. Jump in any time.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Conversation,
});

type Message = {
  id: string;
  user_id: string;
  recipient_id: string | null;
  peer_slug: string;
  sender: string;
  body: string;
  created_at: string;
};

type ThreadItem = {
  person: DemoPerson;
  avatar: string | null;
  preview: string | null;
  at: string | null;
  unread: boolean;
};

function Conversation() {
  const { peer } = Route.useParams();
  const { state, intelligence, connect } = useTwin();
  const demoPerson = resolvePerson(peer);
  const [realProfile, setRealProfile] = useState<PublicProfile | null>(null);
  const [realPerson, setRealPerson] = useState<DemoPerson | null>(null);
  const [peerLoading, setPeerLoading] = useState(demoPerson === null);
  const person = demoPerson ?? realPerson;

  const runTwin = useServerFn(generateTwinReply);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    headline: string | null;
    location: string | null;
    avatar_url?: string | null;
    twin_summary?: string | null;
    skills?: string[] | null;
    interests?: string[] | null;
    goals?: string[] | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState<null | "peer" | "user">(null);
  const [autopilot, setAutopilot] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Left-sidebar: recent connections & conversations.
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  // Bumped whenever a realtime message arrives so the sidebar re-reads previews.
  const [feedVersion, setFeedVersion] = useState(0);


  const sourceNames = useMemo(
    () =>
      [...importSources, ...trainingSources]
        .filter((s) => state.connectedSources.includes(s.id) || state.trainedSources.includes(s.id))
        .map((s) => s.name),
    [state.connectedSources, state.trainedSources],
  );

  // The user's Twin speaks from their real stored signals — never invented ones.
  const userContext = useMemo(
    () => ({
      name: profile?.full_name ?? "the user",
      headline: profile?.headline ?? "",
      location: profile?.location ?? "",
      intelligence,
      sources: sourceNames,
      bio: profile?.twin_summary ?? "",
      skills: profile?.skills ?? [],
      interests: profile?.interests ?? [],
      goals: profile?.goals ?? [],
      projects: [],
    }),
    [profile, intelligence, sourceNames],
  );

  // Real SyncdIn members aren't in the demo directory — load their public profile.
  useEffect(() => {
    if (demoPerson || !isRealUserId(peer)) return;
    let cancelled = false;
    setPeerLoading(true);
    void (async () => {
      try {
        const profileRow = await getPublicProfile(peer);
        if (cancelled) return;
        setRealProfile(profileRow);
        setRealPerson(profileRow ? personFromProfile(profileRow) : null);
      } catch {
        if (!cancelled) setRealPerson(null);
      } finally {
        if (!cancelled) setPeerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peer, demoPerson]);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, headline, location, avatar_url, twin_summary, skills, interests, goals")
        .eq("id", uid)
        .maybeSingle();
      setProfile(data ?? null);
    })();
  }, []);

  const loadThread = useCallback(async () => {
    if (!userId) return null;
    let request = supabase
      .from("messages")
      .select("id, user_id, recipient_id, peer_slug, sender, body, created_at");
    if (isRealUserId(peer)) {
      request = request.or(
        `and(user_id.eq.${userId},recipient_id.eq.${peer}),and(user_id.eq.${peer},recipient_id.eq.${userId}),and(user_id.eq.${userId},recipient_id.is.null,peer_slug.eq.${peer})`,
      );
    } else {
      request = request.eq("user_id", userId).eq("peer_slug", peer);
    }
    const { data } = await request.order("created_at", { ascending: true });
    return data ?? [];
  }, [userId, peer]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      const rows = await loadThread();
      if (cancelled || !rows) return;
      setMessages(rows);
      setLoading(false);
    };
    void run();
    // Fallback for the rare case realtime can't connect — keeps both sides in sync.
    const timer = window.setInterval(() => void run(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId, peer, loadThread]);

  // Realtime: a message the other person sends shows up here immediately.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages-${userId}-${peer}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Message;
          const mine = row.user_id === userId;
          const forMe = row.recipient_id === userId;
          if (!mine && !forMe) return;
          const inThread = mine ? (row.recipient_id ?? row.peer_slug) === peer : row.user_id === peer;
          if (inThread) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          }
          setFeedVersion((v) => v + 1);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, peer]);


  // Build the conversation list for the left sidebar: every thread the user
  // has messaged plus their persisted connections, newest activity first.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("user_id, recipient_id, peer_slug, sender, body, created_at")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;

      const previews = new Map<string, { body: string; at: string; unread: boolean }>();
      const peerIds = new Set<string>();
      for (const row of data) {
        const threadId: string =
          row.user_id === userId ? (row.recipient_id ?? row.peer_slug) : row.user_id;
        const fromPeer = row.user_id !== userId;
        previews.set(threadId, {
          body: row.body,
          at: row.created_at,
          unread: fromPeer,
        });
        if (isRealUserId(threadId) && threadId !== userId) peerIds.add(threadId);
      }

      const profiles = await Promise.all(Array.from(peerIds).map((id) => getPublicProfile(id)));
      if (cancelled) return;
      const realThreads = profiles
        .filter((p): p is PublicProfile => p !== null)
        .map((p) => ({ person: personFromProfile(p), avatar: p.avatar_url }));

      const byId = new Map<string, { person: DemoPerson; avatar: string | null }>();
      for (const { person: p, avatar } of realThreads) byId.set(p.id, { person: p, avatar });
      for (const p of resolvePeople(state.connectionsMade)) {
        if (!byId.has(p.id)) byId.set(p.id, { person: p, avatar: null });
      }

      // Fall back to a few demo people so a brand-new user still sees options.
      if (byId.size === 0) {
        for (const p of demoPeople.slice(0, 5)) byId.set(p.id, { person: p, avatar: null });
      }

      const items: ThreadItem[] = Array.from(byId.values()).map(({ person: p, avatar }) => {
        const prev = previews.get(p.id);
        return {
          person: p,
          avatar,
          preview: prev?.body ?? null,
          at: prev?.at ?? null,
          unread: prev?.unread ?? false,
        };
      });
      // Most recent activity first; untouched threads last, stable by match.
      items.sort((a, b) => {
        if (a.at && b.at) return b.at.localeCompare(a.at);
        if (a.at) return -1;
        if (b.at) return 1;
        return b.person.match - a.person.match;
      });
      setThreads(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, state.connectionsMade, feedVersion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const persist = useCallback(
    async (sender: "user" | "peer", body: string) => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("messages")
        .insert({
          user_id: userId,
          recipient_id: sender === "user" && isRealUserId(peer) ? peer : null,
          peer_slug: peer,
          sender,
          body,
        })
        .select("id, user_id, recipient_id, peer_slug, sender, body, created_at")
        .single();
      if (error) {
        toast.error("Could not save that message.");
        return false;
      }
      if (data) setMessages((prev) => [...prev, data]);
      // Email the human recipient only — never the sender, and at most once
      // every 15 minutes so rapid messages group into a single nudge.
      if (sender === "user" && isRealUserId(peer) && peer !== userId) {
        void sendRelationshipEmail({
          data: {
            kind: "new_message",
            recipientId: peer,
            path: `/messages/${userId}`,
            dedupeKey: `new_message:${userId}:${peer}:${Math.floor(Date.now() / 900_000)}`,
            cooldownMinutes: 15,
          },
        }).catch(() => undefined);
      }
      return true;
    },
    [userId, peer],
  );

  // Event attendees are generated client-side, so the server can't look them
  // up by slug — the profile travels with the request.
  const peerProfile = useMemo(
    () =>
      person
        ? {
            name: person.name,
            role: person.role,
            company: person.company,
            kind: person.kind,
            location: person.location,
            bio: person.bio,
            skills: person.skills,
            interests: person.interests,
            goals: person.goals,
            projects: person.projects,
            reasons: person.reasons,
            suggestedCollaboration: person.suggestedCollaboration,
          }
        : undefined,
    [person],
  );

  const twinTurn = useCallback(
    async (speaker: "peer" | "user", transcript: { sender: "user" | "peer"; body: string }[]) => {
      setThinking(speaker);
      try {
        const { text, outcome } = await runTwin({
          data: {
            speaker,
            peerId: peer,
            peerProfile,
            userContext,
            transcript: transcript.slice(-20),
          },
        });
        const saved = await persist(speaker, text);
        if (!saved) return null;
        // A concrete next step was agreed — hand the conversation back to the human.
        if (outcome) {
          setAutopilot(false);
          toast.success("Your Twins agreed on a next step — take it from here.");
          return null;
        }
        return text;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "The Twin could not reply.");
        return null;
      } finally {
        setThinking(null);
      }
    },
    [runTwin, peer, peerProfile, userContext, persist],
  );

  const transcriptOf = useCallback(
    (rows: Message[]): { sender: "user" | "peer"; body: string }[] =>
      rows.map((m) => ({
        sender:
          m.user_id === userId
            ? m.sender === "user"
              ? ("user" as const)
              : ("peer" as const)
            : m.sender === "user"
              ? ("peer" as const)
              : ("user" as const),
        body: m.body,
      })),
    [userId],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId || thinking) return;
    setDraft("");
    const saved = await persist("user", body);
    if (!saved) {
      setDraft(body);
      return;
    }
    if (!isRealUserId(peer) && !state.connectionsMade.includes(peer)) void connect(peer);
    // Real members answer for themselves — never fabricate a reply on their behalf.
    if (isRealUserId(peer)) return;
    const base = [...transcriptOf(messages), { sender: "user" as const, body }];
    const reply = await twinTurn("peer", base);
    if (reply && autopilot) {
      await twinTurn("user", [...base, { sender: "peer" as const, body: reply }]);
    }

  }

  async function letTwinsTalk() {
    if (!userId || thinking) return;
    // Opening the Twin-to-Twin conversation is also a real connection.
    if (!state.connectionsMade.includes(peer)) {
      const result = await connect(peer);
      if (!result.ok) return;
    }
    const base = transcriptOf(messages);
    if (base.length === 0) {
      const opener = await twinTurn("user", []);
      if (!opener) return;
      await twinTurn("peer", [{ sender: "user" as const, body: opener }]);
      return;
    }
    const last = base[base.length - 1]!;
    const next = last.sender === "user" ? "peer" : "user";
    await twinTurn(next, base);
  }

  if (!person) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/messages">
              <ArrowLeft aria-hidden="true" className="size-4" /> All conversations
            </Link>
          </Button>
          <section className="surface-card mt-3 p-8 text-center">
            {peerLoading ? (
              <>
                <Loader2 aria-hidden="true" className="mx-auto size-6 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading this conversation…</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-extrabold">Conversation unavailable</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This member is no longer discoverable, so their Twin can't talk right now.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/network">Find people to meet</Link>
                </Button>
              </>
            )}
          </section>
        </div>
      </AppShell>
    );
  }

  const thinkingLabel =
    thinking === "peer" ? `${person.name.split(" ")[0]}'s Twin is typing…` : "Your Twin is typing…";

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-8.5rem)] w-full max-w-6xl gap-2">
        {/* Left sidebar — recent connections & conversations */}
        <aside className="surface-card hidden w-64 shrink-0 flex-col overflow-hidden md:flex">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conversations
            </p>
            <Badge variant="secondary" className="bg-primary-soft font-mono text-[0.6rem] text-primary">
              {threads.length}
            </Badge>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
            {threads.map((t) => {
              const active = peer === t.person.id;
              return (
                <li key={t.person.id}>
                  <Link
                    to="/messages/$peer"
                    params={{ peer: t.person.id }}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 rounded-xl p-2 transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-muted/60",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="relative shrink-0">
                      <img
                        src={t.avatar || photoFor(t.person.id, t.person.name)}
                        alt=""
                        loading="lazy"
                        className="size-10 rounded-full object-cover"
                      />
                      {t.unread && !active ? (
                        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-background bg-emerald-500" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "truncate text-sm",
                            active
                              ? "font-bold text-sidebar-accent-foreground"
                              : "font-semibold text-foreground",
                          )}
                        >
                          {t.person.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-primary-soft font-mono text-[0.6rem] text-primary"
                        >
                          {t.person.match}%
                        </Badge>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-xs",
                          active ? "text-sidebar-accent-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {t.preview ?? "Twin ready to open"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {threads.length === 0 ? (
              <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                No conversations yet.
              </li>
            ) : null}
          </ul>
        </aside>

        {/* Main chat area — gets all the space the right panel used to occupy */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact conversation header — who you're talking to */}
          <header className="surface-card flex items-center gap-3 p-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0 md:hidden">
              <Link to="/messages" aria-label="All conversations">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <img
              src={realProfile?.avatar_url || photoFor(person.id, person.name)}
              alt={person.name}
              className="size-11 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-extrabold sm:text-lg">{person.name}</h1>
                <Badge
                  variant="secondary"
                  className="bg-primary-soft font-mono text-[0.65rem] text-primary"
                >
                  {person.match}%
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {person.role} · {person.company}
                <span className="hidden sm:inline">
                  {" "}
                  · <MapPin aria-hidden="true" className="inline size-3" /> {person.location}
                </span>
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Label htmlFor="autopilot" className="text-xs text-muted-foreground">
                My Twin replies
              </Label>
              <Switch id="autopilot" checked={autopilot} onCheckedChange={setAutopilot} />
            </div>
          </header>

          {/* Chat */}
          <section className="surface-card mt-2 flex min-h-0 flex-1 flex-col p-0">
            <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Bot aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">{person.aiSummary}</span>
              </p>
              <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">
                <Label htmlFor="autopilot-m" className="text-xs text-muted-foreground">
                  Auto
                </Label>
                <Switch id="autopilot-m" checked={autopilot} onCheckedChange={setAutopilot} />
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading conversation…
                </p>
              ) : messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No messages yet. Start the Twin conversation to send a professional introduction
                  based on your profile, then let {person.name.split(" ")[0]}'s Twin respond from
                  theirs.
                </div>
              ) : (
                messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex",
                      m.user_id === userId && m.sender === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <p
                      className={cn(
                        "max-w-[80%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.user_id === userId && m.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {m.body}
                    </p>
                  </motion.div>
                ))
              )}

              {thinking ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> {thinkingLabel}
                </p>
              ) : null}
              <div ref={endRef} />
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(person.conversationStarter)}
                  className="focus-ring min-w-0 flex-1 truncate rounded-lg border border-dashed border-primary/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-primary-soft/50"
                >
                  <span className="font-semibold text-primary">Suggestion:</span> “
                  {person.conversationStarter}”
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => void letTwinsTalk()}
                  disabled={thinking !== null}
                >
                  Start Twin conversation
                </Button>
              </div>

              <form onSubmit={send} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${person.name.split(" ")[0]}…`}
                  aria-label={`Message ${person.name}`}
                  className="h-11"
                />
                <Button
                  type="submit"
                  className="h-11"
                  disabled={draft.trim().length === 0 || thinking !== null}
                >
                  <Send aria-hidden="true" className="size-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
