import { createFileRoute } from "@tanstack/react-router";

/**
 * Google consent callback for the extra (Contacts/Calendar) authorization.
 * Public by necessity — the caller is verified through the one-time state nonce
 * stored server-side when the member started the flow.
 */
export const Route = createFileRoute("/api/public/auth/google/twin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const back = (params: Record<string, string>) => {
          const target = new URL("/twin", request.url);
          for (const [key, value] of Object.entries(params)) {
            target.searchParams.set(key, value);
          }
          return new Response(null, {
            status: 302,
            headers: { Location: target.toString(), "Cache-Control": "no-store" },
          });
        };

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (url.searchParams.get("error") || !code || !state) {
          return back({ google: "denied" });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: pending } = await supabaseAdmin
            .from("twin_oauth_states")
            .select("user_id")
            .eq("nonce", state)
            .eq("provider", "google")
            .maybeSingle();
          if (!pending) return back({ google: "expired" });
          await supabaseAdmin.from("twin_oauth_states").delete().eq("nonce", state);

          const {
            exchangeGoogleCode,
            googleSignalDigest,
            googleTwinRedirectUri,
            readGoogleTwinCredentials,
          } = await import("@/lib/google-twin.server");
          const credentials = readGoogleTwinCredentials();
          if (!credentials) return back({ google: "setup" });

          const { accessToken } = await exchangeGoogleCode({
            code,
            redirectUri: googleTwinRedirectUri(request.url),
            credentials,
          });
          const digest = await googleSignalDigest(accessToken);

          const { normalizeDigest, storeTwinImport } = await import("@/lib/twin-import.server");
          const analysis = await normalizeDigest("google", digest);
          await storeTwinImport({
            supabase: supabaseAdmin,
            userId: pending.user_id,
            source: "google",
            fileName: null,
            analysis,
          });

          return back({ google: "learned" });
        } catch (error) {
          console.error("Google Twin sync failed", error);
          return back({ google: "failed" });
        }
      },
    },
  },
});
