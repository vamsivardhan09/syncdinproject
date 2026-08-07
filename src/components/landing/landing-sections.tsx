import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Globe2,
  Handshake,
  Lock,
  MessageSquare,
  Radar,
  ShieldCheck,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { demoPeople, photoFor, twinDimensions } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const rise = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary uppercase">
      {children}
    </p>
  );
}

function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-6 py-20 sm:py-24 ${className}`}>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ hero */

export function Hero() {
  return (
    <div className="canvas-glow relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
            SyncdIn v2 — AI networking, rebuilt
          </span>

          <h1 className="mt-6 text-4xl leading-[1.04] font-extrabold tracking-tight sm:text-[3.6rem]">
            Your personal <span className="brand-gradient-text">AI networking agent</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            SyncdIn builds an AI Twin of your professional self in about 60 seconds. It meets other
            people&apos;s Twins, filters thousands of profiles, and introduces you only to the
            recruiters, founders, mentors and collaborators genuinely worth your time — with the
            reason and the first message already written.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-glow">
              <Link to="/signup">
                Build my AI Twin <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link to="/signin">See a live demo</Link>
            </Button>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[
              { icon: Timer, text: "~60 second setup" },
              { icon: ShieldCheck, text: "You approve every intro" },
              { icon: Zap, text: "No forms, no cold outreach" },
            ].map((i) => (
              <li key={i.text} className="inline-flex items-center gap-1.5">
                <i.icon aria-hidden="true" className="size-4 text-primary" /> {i.text}
              </li>
            ))}
          </ul>
        </motion.div>

        <HeroPreview />
      </div>
    </div>
  );
}

function HeroPreview() {
  const preview = demoPeople.slice(0, 2);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      aria-hidden="true"
    >
      <div className="surface-card overflow-hidden shadow-lift">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-warning/50" />
          <span className="size-2.5 rounded-full bg-success/40" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            syncdin.app / dashboard
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Twin intelligence
              </p>
              <span className="text-sm font-bold text-primary">86%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: "18%" }}
                animate={{ width: "86%" }}
                transition={{ duration: 1.6, delay: 0.5, ease: "easeOut" }}
                className="brand-gradient-bg h-full rounded-full"
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {twinDimensions.slice(0, 4).map((d) => (
                <div key={d.key} className="rounded-lg bg-card px-2 py-2 text-center">
                  <p className="truncate text-[0.6rem] font-medium text-muted-foreground">
                    {d.label}
                  </p>
                  <p className="text-xs font-bold">{d.base + 60}%</p>
                </div>
              ))}
            </div>
          </div>

          {preview.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.18 }}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <img src={photoFor(p.id)} alt="" className="size-9 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.role} · {p.company}
                  </p>
                </div>
                <span className="ml-auto rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">
                  {p.match}%
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                “{p.conversationStarter}”
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="surface-card absolute -bottom-6 -left-4 hidden items-center gap-2 px-3.5 py-2.5 shadow-lift sm:flex"
      >
        <Radar aria-hidden="true" className="size-4 text-primary" />
        <p className="text-xs font-semibold">
          Your Twin screened <span className="text-primary">1,284</span> people overnight
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ stats */

const stats = [
  { value: "12.4k", label: "Professionals with a Twin" },
  { value: "3.2M", label: "Twin-to-Twin matches / week" },
  { value: "61s", label: "Median time to first match" },
  { value: "94%", label: "Say intros felt relevant" },
];

export function StatsBand() {
  return (
    <div className="border-y border-border bg-secondary/40">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="text-3xl font-extrabold tracking-tight tabular-nums">{s.value}</dd>
            <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ problem */

export function WhySection() {
  return (
    <Section id="why">
      <motion.div {...rise} className="max-w-2xl">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Professional networking is still a manual numbers game.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          You scroll feeds, guess who is relevant, send cold messages, and hope. Most of it is
          wasted effort — for you and for the person on the other side.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <motion.div {...rise} className="rounded-3xl border border-border bg-secondary/40 p-7">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Networking today
          </p>
          <ul className="mt-5 space-y-3.5 text-sm text-muted-foreground">
            {[
              "Hours of scrolling to find one relevant person",
              "Cold messages that ignore context and get ignored",
              "No idea why a profile was recommended to you",
              "Opportunities missed while you were offline",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          {...rise}
          className="rounded-3xl border border-primary/25 bg-primary-soft/70 p-7 shadow-soft"
        >
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            Networking with SyncdIn
          </p>
          <ul className="mt-5 space-y-3.5 text-sm">
            {[
              "Your Twin screens thousands of profiles while you sleep",
              "Every match arrives with a plain-language reason",
              "A first message drafted in your own voice",
              "Twin-to-Twin conversations happen before humans do",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ how it works */

const steps = [
  {
    n: "01",
    icon: Zap,
    title: "Sign in and see value instantly",
    body: "No forms. Continue with Google, a magic link or a password and you land on a working dashboard with real matches already waiting.",
  },
  {
    n: "02",
    icon: BrainCircuit,
    title: "Connect a source, watch your Twin learn",
    body: "LinkedIn, GitHub, a résumé or a ChatGPT export. Each connection runs a live sync — reading, extracting, learning — and your Twin Intelligence climbs on screen.",
  },
  {
    n: "03",
    icon: Radar,
    title: "Your Twin meets other Twins",
    body: "In the background, your Twin negotiates relevance with thousands of others: shared goals, complementary skills, timing and intent.",
  },
  {
    n: "04",
    icon: Handshake,
    title: "You approve the introductions",
    body: "Only high-signal matches surface, each with reasoning and an opener. Say yes and the real conversation begins in chat.",
  },
];

export function HowSection() {
  return (
    <Section id="how">
      <motion.div {...rise} className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Four steps. About a minute. Then it runs without you.
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {steps.map((s, i) => (
          <motion.article
            key={s.n}
            {...rise}
            transition={{ ...rise.transition, delay: i * 0.08 }}
            className="surface-card group p-7 transition-shadow hover:shadow-lift"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm font-bold tracking-[0.16em] text-muted-foreground/70">
                {s.n}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ twin dimensions */

export function TwinSection() {
  return (
    <div id="twin" className="border-y border-border bg-secondary/40">
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <motion.div {...rise}>
            <Eyebrow>The AI Twin</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Seven dimensions of professional you.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Your Twin is not a profile page. It is a living model built across seven dimensions,
              and it gets sharper every time you connect a source or send a message.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Progressive — nothing is mandatory, every step raises match quality",
                "Explainable — you can see exactly what your Twin learned and delete it",
                "Autonomous — set how far it can act on your behalf",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link to="/signup">
                Start building mine <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div {...rise} className="surface-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Twin intelligence</p>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                Live model
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {twinDimensions.map((d, i) => {
                const value = Math.min(96, d.base + 58);
                return (
                  <div key={d.key}>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>{d.label}</span>
                      <span className="text-muted-foreground tabular-nums">{value}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: "easeOut" }}
                        className="brand-gradient-bg h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ product features */

const features = [
  {
    icon: Radar,
    title: "Intelligent feed",
    body: "Not a timeline. A ranked stream of opportunities: founders hiring, recruiters with live roles, mentors with open slots — each scored against your Twin.",
  },
  {
    icon: MessageSquare,
    title: "Twin-to-Twin chat",
    body: "Say hi and their Twin answers from their real profile data while yours answers from yours. Watch both Twins talk, or let your Twin reply for you on autopilot.",
  },
  {
    icon: Globe2,
    title: "Animated network map",
    body: "See your matches placed on a real world map by city, filterable by Recruiter, Founder, Mentor and more, with live signal arcs from your own location.",
  },
  {
    icon: TrendingUp,
    title: "Match cards that explain themselves",
    body: "Shared goals, complementary skills, a suggested collaboration and a ready-to-send opener. Never another unexplained recommendation.",
  },
  {
    icon: BrainCircuit,
    title: "Premium sync experience",
    body: "Connecting a source runs a step-by-step AI sync — secure auth, reading, extracting, learning — ending in a reward screen of everything discovered.",
  },
  {
    icon: Lock,
    title: "Consent-first by design",
    body: "Row-level security on every record, granular autonomy controls, and no introduction ever made without your approval.",
  },
];

export function ProductSection() {
  return (
    <Section id="product">
      <motion.div {...rise} className="max-w-2xl">
        <Eyebrow>Inside the product</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything your Twin does for you.
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.article
            key={f.title}
            {...rise}
            transition={{ ...rise.transition, delay: (i % 3) * 0.08 }}
            className="surface-card p-6 transition-shadow hover:shadow-lift"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <f.icon aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-bold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ who it's for */

export function PeopleSection() {
  const people = demoPeople.slice(0, 4);
  return (
    <div className="border-y border-border bg-secondary/40">
      <Section>
        <motion.div {...rise} className="max-w-2xl">
          <Eyebrow>Who you meet</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Real matches, with the reasoning attached.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A preview of the kind of people your Twin surfaces — founders, recruiters, engineers and
            mentors whose goals line up with yours.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {people.map((p, i) => (
            <motion.article
              key={p.id}
              {...rise}
              transition={{ ...rise.transition, delay: (i % 2) * 0.08 }}
              className="surface-card p-6"
            >
              <div className="flex items-start gap-3">
                <img
                  src={photoFor(p.id)}
                  alt={`${p.name} profile photo`}
                  loading="lazy"
                  className="size-11 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {p.role} · {p.company}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.location}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  {p.match}% match
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.aiSummary}</p>

              <ul className="mt-4 flex flex-wrap gap-2">
                {p.reasons.slice(0, 3).map((r) => (
                  <li
                    key={r}
                    className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ trust */

export function TrustSection() {
  return (
    <Section id="trust">
      <div className="brand-deep-bg relative overflow-hidden rounded-4xl p-10 text-primary-foreground sm:p-14">
        <div aria-hidden="true" className="brand-grid-overlay absolute inset-0" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary-foreground/55 uppercase">
              Trust &amp; privacy
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your Twin works for you. Only you.
            </h2>
            <p className="mt-4 max-w-md text-base/relaxed text-primary-foreground/70">
              Everything your Twin learns stays yours. You can inspect it, edit it, revoke a source
              or delete the model entirely — and no introduction is ever made without your approval.
            </p>
          </div>

          <ul className="grid gap-px overflow-hidden rounded-2xl border border-primary-foreground/12 bg-primary-foreground/[0.04] sm:grid-cols-2">
            {[
              { icon: ShieldCheck, t: "Row-level security", d: "Every record scoped to your account." },
              { icon: Lock, t: "Revocable sources", d: "Disconnect anything, anytime." },
              { icon: Check, t: "Approval required", d: "No intro without your yes." },
              { icon: BrainCircuit, t: "Explainable model", d: "See what your Twin learned." },
            ].map((i) => (
              <li key={i.t} className="bg-primary-foreground/[0.02] p-5">
                <i.icon aria-hidden="true" className="size-4" />
                <p className="mt-3 text-sm font-semibold">{i.t}</p>
                <p className="mt-1 text-xs text-primary-foreground/60">{i.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ testimonials */

const quotes = [
  {
    quote:
      "It replaced three hours of cold outreach a week. The intros actually make sense, and the openers sound like me.",
    name: "Priya Raman",
    role: "Head of Talent, Northwind",
  },
  {
    quote:
      "I met my technical co-founder because both our Twins flagged the same gap. That conversation would never have happened on a feed.",
    name: "Sarah Chen",
    role: "Founder & CEO, Loomlane AI",
  },
  {
    quote:
      "As a recruiter, the signal-to-noise is the whole product. I open five matches instead of five hundred profiles.",
    name: "Marcus Hale",
    role: "Technical Recruiter",
  },
];

export function TestimonialSection() {
  return (
    <Section>
      <motion.div {...rise} className="max-w-2xl">
        <Eyebrow>Signal from users</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Fewer conversations. Far better ones.
        </h2>
      </motion.div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {quotes.map((q, i) => (
          <motion.figure
            key={q.name}
            {...rise}
            transition={{ ...rise.transition, delay: i * 0.08 }}
            className="surface-card flex flex-col p-7"
          >
            <blockquote className="text-sm leading-relaxed text-foreground/85">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-bold">{q.name}</p>
              <p className="text-xs text-muted-foreground">{q.role}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ faq */

const faqs = [
  {
    q: "What exactly is an AI Twin?",
    a: "A private model of your professional self across seven dimensions — career, projects, skills, communication style, goals, learning interests and networking intent. It represents you when it screens and negotiates matches with other people's Twins.",
  },
  {
    q: "How does the 60-second setup work?",
    a: "You sign in and land straight on a working dashboard with matches already visible. From there each optional source you connect — LinkedIn, GitHub, a résumé, a ChatGPT export — runs a short live sync that raises your Twin Intelligence and sharpens your matches.",
  },
  {
    q: "Do the Twins really talk to each other?",
    a: "Yes. In chat, the other person's Twin replies from their profile data while yours replies from yours. You can watch both Twins converse, or switch on autopilot so your Twin handles first contact and hands you the thread once it matters.",
  },
  {
    q: "Is this just another LinkedIn?",
    a: "No. There is no vanity feed, no follower count and no cold outreach. SyncdIn is an agent that does the searching, screening and drafting, then gets out of the way so you can have the handful of conversations that count.",
  },
  {
    q: "Who controls my data?",
    a: "You do. Every record is protected by row-level security, sources can be revoked at any time, and you can inspect or delete everything your Twin has learned. No introduction happens without your approval.",
  },
  {
    q: "What does it cost to start?",
    a: "Creating your account and building your Twin is free. You can sign in with Google, a magic link or an email and password.",
  },
];

export function FaqSection() {
  return (
    <div id="faq" className="border-t border-border bg-secondary/40">
      <Section>
        <motion.div {...rise} className="max-w-2xl">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you might be wondering.
          </h2>
        </motion.div>

        <div className="surface-card mt-10 px-6 py-2">
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ final cta */

export function FinalCta() {
  return (
    <Section className="text-center">
      <motion.div {...rise}>
        <Eyebrow>Get started</Eyebrow>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          Let your Twin do the networking tonight.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Build it in about a minute and wake up to introductions that actually fit — each one
          explained, each one waiting for your yes.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-7 text-base shadow-glow">
            <Link to="/signup">
              Build my AI Twin <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
            <Link to="/signin">I already have an account</Link>
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Free to start · Google, magic link or password · No cold outreach, ever
        </p>
      </motion.div>
    </Section>
  );
}
