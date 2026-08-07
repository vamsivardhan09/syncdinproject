import { createFileRoute } from "@tanstack/react-router";
import {
  LINKEDIN_STATE_COOKIE,
  createLinkedInSignInUrl,
  exchangeCodeForProfile,
  linkedInRedirectUri,
  readLinkedInCredentials,
} from "@/lib/linkedin-oauth.server";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function failure(request: Request, message: string) {
  const target = new URL("/signin", request.url);
  target.searchParams.set("linkedin_error", message);
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Set-Cookie": `${LINKEDIN_STATE_COOKIE}=; Path=/; Max-Age=0`,
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/auth/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const expected = readCookie(request.headers.get("cookie"), LINKEDIN_STATE_COOKIE);

        if (url.searchParams.get("error")) {
          return failure(request, "LinkedIn sign-in was cancelled.");
        }
        if (!code || !state || !expected || state !== expected) {
          return failure(request, "LinkedIn sign-in could not be verified. Please try again.");
        }

        try {
          const credentials = readLinkedInCredentials();
          const profile = await exchangeCodeForProfile({
            code,
            redirectUri: linkedInRedirectUri(request.url),
            credentials,
          });
          const completeUrl = new URL("/auth/linkedin/complete", request.url).toString();
          const signInUrl = await createLinkedInSignInUrl(profile, completeUrl);

          return new Response(null, {
            status: 302,
            headers: {
              Location: signInUrl,
              "Set-Cookie": `${LINKEDIN_STATE_COOKIE}=; Path=/; Max-Age=0`,
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("LinkedIn sign-in failed", error);
          return failure(request, "We couldn't finish LinkedIn sign-in. Please try again.");
        }
      },
    },
  },
});
