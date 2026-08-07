import { createFileRoute } from "@tanstack/react-router";
import {
  LINKEDIN_STATE_COOKIE,
  buildAuthorizeUrl,
  linkedInRedirectUri,
  readLinkedInCredentials,
} from "@/lib/linkedin-oauth.server";

export const Route = createFileRoute("/api/public/auth/linkedin/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let clientId: string;
        try {
          ({ clientId } = readLinkedInCredentials());
        } catch {
          return new Response(
            "LinkedIn sign-in is not configured yet. Add the LinkedIn client credentials first.",
            { status: 503 },
          );
        }

        const state = crypto.randomUUID().replace(/-/g, "");
        const redirectUri = linkedInRedirectUri(request.url);
        const secure = new URL(request.url).protocol === "https:";

        return new Response(null, {
          status: 302,
          headers: {
            Location: buildAuthorizeUrl({ clientId, redirectUri, state }),
            "Set-Cookie": [
              `${LINKEDIN_STATE_COOKIE}=${state}`,
              "Path=/",
              "HttpOnly",
              "SameSite=Lax",
              "Max-Age=600",
              secure ? "Secure" : "",
            ]
              .filter(Boolean)
              .join("; "),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
