/**
 * Server-only normalization + storage for real imported Twin signals.
 * Every write is scoped to the authenticated user who supplied the data.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callGateway, type TwinAnalysis } from "@/lib/twin-analyze.server";

export const IMPORT_SOURCES = ["x", "instagram", "linkedin_export", "google"] as const;
export type ImportSourceId = (typeof IMPORT_SOURCES)[number];

/** Intelligence gain per source, mirrored by `dataSources` in demo-data. */
export const IMPORT_GAIN: Record<ImportSourceId, number> = {
  x: 8,
  instagram: 6,
  linkedin_export: 16,
  google: 12,
};

const SOURCE_BRIEF: Record<ImportSourceId, string> = {
  x: "This is an official X (Twitter) data export the person downloaded themselves: account/profile details, their posts, interests and who they follow. Read it for professional signal — what they work on, the topics they post about, the communities they follow.",
  instagram:
    "This is an official Instagram information export the person downloaded themselves: profile details, topics/interests and post captions or metadata. Read it for professional and interest signal only.",
  linkedin_export:
    "This is an official LinkedIn data export (CSV files) the person downloaded themselves: profile, positions, education, skills, projects and connection summaries. Read it for career signal.",
  google:
    "This is read-only data from the person's own Google account (contacts and upcoming calendar events they authorized). Use company names, roles, meeting titles and recurring themes as professional signal. Never list individual contact names or email addresses.",
};

function unique(values: (string | null | undefined)[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = (raw ?? "").trim();
    if (!value || value.length > 60) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

/** Normalizes a raw digest into Twin signals. Throws when the AI is unavailable. */
export async function normalizeDigest(
  source: ImportSourceId,
  digest: string,
): Promise<TwinAnalysis> {
  return callGateway([
    {
      type: "text",
      text: `${SOURCE_BRIEF[source]}\n\nOnly use facts that appear below. If a field is not supported by the data, return an empty array for it.\n\n${digest.slice(0, 38000)}`,
    },
  ]);
}

/**
 * Stores the normalized signals on the authenticated member's Twin and merges
 * new skills/goals/interests into their profile so matching improves for real.
 */
export async function storeTwinImport(options: {
  supabase: SupabaseClient;
  userId: string;
  source: ImportSourceId;
  fileName?: string | null;
  analysis: TwinAnalysis;
}): Promise<void> {
  const { supabase, userId, source, analysis } = options;

  const { error } = await supabase.from("twin_imports").upsert(
    {
      user_id: userId,
      source_id: source,
      status: "learned",
      file_name: options.fileName ?? null,
      summary: analysis.summary,
      signals: {
        headline: analysis.headline,
        discovered: analysis.discovered,
        skills: analysis.skills,
        goals: analysis.goals,
        interests: analysis.interests,
        strengthPct: analysis.strengthPct,
      },
    },
    { onConflict: "user_id,source_id" },
  );
  if (error) throw new Error(`Could not save the import: ${error.message}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("headline, skills, goals, interests")
    .eq("id", userId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      headline: profile?.headline?.trim() ? profile.headline : analysis.headline || null,
      skills: unique([...(profile?.skills ?? []), ...analysis.skills], 24),
      goals: unique([...(profile?.goals ?? []), ...analysis.goals], 12),
      interests: unique([...(profile?.interests ?? []), ...analysis.interests], 16),
    })
    .eq("id", userId);

  await supabase
    .from("twin_sources")
    .upsert(
      { user_id: userId, source_id: source, kind: "import", gain: IMPORT_GAIN[source] },
      { onConflict: "user_id,source_id" },
    );
}
