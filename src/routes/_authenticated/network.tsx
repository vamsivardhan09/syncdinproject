import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RealPeopleDirectory } from "@/components/real-people-directory";
import { RecommendationCard } from "@/components/recommendation-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoPeople, type PersonaKind } from "@/lib/demo-data";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "My Network — matches your AI Twin approved" },
      {
        name: "description",
        content:
          "Browse recruiters, founders, mentors, engineers and investors your AI Twin matched you with, each with a transparent explanation.",
      },
      { property: "og:title", content: "Matches your AI Twin approved" },
      {
        property: "og:description",
        content: "Recruiters, founders, mentors and collaborators — with reasons, not just scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Network,
});

const filters: (PersonaKind | "All")[] = [
  "All",
  "Recruiter",
  "Founder",
  "Mentor",
  "AI Engineer",
  "Software Engineer",
  "Product Manager",
  "Investor",
  "Student",
];

function Network() {
  const { state, toggleConnection } = useTwin();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoPeople
      .filter((p) => (filter === "All" ? true : p.kind === filter))
      .filter((p) =>
        q
          ? [p.name, p.role, p.company, ...p.skills, ...p.interests]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => b.match - a.match);
  }, [filter, query]);

  const hasContext = state.connectedSources.length + state.trainedSources.length > 0;

  return (
    <AppShell>
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Matches your Twin approved</h1>
        <p className="mt-2 text-muted-foreground">
          Sorted by fit, not by follower count. Every card shows why it made the cut.
        </p>
      </header>

      <div className="mt-7 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-11 pl-9"
            placeholder="Search roles, skills, companies"
            aria-label="Search matches"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!hasContext ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="surface-card mt-7 border-primary/25 bg-primary-soft/50 p-6"
        >
          <h2 className="flex items-center gap-2 text-base font-bold">
            Your Twin wants more
            context
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your AI Twin needs a little more context before it can find your perfect connections.
            These matches are a preview of what it can do at full strength.
          </p>
          <Button asChild className="mt-4">
            <Link to="/twin">
              Improve my Twin <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </motion.section>
      ) : null}

      {people.length === 0 ? (
        <div className="surface-card mt-7 p-10 text-center">
          <h2 className="text-lg font-bold">No matches in this slice yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your AI Twin needs a little more context before discovering connections here. Widen the
            filter or teach it something new.
          </p>
          <Button asChild className="mt-5">
            <Link to="/twin">Improve my Twin</Link>
          </Button>
        </div>
      ) : (
        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {people.map((person, i) => (
            <RecommendationCard
              key={person.id}
              person={person}
              index={i}
              connected={state.connectionsMade.includes(person.id)}
              onConnect={() => toggleConnection(person.id)}
            />
          ))}
        </section>
      )}
    </AppShell>
  );
}
