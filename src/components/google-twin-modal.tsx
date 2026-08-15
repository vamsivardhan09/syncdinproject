import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Check, Contact, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { googleTwinStatus, startGoogleTwinConnect } from "@/lib/twin-import.functions";

export type GoogleStage = "idle" | "connecting" | "syncing" | "learned" | "error";

const STAGE_LABEL: Record<GoogleStage, string> = {
  idle: "Not connected",
  connecting: "Connecting…",
  syncing: "Permission approved · syncing",
  learned: "Twin learned",
  error: "Needs attention",
};

export function GoogleTwinModal({
  open,
  stage,
  message,
  onStage: setStage,
  onMessage: setMessage,
  onClose,
}: {
  open: boolean;
  stage: GoogleStage;
  message: string | null;
  onStage: (stage: GoogleStage) => void;
  onMessage: (message: string | null) => void;
  onClose: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open || configured !== null) return;
    setChecking(true);
    void googleTwinStatus()
      .then((status) => setConfigured(status.configured))
      .catch(() => setConfigured(false))
      .finally(() => setChecking(false));
  }, [open, configured]);

  const start = async () => {
    setStage("connecting");
    setMessage(null);
    try {
      const { url } = await startGoogleTwinConnect({
        data: { origin: window.location.origin },
      });
      window.location.href = url;
    } catch (err) {
      setStage("error");
      setMessage(
        err instanceof Error ? err.message : "Google authorization could not be started.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Connect Google
            <Badge
              variant="outline"
              className={
                stage === "learned"
                  ? "border-success/40 font-normal text-success"
                  : stage === "error"
                    ? "border-destructive/40 font-normal text-destructive"
                    : "font-normal"
              }
            >
              {STAGE_LABEL[stage]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            This is a separate authorization from signing in with Google. Signing in never grants
            access to your Contacts or Calendar — you approve that here, read-only, and can revoke
            it any time in your Google account.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2 rounded-xl border border-border p-3">
            <Contact aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <span>
              <strong>Contacts (read-only)</strong> — we keep only aggregated organizations and role
              titles. Individual names and email addresses are never stored.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-border p-3">
            <Calendar aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <span>
              <strong>Calendar (read-only)</strong> — recent meeting titles become themes your Twin
              can reason about.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-border p-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 text-primary" />
            <span>
              Gmail and Drive are <strong>not</strong> requested. They need additional Google
              verification, so we don't ask for permissions we can't properly use.
            </span>
          </li>
        </ul>

        {checking ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Checking Google
            configuration…
          </p>
        ) : configured === false ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle aria-hidden="true" className="size-4" /> Setup required
            </p>
            <p className="mt-1 text-muted-foreground">
              The Google OAuth client for Contacts and Calendar isn't configured for this
              deployment yet, so this connection can't be made. Nothing is faked — add the Google
              data-access credentials and this card becomes live immediately.
            </p>
          </div>
        ) : stage === "learned" ? (
          <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
            <Check aria-hidden="true" className="size-4 text-success" />
            {message ?? "Your Google signals are stored on your Twin."}
          </p>
        ) : stage === "error" ? (
          <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {message ?? "Google authorization failed."}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={configured !== true || stage === "connecting" || stage === "learned"}
            onClick={() => void start()}
          >
            {stage === "connecting" ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Opening Google…
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
