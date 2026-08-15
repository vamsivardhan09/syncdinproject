/**
 * Client-side reader for official platform data exports (X, Instagram, LinkedIn).
 *
 * Nothing is scraped: the user requests their own archive from the platform,
 * downloads it, and uploads it here. We unpack it in the browser, keep only the
 * files that carry useful professional signal, and send a plain-text digest to
 * the server for normalization. Raw archives are never uploaded or stored.
 */
import { strFromU8, unzipSync } from "fflate";

export type ArchiveSource = "x" | "instagram" | "linkedin";

/** Files worth reading per platform export, matched case-insensitively. */
const PATTERNS: Record<ArchiveSource, RegExp[]> = {
  x: [
    /account\.(js|json)$/i,
    /profile\.(js|json)$/i,
    /tweets?\.(js|json)$/i,
    /note-?tweet\.(js|json)$/i,
    /following\.(js|json)$/i,
    /follower\.(js|json)$/i,
    /like\.(js|json)$/i,
    /personalization\.(js|json)$/i,
  ],
  instagram: [
    /personal_information.*\.(json|html)$/i,
    /profile_.*\.(json|html)$/i,
    /your_topics.*\.(json|html)$/i,
    /ads_interests?.*\.(json|html)$/i,
    /posts?_1\.(json|html)$/i,
    /profile_based_in.*\.(json|html)$/i,
    /account_information.*\.(json|html)$/i,
    /following.*\.(json|html)$/i,
  ],
  linkedin: [
    /profile\.csv$/i,
    /positions\.csv$/i,
    /education\.csv$/i,
    /skills\.csv$/i,
    /projects\.csv$/i,
    /certifications\.csv$/i,
    /languages\.csv$/i,
    /connections\.csv$/i,
    /recommendations_received\.csv$/i,
    /endorsement_received_info\.csv$/i,
  ],
};

const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 38000;
const MAX_BYTES = 60 * 1024 * 1024;

export const SOURCE_LABEL: Record<ArchiveSource, string> = {
  x: "X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

function tidy(text: string): string {
  return text
    // X wraps each JSON payload in `window.YTD.x.part0 = [...]`
    .replace(/^\s*window\.[\w.]+\s*=\s*/, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export type ArchiveDigest = {
  /** Plain-text digest of the useful files, ready for normalization. */
  digest: string;
  /** Names of the files we actually read, shown to the user for transparency. */
  files: string[];
};

/**
 * Unpacks the uploaded export and returns a digest of the readable files.
 * Throws a user-readable error when the file is unusable.
 */
export async function readArchive(source: ArchiveSource, file: File): Promise<ArchiveDigest> {
  if (file.size > MAX_BYTES) {
    throw new Error("That archive is larger than 60MB. Upload the export ZIP without media files.");
  }

  const lower = file.name.toLowerCase();
  const patterns = PATTERNS[source];
  const parts: string[] = [];
  const files: string[] = [];
  let total = 0;

  const push = (name: string, text: string) => {
    if (total >= MAX_TOTAL_CHARS) return;
    const cleaned = tidy(text).slice(0, MAX_FILE_CHARS);
    if (cleaned.length < 20) return;
    parts.push(`--- ${name} ---\n${cleaned}`);
    files.push(name);
    total += cleaned.length;
  };

  if (lower.endsWith(".zip")) {
    let entries: Record<string, Uint8Array>;
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      entries = unzipSync(buffer, {
        filter: (f) =>
          f.size > 0 && f.size < 4 * 1024 * 1024 && patterns.some((p) => p.test(f.name)),
      });
    } catch {
      throw new Error("That ZIP could not be opened. Re-download the export and try again.");
    }
    const names = Object.keys(entries).sort();
    if (names.length === 0) {
      throw new Error(
        `No readable ${SOURCE_LABEL[source]} data files were found inside that ZIP. Make sure it is the export archive you downloaded from ${SOURCE_LABEL[source]}.`,
      );
    }
    for (const name of names) {
      const bytes = entries[name];
      if (!bytes) continue;
      push(name.split("/").pop() ?? name, strFromU8(bytes));
      if (total >= MAX_TOTAL_CHARS) break;
    }
  } else if (/\.(json|js|csv|txt|html)$/i.test(lower)) {
    push(file.name, await file.text());
  } else {
    throw new Error("Upload the ZIP archive from the export, or a single JSON/CSV file from it.");
  }

  if (parts.length === 0) {
    throw new Error("We couldn't read any usable data out of that file.");
  }
  return { digest: parts.join("\n\n"), files };
}
