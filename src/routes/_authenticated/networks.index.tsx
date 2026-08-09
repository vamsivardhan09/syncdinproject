import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Globe2, Radar, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { networks } from "@/lib/event-network";
import { useTwin } from "@/lib/twin-store";

const title = "Explore a network — SyncdIn";
const description =
  "Join a conference or community and let your AI Twin narrow the room to the handful of people actually worth your time.";

export const Route = createFileRoute("/_authenticated/networks/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: "Explore a network on SyncdIn" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Networks,
});

function Networks() {
  const { state } = useTwin();

  return (
    <AppShell>
      <header>
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          <Radar aria-hidden="true" className="size-3.5" /> Networking Radar
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Explore a network</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Conferences, communities and group chats are full of people you will never get to. Join
          one and your Twin reads the whole room for you.
        </p>
      </header>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        {networks.map((n, i) => {
          const joined = state.joinedNetworks.includes(n.code);
          return (
            <motion.article
              key={n.code}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="surface-card flex h-full flex-col p-6 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-primary-soft text-primary">
                    {n.kind}
                  </Badge>
                  {n.mode === "live" ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <Radar aria-hidden="true" className="size-3.5" /> Event Radar
                    </span>
                  ) : null}
                </div>
                {joined ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-success">
                    <Check aria-hidden="true" className="size-3.5" /> Joined
                  </span>
                ) : null}
              </div>

              <h2 className="mt-3 text-xl font-bold">{n.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{n.tagline}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Attendees</dt>
                  <dd className="flex items-center gap-1.5 font-semibold tabular-nums">
                    <Users aria-hidden="true" className="size-3.5 text-primary" />
                    {n.attendeeCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Where</dt>
                  <dd className="flex items-center gap-1.5 font-semibold">
                    <Globe2 aria-hidden="true" className="size-3.5 text-primary" />
                    {n.location}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">When</dt>
                  <dd className="font-semibold">{n.dates}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Hosted by</dt>
                  <dd className="truncate font-semibold">{n.host}</dd>
                </div>
              </dl>

              <p className="mt-4 rounded-xl bg-muted/70 p-3 font-mono text-xs break-all text-muted-foreground">
                syncdin.app/networks/{n.code}
              </p>

              <Button asChild className="mt-5 w-full">
                <Link to="/networks/$code" params={{ code: n.code }}>
                  {n.mode === "live"
                    ? joined
                      ? "Open Event Radar"
                      : "Join event network"
                    : joined
                      ? "Open network"
                      : "Join and let my Twin analyze it"}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>

            </motion.article>
          );
        })}
      </section>

      <section className="surface-card mt-7 border-primary/25 bg-primary-soft/40 p-6">
        <h2 className="text-base font-bold">Why this matters</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Instead of asking you to network with a hundred people, SyncdIn lets your Twin narrow the
          room to the few most worth your time — and shows you the evidence behind every pick.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Attendee lists in this prototype are seeded demo profiles. There is no live event-platform
          integration yet.
        </p>
      </section>

      <section className="surface-card mt-5 p-6">
        <h2 className="text-base font-bold">What&apos;s next (idea tank)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deliberately not built yet — the current priority is proving the loop above.
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>Organiser-owned event networks with a custom join link</li>
          <li>QR check-in at the venue door</li>
          <li>Trusted, invite-only communities with reputation signals</li>
          <li>Group matching: forming a table of four, not just a 1:1</li>
        </ul>
      </section>

    </AppShell>
  );
}
