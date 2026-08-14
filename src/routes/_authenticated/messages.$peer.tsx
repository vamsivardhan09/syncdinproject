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
import { importSources, photoFor, trainingSources, type DemoPerson } from "@/lib/demo-data";
import { personFromProfile, resolvePerson } from "@/lib/people-directory";
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
        meta: [
          { title: "Twin conversation — SyncdIn" },
          { name: "robots", content: "noindex" },
        ],
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

function Conversation() {
  const { peer } = Route.useParams();
  const { state, intelligence, toggleConnection } = useTwin();
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

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
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
      if (cancelled) return;
      setMessages(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, peer]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const persist = useCallback(
    async (sender: "user" | "peer", body: string) => {
      if (!userId) return;
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
        return;
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
        const { text } = await runTwin({
          data: {
            speaker,
            peerId: peer,
            peerProfile,
            userContext,
            transcript: transcript.slice(-20),
          },
        });
        await persist(speaker, text);
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
        sender: m.sender === "user" ? ("user" as const) : ("peer" as const),
        body: m.body,
      })),
    [],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId || thinking) return;
    setDraft("");
    await persist("user", body);
    if (!state.connectionsMade.includes(peer)) void toggleConnection(peer);
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
      const result = await toggleConnection(peer);
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
                  This member is no longer discoverable, so their Twin can&apos;t talk right now.
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
      <div className="mx-auto flex h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col">
        {/* Compact conversation header — who you're talking to. */}
        <header className="surface-card flex items-center gap-3 p-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
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
                No messages yet. Say hi — {person.name.split(" ")[0]}&apos;s AI Twin will reply using
                their profile, and yours can answer using your data.
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
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
                Let our Twins talk
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
    </AppShell>
  );
}
