import { useState } from "react";
import { Check, Copy, Handshake, Sparkle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity, TwinBrief } from "@/lib/twin-compatibility";

/**
 * "Why your Twins match" — evidence only. When the two Twins have no overlapping
 * signals yet this says so instead of fabricating reasons.
 */
export function TwinMatchPanel({
  name,
  brief,
  activity,
}: {
  name: string;
  brief: TwinBrief;
  activity: Activity;
}) {
  const [copied, setCopied] = useState(false);

  async function copyOpener() {
    try {
      await navigator.clipboard.writeText(brief.opener);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Handshake aria-hidden="true" className="size-4 text-primary" />
          Why your Twins match
        </h2>
        <div className="flex items-center gap-2">
          {brief.hasEvidence ? (
            <Badge className="tabular-nums">{brief.score}% fit</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{activity.label}</span>
        </div>
      </div>

      {brief.hasEvidence ? (
        <ul className="mt-4 space-y-2">
          {brief.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              {reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          Your Twins don&apos;t share enough signal yet for an honest comparison. Add another source
          in My Twin — or reach out directly if {name}&apos;s work speaks for itself.
        </p>
      )}

      {brief.sharedSignals.length > 0 || brief.complementary.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {brief.sharedSignals.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Shared signals
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {brief.sharedSignals.slice(0, 6).map((signal) => (
                  <li key={signal}>
                    <Badge variant="secondary">{signal}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {brief.complementary.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                What they add
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {brief.complementary.map((signal) => (
                  <li key={signal}>
                    <Badge variant="outline">{signal}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {brief.theirGoals.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What {name} is working towards
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {brief.theirGoals.slice(0, 4).map((goal) => (
              <li key={goal}>· {goal}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.collaboration ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary-soft/40 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <Sparkle aria-hidden="true" className="size-3.5" /> Suggested collaboration
          </h3>
          <p className="mt-1.5 text-sm">{brief.collaboration}</p>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Suggested opener
          </h3>
          <Button size="sm" variant="ghost" onClick={() => void copyOpener()}>
            {copied ? (
              <Check aria-hidden="true" className="size-4 text-success" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-1.5 text-sm">{brief.opener}</p>
      </div>
    </section>
  );
}
