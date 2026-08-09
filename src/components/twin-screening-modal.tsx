import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Handshake, Lightbulb, Loader2, MessageSquareQuote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { photoFor, personById } from "@/lib/demo-data";
import { collaborationBand, type Attendee } from "@/lib/event-network";
import { generateTwinReply } from "@/lib/twin-chat.functions";
import { useTwin } from "@/lib/twin-store";
import { cn } from "@/lib/utils";

const STAGES = [
  "Reading their Twin profile",
  "Comparing goals and projects",
  "Testing collaboration angles",
  "Drafting an introduction in your voice",
];

export type ScreeningTarget = {
  person: Attendee;
  score: number;
  reasons: string[];
  topTopic: string | null;
};

/**
 * "Let our Twins talk" — an animated screening pass that uses the existing
 * Twin chat service. If AI is unavailable it falls back to a deterministic
 * outcome built from the attendee's own profile, so the flow never breaks.
 */
export function TwinScreeningModal({
  target,
  onClose,
  onConnect,
  connected,
  networkName,
}: {
  target: ScreeningTarget | null;
  onClose: () => void;
  onConnect: (person: Attendee, intro: string) => void;
  connected: boolean;
  networkName: string;
}) {
  const { state, intelligence } = useTwin();
  const runTwin = useServerFn(generateTwinReply);
  const [stage, setStage] = useState(0);
  const [intro, setIntro] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const person = target?.person ?? null;

  const screen = useCallback(async () => {
    if (!person) return;
    try {
      const { text } = await runTwin({
        data: {
          speaker: "user" as const,
          peerId: person.id,
          peerProfile: {
            name: person.name,
            role: person.role,
            company: person.company,
            kind: person.kind,
            location: person.location,
            bio: person.bio,
            skills: person.skills,
            interests: person.interests,
            goals: person.goals,
            projects: person.projects,
            reasons: target?.reasons ?? person.reasons,
            suggestedCollaboration: person.suggestedCollaboration,
          },
          userContext: {
            name: "the user",
            headline: "",
            location: "",
            intelligence,
            sources: [...state.connectedSources, ...state.trainedSources],
          },
          transcript: [
            {
              sender: "peer" as const,
              body: `We both joined ${networkName}. What is worth talking about between us?`,
            },
          ],
        },
      });
      setIntro(text);
    } catch {
      setFallback(true);
      setIntro(person.conversationStarter);
    }
  }, [person, runTwin, intelligence, state, networkName, target]);

  useEffect(() => {
    if (!person) {
      setStage(0);
      setIntro(null);
      setFallback(false);
      return;
    }
    setStage(0);
    setIntro(null);
    setFallback(false);
    void screen();
    const timer = window.setInterval(() => {
      setStage((s) => (s < STAGES.length ? s + 1 : s));
    }, 650);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.id]);

  const ready = Boolean(intro) && stage >= STAGES.length;
  const band = target ? collaborationBand(target.score) : null;
  const inDirectory = person ? Boolean(personById(person.id)) : false;

  return (
    <AnimatePresence>
      {person && target ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Twin screening for ${person.name}`}
        >
          <button aria-label="Close" className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 shadow-lift sm:rounded-3xl"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Close</span>
            </Button>

            <header className="flex items-center gap-3">
              <img
                src={photoFor(person.id)}
                alt={person.name}
                className="size-12 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-bold">{person.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {person.role} · {person.company}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto bg-primary-soft font-mono text-primary">
                {target.score}%
              </Badge>
            </header>

            {!ready ? (
              <div className="mt-6">
                <p className="text-sm font-semibold">Your Twin is screening this connection</p>
                <ul className="mt-4 space-y-2.5">
                  {STAGES.map((label, i) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm">
                      {i < stage ? (
                        <Check aria-hidden="true" className="size-4 text-success" />
                      ) : i === stage ? (
                        <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
                      ) : (
                        <span aria-hidden="true" className="size-4 rounded-full border border-border" />
                      )}
                      <span className={cn(i > stage && "text-muted-foreground")}>{label}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="brand-gradient-bg h-full"
                    animate={{ width: `${Math.min(100, (stage / STAGES.length) * 100)}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Collaboration potential
                  </p>
                  <p className={cn("mt-1 text-xl font-extrabold", band?.tone)}>
                    {band?.label} · {target.score}%
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {target.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-muted/70 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Lightbulb aria-hidden="true" className="size-3.5" /> Suggested first topic
                  </p>
                  <p className="mt-1 text-sm">
                    {target.topTopic ?? person.interests[0] ?? person.role}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Handshake aria-hidden="true" className="size-3.5" /> What you could do together
                  </p>
                  <p className="mt-1 text-sm">{person.suggestedCollaboration}</p>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary-soft/60 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                    <MessageSquareQuote aria-hidden="true" className="size-3.5" /> Suggested
                    introduction
                  </p>
                  <p className="mt-1 text-sm italic">“{intro}”</p>
                  {fallback ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Live AI was unavailable, so your Twin used its saved draft for this match.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    variant={connected ? "secondary" : "default"}
                    onClick={() => onConnect(person, intro ?? person.conversationStarter)}
                    aria-pressed={connected}
                  >
                    {connected ? (
                      <>
                        <Check aria-hidden="true" className="size-4" /> Connected
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                  {inDirectory ? (
                    <Button asChild variant="outline" className="flex-1">
                      <Link to="/messages/$peer" params={{ peer: person.id }}>
                        Open full chat
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
