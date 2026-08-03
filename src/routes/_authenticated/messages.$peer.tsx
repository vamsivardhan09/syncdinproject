import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Bot, Loader2, MapPin, Send, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { importSources, personById, photoFor, trainingSources } from "@/lib/demo-data";
import { generateTwinReply } from "@/lib/twin-chat.functions";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages/$peer")({
  loader: ({ params }) => {
    const person = personById(params.peer);
    if (!person) throw notFound();
    return { name: person.name, role: person.role, company: person.company };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Conversation unavailable" }, { name: "robots", content: "noindex" }],
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
  peer_slug: string;
  sender: string;
  body: string;
  created_at: string;
};

function Conversation() {
  const { peer } = Route.useParams();
  const { state, intelligence, toggleConnection } = useTwin();
  const person = personById(peer)!;
  const runTwin = useServerFn(generateTwinReply);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    headline: string | null;
    location: string | null;
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

  const userContext = useMemo(
    () => ({
      name: profile?.full_name ?? "the user",
      headline: profile?.headline ?? "",
      location: profile?.location ?? "",
      intelligence,
      sources: sourceNames,
    }),
    [profile, intelligence, sourceNames],
  );

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, headline, location")
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
      const { data } = await supabase
        .from("messages")
        .select("id, peer_slug, sender, body, created_at")
        .eq("peer_slug", peer)
        .order("created_at", { ascending: true });
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
        .insert({ user_id: userId, peer_slug: peer, sender, body })
        .select("id, peer_slug, sender, body, created_at")
        .single();
      if (error) {
        toast.error("Could not save that message.");
        return;
      }
      if (data) setMessages((prev) => [...prev, data]);
    },
    [userId, peer],
  );

  const twinTurn = useCallback(
    async (speaker: "peer" | "user", transcript: { sender: "user" | "peer"; body: string }[]) => {
      setThinking(speaker);
      try {
        const { text } = await runTwin({
          data: { speaker, peerId: peer, userContext, transcript: transcript.slice(-20) },
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
    [runTwin, peer, userContext, persist],
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
    if (!state.connectionsMade.includes(peer)) toggleConnection(peer);
    const base = [...transcriptOf(messages), { sender: "user" as const, body }];
    const reply = await twinTurn("peer", base);
    if (reply && autopilot) {
      await twinTurn("user", [...base, { sender: "peer" as const, body: reply }]);
    }
  }

  async function letTwinsTalk() {
    if (!userId || thinking) return;
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

  const thinkingLabel =
    thinking === "peer" ? `${person.name.split(" ")[0]}'s Twin is typing…` : "Your Twin is typing…";

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/messages">
            <ArrowLeft aria-hidden="true" className="size-4" /> All conversations
          </Link>
        </Button>

        {/* Profile header — who you're talking to, before the chat starts. */}
        <section className="surface-card mt-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={photoFor(person.id)}
              alt=""
              className="size-16 rounded-full object-cover sm:size-20"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold sm:text-2xl">{person.name}</h1>
                <Badge
                  variant="secondary"
                  className="bg-primary-soft font-mono text-[0.7rem] text-primary"
                >
                  {person.match}% match
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground/80">
                {person.role} · {person.company}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3.5" /> {person.location}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{person.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {person.skills.slice(0, 4).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[0.7rem]">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/60 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
              <Sparkles aria-hidden="true" className="size-3.5" /> Why your Twin matched you
            </p>
            <p className="mt-1 text-muted-foreground">{person.aiSummary}</p>
          </div>
        </section>

        {/* Chat */}
        <section className="surface-card mt-4 flex min-h-[26rem] flex-col p-0">
          <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Bot aria-hidden="true" className="size-4 text-primary" /> Twin-to-Twin chat
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="autopilot" className="text-xs text-muted-foreground">
                My Twin replies for me
              </Label>
              <Switch id="autopilot" checked={autopilot} onCheckedChange={setAutopilot} />
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
                  className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}
                >
                  <p
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.sender === "user"
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

          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft(person.conversationStarter)}
                className="focus-ring flex-1 rounded-xl border border-dashed border-primary/40 p-2.5 text-left text-xs text-muted-foreground hover:bg-primary-soft/50"
              >
                <span className="font-semibold text-primary">Use Twin suggestion:</span> “
                {person.conversationStarter}”
              </button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void letTwinsTalk()}
                disabled={thinking !== null}
              >
                <Sparkles aria-hidden="true" className="size-4" /> Let our Twins talk
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
