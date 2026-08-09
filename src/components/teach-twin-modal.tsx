import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { twinTrainingPrompt } from "@/lib/twin-prompt";
import { cn } from "@/lib/utils";

const ASSISTANT_URLS: Record<string, string> = {
  ChatGPT: "https://chat.openai.com/",
  Claude: "https://claude.ai/new",
  Gemini: "https://gemini.google.com/app",
};

export function TeachTwinModal({
  assistant,
  onClose,
  onSubmit,
}: {
  assistant: string | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pasted, setPasted] = useState("");

  useEffect(() => {
    if (assistant) {
      setCopied(false);
      setShowPrompt(false);
      setPasted("");
    }
  }, [assistant]);

  const prompt = assistant ? twinTrainingPrompt(assistant) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      toast.error("Couldn't copy — select the prompt and copy it manually.");
      setShowPrompt(true);
      return;
    }
    setCopied(true);
    toast.success("Prompt copied. Paste it into " + assistant + ".");
  };

  return (
    <Dialog open={Boolean(assistant)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Teach your Twin with {assistant}</DialogTitle>
          <DialogDescription>
            SyncdIn never reads your private chat history. You copy one prompt, run it in{" "}
            {assistant}, and paste the answer back — you stay in control of exactly what your Twin
            learns.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4">
          <li className="rounded-xl border border-border p-4">
            <p className="text-sm font-bold">1. Copy the prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It asks {assistant} for a structured report on your skills, recent work, how you think,
              your voice and your goals.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={copy} variant={copied ? "secondary" : "default"}>
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="size-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="size-4" /> Copy prompt
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => setShowPrompt((v) => !v)}>
                <ChevronDown
                  aria-hidden="true"
                  className={cn("size-4 transition-transform", showPrompt && "rotate-180")}
                />
                {showPrompt ? "Hide prompt" : "View prompt"}
              </Button>
            </div>
            {showPrompt ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                {prompt}
              </pre>
            ) : null}
          </li>

          <li className="rounded-xl border border-border p-4">
            <p className="text-sm font-bold">2. Run it in {assistant}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open {assistant}, paste the prompt, then copy its full answer.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <a
                href={ASSISTANT_URLS[assistant ?? ""] ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open {assistant} <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </Button>
          </li>

          <li className="rounded-xl border border-border p-4">
            <p className="text-sm font-bold">3. Paste the answer back</p>
            <Textarea
              className="mt-3 min-h-40"
              placeholder={`Paste everything ${assistant} wrote about you here…`}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {pasted.trim().length} characters · at least 200 makes a meaningful difference.
            </p>
          </li>
        </ol>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pasted.trim().length < 200}
            onClick={() => {
              onSubmit(pasted.trim());
              onClose();
            }}
          >
            Teach my Twin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
