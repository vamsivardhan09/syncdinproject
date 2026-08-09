import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  currentUserId,
  displayName,
  initialsOf,
  listIncomingRequests,
  listRealConnections,
  respondToRequest,
  searchPeople,
  sendConnectionRequest,
  type ConnectionProfile,
  type ConnectionRequest,
  type PublicProfile,
} from "@/lib/real-people";

function Avatar({ profile, size = 44 }: { profile: PublicProfile; size?: number }) {
  const name = displayName(profile);
  return profile.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={name}
      loading="lazy"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-1 ring-border"
    />
  ) : (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary"
    >
      {initialsOf(name)}
    </span>
  );
}

function PersonRow({
  profile,
  right,
}: {
  profile: PublicProfile;
  right?: React.ReactNode;
}) {
  const name = displayName(profile);
  return (
    <li className="flex items-center gap-3 py-3">
      <Link
        to="/people/$id"
        params={{ id: profile.id }}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar profile={profile} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {profile.headline || "Building their AI Twin"}
            {profile.location ? ` · ${profile.location}` : ""}
          </span>
        </span>
      </Link>
      {right}
    </li>
  );
}

/** Real members: pending requests to answer, plus a searchable directory. */
export function RealPeopleDirectory() {
  const [me, setMe] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [requests, setRequests] = useState<
    { request: ConnectionRequest; actor: PublicProfile | null }[]
  >([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    setError(null);
    void (async () => {
      try {
        const [uid, list, incoming] = await Promise.all([
          currentUserId(),
          searchPeople(q),
          listIncomingRequests(),
        ]);
        setMe(uid);
        setPeople(list);
        setRequests(incoming);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load members.");
        setPeople([]);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  async function connect(profile: PublicProfile) {
    setBusy(profile.id);
    try {
      await sendConnectionRequest(profile.id);
      setSent((prev) => new Set(prev).add(profile.id));
      toast.success(`Request sent to ${displayName(profile)}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setBusy(null);
    }
  }

  async function respond(id: string, status: "accepted" | "declined") {
    setBusy(id);
    try {
      await respondToRequest(id, status);
      setRequests((prev) => prev.filter((r) => r.request.id !== id));
      toast.success(status === "accepted" ? "Connected." : "Request declined.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the request.");
    } finally {
      setBusy(null);
    }
  }

  const others = (people ?? []).filter((p) => p.id !== me);

  return (
    <section className="surface-card p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users aria-hidden="true" className="size-5 text-primary" /> People on SyncdIn
        </h2>
        <p className="text-sm text-muted-foreground">Real accounts, real connection requests.</p>
      </header>

      {requests.length > 0 ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary-soft/40 p-4">
          <h3 className="text-sm font-bold">
            {requests.length} connection request{requests.length > 1 ? "s" : ""} waiting
          </h3>
          <ul className="divide-y divide-border/70">
            {requests.map(({ request, actor }) =>
              actor ? (
                <PersonRow
                  key={request.id}
                  profile={actor}
                  right={
                    <span className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busy === request.id}
                        onClick={() => void respond(request.id, "accepted")}
                      >
                        <Check aria-hidden="true" className="size-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === request.id}
                        onClick={() => void respond(request.id, "declined")}
                      >
                        <X aria-hidden="true" className="size-4" />
                        <span className="sr-only">Decline</span>
                      </Button>
                    </span>
                  }
                />
              ) : null,
            )}
          </ul>
        </div>
      ) : null}

      <div className="relative mt-5 max-w-md">
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="h-11 pl-9"
          placeholder="Search members by name, headline, skill or city"
          aria-label="Search SyncdIn members"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? (
        <div className="mt-4 text-sm">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => load(query)}
            className="focus-ring mt-1 font-semibold text-primary"
          >
            Retry
          </button>
        </div>
      ) : people === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Looking for members…
        </p>
      ) : others.length === 0 ? (
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          {query
            ? "No discoverable member matches that search yet."
            : "You're early. Invite a teammate to sign up and they'll appear here as soon as they finish onboarding."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {others.map((profile) => (
            <PersonRow
              key={profile.id}
              profile={profile}
              right={
                sent.has(profile.id) ? (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Clock aria-hidden="true" className="size-3.5" /> Pending
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={busy === profile.id}
                    onClick={() => void connect(profile)}
                  >
                    {busy === profile.id ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    ) : (
                      <UserPlus aria-hidden="true" className="size-4" />
                    )}
                    Connect
                  </Button>
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Accepted, database-backed connections between real accounts. */
export function RealConnectionsList() {
  const [rows, setRows] = useState<ConnectionProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    void listRealConnections()
      .then(setRows)
      .catch((err: Error) => {
        setError(err.message);
        setRows([]);
      });
  }, []);

  useEffect(load, [load]);

  return (
    <section className="surface-card p-6">
      <h2 className="text-sm font-bold">Real SyncdIn connections</h2>
      {error ? (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      ) : rows === null ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading connections…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No accepted connections with real members yet.{" "}
          <Link to="/network" className="focus-ring font-semibold text-primary">
            Find people
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((profile) => (
            <PersonRow key={profile.id} profile={profile} />
          ))}
        </ul>
      )}
    </section>
  );
}
