import { useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, Handshake, MessageSquareQuote } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { photoFor, type DemoPerson } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const accentRing: Record<DemoPerson["accent"], string> = {
  violet: "bg-primary-soft text-primary",
  blue: "bg-info-soft text-info",
  green: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
};

export function RecommendationCard({
  person,
  connected,
  onConnect,
  index = 0,
}: {
  person: DemoPerson;
  connected: boolean;
  onConnect: () => void;
  index?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4) }}
      className="surface-card flex h-full flex-col p-5 transition-shadow hover:shadow-lift"
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold",
            accentRing[person.accent],
          )}
        >
          <span aria-hidden="true">{person.initials}</span>
          <img
            src={photoFor(person.id)}
            alt={`${person.name}, ${person.role} at ${person.company}`}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">
            <Link
              to="/people/$id"
              params={{ id: person.id }}
              className="focus-ring hover:text-primary"
            >
              {person.name}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {person.role} · {person.company}
          </p>
          <p className="truncate text-xs text-muted-foreground">{person.location}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-primary-soft font-mono text-primary">
          {person.match}%
        </Badge>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{person.aiSummary}</p>

      <ul className="mt-4 space-y-1.5">
        {person.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-2 text-sm">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-muted/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Handshake aria-hidden="true" className="size-3.5" /> Suggested collaboration
        </p>
        <p className="mt-1 text-sm">{person.suggestedCollaboration}</p>
      </div>

      {open ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Shared goals
              </p>
              <p className="mt-1">{person.sharedGoals.join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Complementary skills
              </p>
              <p className="mt-1">{person.complementarySkills.join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Skills
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {person.skills.map((s) => (
                  <Badge key={s} variant="outline" className="font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary-soft/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                <MessageSquareQuote aria-hidden="true" className="size-3.5" /> Conversation starter
              </p>
              <p className="mt-1 text-sm italic">“{person.conversationStarter}”</p>
            </div>
          </div>
        </motion.div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 pt-1">
        <Button asChild variant="outline" className="flex-1">
          <Link to="/people/$id" params={{ id: person.id }}>
            View profile
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to="/messages/$peer" params={{ peer: person.id }}>
            <MessageSquareQuote aria-hidden="true" className="size-4" /> Talk with Twin
          </Link>
        </Button>
        <Button
          onClick={onConnect}
          variant={connected ? "secondary" : "outline"}
          className="flex-1"
          aria-pressed={connected}
        >
          {connected ? <><Check aria-hidden="true" className="size-4" /> Connected</> : "Connect"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1"
        >
          {open ? "Hide analysis" : "AI analysis"}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>
    </motion.article>
  );
}
