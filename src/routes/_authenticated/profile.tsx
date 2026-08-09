import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Pencil, Save, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { TwinIntelligencePanel } from "@/components/twin-intelligence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { importSources, photoFor, trainingSources } from "@/lib/demo-data";
import { resolvePeople } from "@/lib/people-directory";
import { twinKnowledge } from "@/lib/twin-knowledge";
import { useTwin } from "@/lib/twin-store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — what your AI Twin knows" },
      {
        name: "description",
        content:
          "Review the profile your SyncdIn AI Twin represents you with: name, headline, location, connections and the sources it learned from.",
      },
      { property: "og:title", content: "Your SyncdIn profile" },
      {
        property: "og:description",
        content: "Your Twin introduces you using exactly this profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { intelligence, dimensions, state, hydrated } = useTwin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setEmail(auth.user.email ?? "");
      setAvatarUrl((auth.user.user_metadata?.["avatar_url"] as string | undefined) ?? null);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, headline, location, avatar_url")
        .eq("id", auth.user.id)
        .maybeSingle();
      setFullName(data?.full_name ?? "");
      setHeadline(data?.headline ?? "");
      setLocation(data?.location ?? "");
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: auth.user.id,
      full_name: fullName,
      headline,
      location,
      twin_intelligence: intelligence,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(false);
    toast.success("Profile saved — your Twin will use this from now on.");
  }

  const sources = [...importSources, ...trainingSources].filter(
    (s) => state.connectedSources.includes(s.id) || state.trainedSources.includes(s.id),
  );

  const knowledge = useMemo(
    () => twinKnowledge([...state.connectedSources, ...state.trainedSources]),
    [state.connectedSources, state.trainedSources],
  );

  const connections = useMemo(
    () => resolvePeople(state.connectionsMade),
    [state.connectionsMade],
  );

  const displayName = fullName.trim() || email.split("@")[0] || "Your profile";

  return (
    <AppShell>
      {/* Header */}
      <section className="surface-card p-6 sm:p-8">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading your profile…
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-20 shrink-0 rounded-full object-cover ring-2 ring-primary/30 sm:size-24"
                />
              ) : (
                <span className="grid size-20 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-extrabold text-primary sm:size-24">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{displayName}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {headline || "Add a headline so your Twin can introduce you properly."}
                </p>
                {location ? (
                  <p className="text-sm text-muted-foreground">{location}</p>
                ) : null}

                <dl className="mt-4 flex flex-wrap gap-6">
                  <div>
                    <dd className="text-lg font-extrabold tabular-nums">
                      {hydrated ? connections.length : "—"}
                    </dd>
                    <dt className="text-xs text-muted-foreground">Connections</dt>
                  </div>
                  <div>
                    <dd className="text-lg font-extrabold tabular-nums">{intelligence}%</dd>
                    <dt className="text-xs text-muted-foreground">Twin Intelligence</dt>
                  </div>
                  <div>
                    <dd className="text-lg font-extrabold tabular-nums">{sources.length}</dd>
                    <dt className="text-xs text-muted-foreground">Signals connected</dt>
                  </div>
                </dl>
              </div>

              <Button
                variant={editing ? "ghost" : "outline"}
                className="self-start"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? (
                  <>
                    <X aria-hidden="true" className="size-4" /> Cancel
                  </>
                ) : (
                  <>
                    <Pencil aria-hidden="true" className="size-4" /> Edit profile
                  </>
                )}
              </Button>
            </div>

            {editing ? (
              <form className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2" onSubmit={save}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} readOnly className="h-11 bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Senior AI Engineer · inference infrastructure"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Remote · Berlin, DE"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="h-11 sm:col-span-2" disabled={saving}>
                  {saving ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="size-4" />
                  )}
                  Save profile
                </Button>
              </form>
            ) : null}
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Skills / interests / projects */}
          <section className="surface-card p-6">
            <h2 className="text-lg font-bold">What your Twin knows</h2>
            {knowledge.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing connected yet — your Twin is still guessing.{" "}
                <Link to="/twin" className="focus-ring font-semibold text-primary">
                  Add a signal
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {knowledge.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.label}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.items.slice(0, 10).map((item) => (
                        <Badge key={item} variant="outline" className="font-normal">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Connections */}
          <section className="surface-card p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Connections</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                {connections.length}
              </span>
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link to="/network">Find more</Link>
              </Button>
            </div>

            {!hydrated ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading connections…
              </p>
            ) : connections.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No connections yet. Run Event Radar or browse your network and let your Twins talk.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {connections.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 py-3">
                    <img
                      src={photoFor(person.id)}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{person.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {person.role} · {person.company}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/network">
                          <UserRound aria-hidden="true" className="size-4" />
                          <span className="sr-only sm:not-sr-only">Profile</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link to="/messages/$peer" params={{ peer: person.id }}>
                          <MessageCircle aria-hidden="true" className="size-4" />
                          <span className="sr-only sm:not-sr-only">Chat</span>
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <TwinIntelligencePanel intelligence={intelligence} dimensions={dimensions} />
          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Sources your Twin reads</h2>
            {sources.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing connected yet — your Twin is guessing.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {sources.map((s) => (
                  <Badge key={s.id} variant="secondary" className="bg-success-soft text-success">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/twin">Add another source</Link>
            </Button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
