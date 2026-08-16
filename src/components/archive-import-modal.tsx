import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Download, ExternalLink, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { readArchive, type ArchiveSource } from "@/lib/twin-archive";
import { BRAND_COLOR, BRAND_ICON, type Brand } from "@/lib/brand-icons";
import { importArchiveDigest } from "@/lib/twin-import.functions";
import { cn } from "@/lib/utils";

export type ArchiveStatus = "not_connected" | "waiting" | "processing" | "learned";

type Guide = {
  label: string;
  brand: Brand;
  requestUrl: string;
  requestLabel: string;
  waitNote: string;
  steps: { title: string; body: string }[];
  accept: string;
  privacy: string;
};

const GUIDES: Record<ArchiveSource, Guide> = {
  x: {
    label: "X",
    brand: "x",
    requestUrl: "https://x.com/settings/download_your_data",
    requestLabel: "Open X data settings",
    waitNote: "X usually emails your archive within 24 hours.",
    steps: [
      {
        title: "Request your archive on X",
        body: "Open Settings → Your account → Download an archive of your data, confirm your password, then press “Request archive”.",
      },
      {
        title: "Download the ZIP when X emails you",
        body: "X notifies you when the archive is ready. Download the ZIP — you don't need to unpack it.",
      },
      {
        title: "Upload it here",
        body: "We read only account.js, profile, tweets, following and interests, in your browser. The archive itself is never uploaded or stored.",
      },
    ],
    accept: ".zip,.json,.js",
    privacy: "Only your own export. No X login, no scraping, no access to your DMs.",
  },
  instagram: {
    label: "Instagram",
    brand: "instagram",
    requestUrl: "https://accountscenter.instagram.com/info_and_permissions/dyi/",
    requestLabel: "Open Instagram data export",
    waitNote: "Instagram usually prepares the download within a few hours.",
    steps: [
      {
        title: "Request your information from Instagram",
        body: "In Accounts Center → Your information and permissions → Download your information, choose “Some of your information”, select Profile, Posts and Your topics, and pick JSON format.",
      },
      {
        title: "Download the ZIP when it's ready",
        body: "Instagram emails you a download link. Save the ZIP file.",
      },
      {
        title: "Upload it here",
        body: "We read profile details, topics/interests and post captions in your browser only.",
      },
    ],
    accept: ".zip,.json,.html",
    privacy: "Only your own export. No Instagram login and no follower scraping.",
  },
  linkedin: {
    label: "LinkedIn",
    brand: "linkedin",
    requestUrl: "https://www.linkedin.com/mypreferences/d/download-my-data",
    requestLabel: "Open LinkedIn data export",
    waitNote: "LinkedIn usually emails the larger archive within a few hours.",
    steps: [
      {
        title: "Request your LinkedIn archive",
        body: "Settings → Data privacy → Get a copy of your data. Select “Download larger data archive” (the top option) — the second option does not include your connections — then press “Request archive”.",
      },
      {
        title: "Download the archive from the email link",
        body: "When LinkedIn says your request is ready, open Download my data and press “Download archive”. Keep the ZIP as-is.",
      },
      {
        title: "Upload the ZIP here",
        body: "We read Profile, Positions, Education, Skills, Projects and Certifications CSVs in your browser. SyncdIn cannot and does not read private LinkedIn data directly.",
      },
    ],
    accept: ".zip,.csv",
    privacy: "Your own export only — SyncdIn never scrapes LinkedIn or asks for your password.",
  },
};

const SOURCE_ID: Record<ArchiveSource, "x" | "instagram" | "linkedin_export"> = {
  x: "x",
  instagram: "instagram",
  linkedin: "linkedin_export",
};

export function ArchiveImportModal({
  source,
  status,
  onStatusChange,
  onLearned,
  onClose,
}: {
  source: ArchiveSource | null;
  status: ArchiveStatus;
  onStatusChange: (status: ArchiveStatus) => void;
  /** Called only after signals were really stored for the signed-in member. */
  onLearned: (result: { summary: string; discovered: string[] }) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (source) {
      setError(null);
      setFiles([]);
      setBusy(false);
    }
  }, [source]);

  const guide = source ? GUIDES[source] : null;

  const handleFile = async (file: File) => {
    if (!source) return;
    setError(null);
    setBusy(true);
    onStatusChange("processing");
    try {
      const { digest, files: read } = await readArchive(source, file);
      setFiles(read);
      const analysis = await importArchiveDigest({
        data: { source: SOURCE_ID[source], fileName: file.name, digest },
      });
      onStatusChange("learned");
      onLearned({
        summary: analysis.summary,
        discovered: [
          `${Math.round(analysis.strengthPct)}% ${GUIDES[source].label} signal`,
          ...analysis.discovered,
        ],
      });
    } catch (err) {
      onStatusChange("waiting");
      setError(err instanceof Error ? err.message : "That import failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(source)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {guide ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Connect {guide.label}
                <Badge
                  variant="outline"
                  className={cn(
                    "font-normal",
                    status === "learned" && "border-success/40 text-success",
                    status === "processing" && "border-primary/40 text-primary",
                  )}
                >
                  {status === "not_connected"
                    ? "Not connected"
                    : status === "waiting"
                      ? "Waiting for export"
                      : status === "processing"
                        ? "Processing"
                        : "Learned"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {guide.label} does not offer a live API for this, so you stay in control: request
                your own export, then hand it to your Twin. {guide.privacy}
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3">
              {guide.steps.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-bold">
                    {i + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  {i === 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <a href={guide.requestUrl} target="_blank" rel="noreferrer noopener">
                          {guide.requestLabel}{" "}
                          <ExternalLink aria-hidden="true" className="size-4" />
                        </a>
                      </Button>
                      {status === "not_connected" ? (
                        <Button variant="ghost" onClick={() => onStatusChange("waiting")}>
                          <Download aria-hidden="true" className="size-4" /> I requested it
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {i === 1 && status === "waiting" ? (
                    <p className="mt-2 text-xs text-muted-foreground">{guide.waitNote}</p>
                  ) : null}
                </li>
              ))}
            </ol>

            <div
              className={cn(
                "rounded-2xl border-2 border-dashed border-border p-6 text-center transition-colors",
                busy && "border-primary/40 bg-primary-soft/40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
            >
              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Loader2 aria-hidden="true" className="mx-auto size-6 animate-spin text-primary" />
                    <p className="mt-3 text-sm font-semibold">
                      Reading your export and teaching your Twin…
                    </p>
                    {files.length ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Read {files.length} file{files.length === 1 ? "" : "s"}: {files.slice(0, 4).join(", ")}
                        {files.length > 4 ? "…" : ""}
                      </p>
                    ) : null}
                  </motion.div>
                ) : status === "learned" ? (
                  <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Check aria-hidden="true" className="mx-auto size-6 text-success" />
                    <p className="mt-3 text-sm font-semibold">
                      Your {guide.label} signals are stored on your Twin.
                    </p>
                    <Button className="mt-4" onClick={onClose}>
                      Done
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Upload aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">
                      Drop your {guide.label} export here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {guide.accept.replaceAll(".", "").toUpperCase().replaceAll(",", " · ")}
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => input.current?.click()}>
                      Choose file
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={input}
                type="file"
                accept={guide.accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleFile(file);
                }}
              />
            </div>

            {error ? (
              <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
