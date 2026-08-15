import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeDigest, storeTwinImport } from "@/lib/twin-import.server";
import type { TwinAnalysis } from "@/lib/twin-analyze.server";

export type { TwinAnalysis };

/** Validates, normalizes and stores a digest read from an official data export. */
export const importArchiveDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        source: z.enum(["x", "instagram", "linkedin_export"]),
        fileName: z.string().max(200).optional(),
        digest: z.string().min(120).max(40000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const analysis = await normalizeDigest(data.source, data.digest);
    await storeTwinImport({
      supabase: context.supabase,
      userId: context.userId,
      source: data.source,
      fileName: data.fileName ?? null,
      analysis,
    });
    return analysis;
  });

/** Real configuration state for the extra Google authorization. */
export const googleTwinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readGoogleTwinCredentials } = await import("@/lib/google-twin.server");
    const configured = Boolean(readGoogleTwinCredentials());
    const { data } = await context.supabase
      .from("twin_imports")
      .select("summary, signals, updated_at")
      .eq("user_id", context.userId)
      .eq("source_id", "google")
      .maybeSingle();
    return { configured, connected: Boolean(data), summary: data?.summary ?? null };
  });

/** Starts the explicit Google consent flow and returns the authorization URL. */
export const startGoogleTwinConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { buildGoogleAuthorizeUrl, googleTwinRedirectUri, readGoogleTwinCredentials } =
      await import("@/lib/google-twin.server");
    const credentials = readGoogleTwinCredentials();
    if (!credentials) {
      throw new Error(
        "Google data access is not configured yet: the Google OAuth client for Contacts and Calendar is missing.",
      );
    }
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("twin_oauth_states")
      .insert({ nonce, user_id: context.userId, provider: "google" });
    if (error) throw new Error(`Could not start Google authorization: ${error.message}`);

    return {
      url: buildGoogleAuthorizeUrl({
        clientId: credentials.clientId,
        redirectUri: googleTwinRedirectUri(data.origin),
        state: nonce,
      }),
    };
  });
