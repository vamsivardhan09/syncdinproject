import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, BrainCircuit, Radar, Sparkles, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SyncdIn — Your personal AI networking agent" },
      {
        name: "description",
        content:
          "SyncdIn gives every professional an AI Twin that meets other twins first, then introduces you to recruiters, founders, mentors and collaborators worth your time.",
      },
      { property: "og:title", content: "SyncdIn — Your personal AI networking agent" },
      {
        property: "og:description",
        content:
          "Build your AI Twin in about 60 seconds and get matched with recruiters, founders, mentors and collaborators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: BrainCircuit,
    title: "An AI Twin that knows your work",
    body: "Career, projects, goals, communication style and learning patterns — captured from sources you already have.",
  },
  {
    icon: Radar,
    title: "Twins meet before humans do",
    body: "Your twin screens hundreds of professionals a day and only surfaces the conversations worth having.",
  },
  {
    icon: Sparkles,
    title: "Every match explains itself",
    body: "Shared goals, complementary skills, a suggested collaboration and a first message written in your voice.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="canvas-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo />
        <Button asChild variant="ghost">
          <Link to="/signin">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pt-14 pb-16 text-center sm:pt-24"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
            <Sparkles aria-hidden="true" className="size-3.5" /> SyncdIn v2 — AI networking, rebuilt
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-extrabold sm:text-6xl">
            Your personal <span className="brand-gradient-text">AI networking agent</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Build your AI Twin in about a minute. It talks to other twins, finds the recruiters,
            founders, mentors and collaborators who actually fit, and hands you the first line.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-glow">
              <Link to="/signup">
                Build my AI Twin <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer aria-hidden="true" className="size-4" /> About 60 seconds. No forms.
            </span>
          </div>
        </motion.section>

        <section aria-label="How SyncdIn works" className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
              className="surface-card p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <p.icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </motion.article>
          ))}
        </section>
      </main>
    </div>
  );
}
