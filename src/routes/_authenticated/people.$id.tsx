import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelRequest,
  currentUserId,
  displayName,
  getPublicProfile,
  getRequestWith,
  initialsOf,
  isRealUserId,
  respondToRequest,
  sendConnectionRequest,
  type ConnectionRequest,
  type PublicProfile,
} from "@/lib/real-people";

export const Route = createFileRoute("/_authenticated/people/$id")({
  head: () => ({
    meta: [
      { title: "Member profile — SyncdIn" },
      {
        name: "description",
        content:
          "See a SyncdIn member's headline, location and skills, and send a connection request their AI Twin can act on.",
      },
      { property: "og:title", content: "SyncdIn member profile" },
      {
        property: "og:description",
        content: "Connect with real SyncdIn members and let your Twins compare notes.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemberProfile,
});

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "missing" }
  | { phase: "ready"; profile: PublicProfile; me: string | null; request: ConnectionRequest | null };

function MemberProfile() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState({ phase: "loading" });
    if (!isRealUserId(id)) {
      setState({ phase: "missing" });
      return;
    }
    void (async () => {
      try {
        // Sequential: concurrent auth reads can stall on the session lock.
        const me = await currentUserId();
        const profile = await getPublicProfile(id);
        const request = await getRequestWith(id);

        if (!profile) {
          setState({ phase: "missing" });
          return;
        }
        setState({ phase: "ready", profile, me, request });
      } catch (err) {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Could not load this profile.",
        });
      }
    })();
  }, [id]);

  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      load();
      void router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === "loading") {
    return (
      <AppShell>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading profile…
        </p>
      </AppShell>
    );
  }

  if (state.phase === "missing" || state.phase === "error") {
    return (
      <AppShell>
        <div className="max-w-lg space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Profile unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {state.phase === "error"
              ? state.message
              : "This member either does not exist or has turned off discovery."}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/network">
                <ArrowLeft aria-hidden="true" className="size-4" /> Back to network
              </Link>
            </Button>
            {state.phase === "error" ? (
              <Button onClick={load} variant="secondary">
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </AppShell>
    );
  }

  const { profile, me, request } = state;
  const name = displayName(profile);
  const isSelf = me !== null && me === profile.id;
  const accepted = request?.status === "accepted";
  const incoming = request?.status === "pending" && request.recipient_id === me;
  const outgoing = request?.status === "pending" && request.requester_id === me;
  const declined = request?.status === "declined";

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <Link
          to="/network"
          className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Network
        </Link>

        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="size-20 rounded-full object-cover ring-2 ring-primary-soft"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-20 shrink-0 place-items-center rounded-full bg-primary-soft text-xl font-bold text-primary"
              >
                {initialsOf(name)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
              {profile.headline ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{profile.headline}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5" /> {profile.location}
                  </span>
                ) : null}
                <span className="font-mono">
                  Twin intelligence {profile.twin_intelligence ?? 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {isSelf ? (
              <Button asChild variant="outline">
                <Link to="/profile">Edit your profile</Link>
              </Button>
            ) : accepted ? (
              <>
                <Badge className="h-9 gap-1.5 px-3">
                  <Check aria-hidden="true" className="size-3.5" /> Connected
                </Badge>
                <Button variant="outline" disabled title="Member-to-member chat is coming next">
                  <MessageCircle aria-hidden="true" className="size-4" /> Message
                </Button>
              </>
            ) : incoming ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(() => respondToRequest(request.id, "accepted"), `You and ${name} are connected.`)
                  }
                >
                  <Check aria-hidden="true" className="size-4" /> Accept request
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void act(() => respondToRequest(request.id, "declined"), "Request declined.")
                  }
                >
                  <X aria-hidden="true" className="size-4" /> Decline
                </Button>
              </>
            ) : outgoing ? (
              <>
                <Badge variant="secondary" className="h-9 gap-1.5 px-3">
                  <Clock aria-hidden="true" className="size-3.5" /> Request pending
                </Badge>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void act(() => cancelRequest(request.id), "Request withdrawn.")}
                >
                  Withdraw
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(() => sendConnectionRequest(profile.id), `Request sent to ${name}.`)
                  }
                >
                  {busy ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <UserPlus aria-hidden="true" className="size-4" />
                  )}
                  Connect
                </Button>
                {declined ? (
                  <p className="self-center text-xs text-muted-foreground">
                    A previous request was declined — you can send a new one.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold">Skills their Twin can speak to</h2>
          {profile.skills && profile.skills.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li key={skill}>
                  <Badge variant="secondary">{skill}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {name} has not trained their Twin with skills yet.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
