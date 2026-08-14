import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { demoPeople, photoFor } from "@/lib/demo-data";
import { personFromProfile, resolvePeople } from "@/lib/people-directory";
import { getPublicProfile, isRealUserId } from "@/lib/real-people";
import { useTwin } from "@/lib/twin-store";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — conversations your Twin started" },
      {
        name: "description",
        content:
          "Every chat your SyncdIn AI Twin opened for you, in one inbox. Tap a match to see their profile and continue the conversation.",
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
  component: Inbox,
});

function Inbox() {
  const { state } = useTwin();
  const [query, setQuery] = useState("");
  const [previews, setPreviews] = useState<Record<string, { body: string; at: string }>>({});
  const [realThreads, setRealThreads] = useState<ReturnType<typeof personFromProfile>[]>([]);

  const threads = useMemo(() => {
    const connected = resolvePeople(state.connectionsMade);
    const byId = new Map([...realThreads, ...connected].map((person) => [person.id, person]));
    const base = byId.size > 0 ? Array.from(byId.values()) : demoPeople.slice(0, 4);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) =>
      [p.name, p.role, p.company].some((v) => v.toLowerCase().includes(q)),
    );
  }, [state.connectionsMade, realThreads, query]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      if (!me) return;
      const { data } = await supabase
        .from("messages")
        .select("user_id, recipient_id, peer_slug, body, created_at")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const map: Record<string, { body: string; at: string }> = {};
      const peerIds = new Set<string>();
      for (const row of data) {
        const threadId: string =
          row.user_id === me ? (row.recipient_id ?? row.peer_slug) : row.user_id;
        map[threadId] = { body: row.body, at: row.created_at };
        if (isRealUserId(threadId) && threadId !== me) peerIds.add(threadId);
      }
      setPreviews(map);
      const profiles = await Promise.all(Array.from(peerIds).map((id) => getPublicProfile(id)));
      if (!cancelled) {
        setRealThreads(profiles.filter((profile) => profile !== null).map(personFromProfile));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Messages</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Your Twin already made the introduction. Open a chat to pick it up mid-conversation.
        </p>
      </header>

      <div className="relative mt-6 max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
          className="h-11 pl-9"
        />
      </div>

      <ul className="surface-card mt-6 divide-y divide-border p-0">
        {threads.map((p) => {
          const preview = previews[p.id];
          return (
            <li key={p.id}>
              <Link
                to="/messages/$peer"
                params={{ peer: p.id }}
                className="focus-ring flex items-center gap-3 p-4 transition-colors hover:bg-muted/70"
              >
                <img
                  src={photoFor(p.id, p.name)}
                  alt=""
                  loading="lazy"
                  className="size-12 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    <Badge
                      variant="secondary"
                      className="bg-primary-soft font-mono text-[0.68rem] text-primary"
                    >
                      {p.match}%
                    </Badge>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    {preview ? (
                      preview.body
                    ) : (
                      <>
                        Twin ready to open this conversation
                      </>
                    )}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
        {threads.length === 0 ? (
          <li className="p-6 text-sm text-muted-foreground">No conversations match that search.</li>
        ) : null}
      </ul>
    </AppShell>
  );
}
