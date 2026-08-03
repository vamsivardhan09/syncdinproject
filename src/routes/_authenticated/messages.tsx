import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { demoFollowUps, demoOpeners } from "@/lib/feed-data";
import { demoPeople, personById, photoFor } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

type Search = { peer?: string | undefined };

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["peer"] === "string" ? { peer: search["peer"] } : {},

  head: () => ({
    meta: [
      { title: "Messages — conversations your Twin started" },
      {
        name: "description",
        content:
          "Chat in real time with the recruiters, founders, engineers and mentors your SyncdIn AI Twin matched you with.",
      },
      { property: "og:title", content: "SyncdIn Messages" },
      {
        property: "og:description",
        content: "Every conversation opens with context, not a cold hello.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Messages,
});

type Message = {
  id: string;
  peer_slug: string;
  sender: string;
  body: string;
  created_at: string;
};

function Messages() {
  const { peer } = Route.useSearch();
  const { state, toggleConnection } = useTwin();
  const navigate = Route.useNavigate();

  const threads = useMemo(() => {
    const connected = demoPeople.filter((p) => state.connectionsMade.includes(p.id));
    return connected.length > 0 ? connected : demoPeople.slice(0, 4);
  }, [state.connectionsMade]);

  const activeId = peer && personById(peer) ? peer : threads[0]?.id;
  const active = activeId ? personById(activeId) : undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const seedThread = useCallback(
    async (uid: string, slug: string) => {
      const openers = demoOpeners[slug] ?? ["Hi! Great to be matched by our Twins."];
      const now = Date.now();
      const rows = openers.map((body, i) => ({
        user_id: uid,
        peer_slug: slug,
        sender: "peer",
        body,
        created_at: new Date(now + i * 1000).toISOString(),
      }));
      await supabase.from("messages").insert(rows);
    },
    [],
  );

  // Load (and seed on first open) the active thread.
  useEffect(() => {
    if (!userId || !activeId) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, peer_slug, sender, body, created_at")
        .eq("peer_slug", activeId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (!data || data.length === 0) {
        await seedThread(userId, activeId);
        const { data: seeded } = await supabase
          .from("messages")
          .select("id, peer_slug, sender, body, created_at")
          .eq("peer_slug", activeId)
          .order("created_at", { ascending: true });
        if (!cancelled) setMessages(seeded ?? []);
      } else {
        setMessages(data);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, activeId, seedThread]);

  // Live updates so new messages land without a refresh.
  useEffect(() => {
    if (!userId || !activeId) return;
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.peer_slug !== activeId) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId || !activeId) return;
    setDraft("");
    await supabase.from("messages").insert({ user_id: userId, peer_slug: activeId, sender: "user", body });
    if (!state.connectionsMade.includes(activeId)) toggleConnection(activeId);

    setTyping(true);
    window.setTimeout(
      () => {
        setTyping(false);
        const reply = demoFollowUps[Math.floor(Math.random() * demoFollowUps.length)]!;
        void supabase
          .from("messages")
          .insert({ user_id: userId, peer_slug: activeId, sender: "peer", body: reply });
      },
      1400 + Math.random() * 900,
    );
  }

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Messages</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your Twin already explained who you are. These conversations start halfway in.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[18rem_1fr]">
        <aside className="surface-card overflow-hidden p-2">
          <ul className="space-y-1">
            {threads.map((p) => {
              const isActive = p.id === activeId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void navigate({ search: { peer: p.id } })}
                    className={cn(
                      "focus-ring flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                      isActive ? "bg-primary-soft" : "hover:bg-muted",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <img
                      src={photoFor(p.id)}
                      alt=""
                      loading="lazy"
                      className="size-9 rounded-full object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.role}</span>
                    </span>
                    <Badge variant="secondary" className="bg-primary-soft font-mono text-[0.68rem] text-primary">
                      {p.match}%
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="surface-card flex min-h-[32rem] flex-col p-0">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-border p-4">
                <img
                  src={photoFor(active.id)}
                  alt=""
                  className="size-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold">{active.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {active.role} · {active.company}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link to="/network">View match</Link>
                </Button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded-xl border border-primary/20 bg-primary-soft/60 p-3 text-sm">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                    <Sparkles aria-hidden="true" className="size-3.5" /> Twin context
                  </p>
                  <p className="mt-1 text-muted-foreground">{active.aiSummary}</p>
                </div>

                {loading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading
                    conversation…
                  </p>
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

                {typing ? (
                  <p className="text-xs text-muted-foreground">{active.name} is typing…</p>
                ) : null}
                <div ref={endRef} />
              </div>

              <div className="border-t border-border p-4">
                <button
                  type="button"
                  onClick={() => setDraft(active.conversationStarter)}
                  className="focus-ring mb-3 w-full rounded-xl border border-dashed border-primary/40 p-2.5 text-left text-xs text-muted-foreground hover:bg-primary-soft/50"
                >
                  <span className="font-semibold text-primary">Use Twin suggestion:</span> “
                  {active.conversationStarter}”
                </button>
                <form onSubmit={send} className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${active.name.split(" ")[0]}…`}
                    aria-label={`Message ${active.name}`}
                    className="h-11"
                  />
                  <Button type="submit" className="h-11" disabled={draft.trim().length === 0}>
                    <Send aria-hidden="true" className="size-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              No conversations yet. Let your Twin talk to a match first.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
