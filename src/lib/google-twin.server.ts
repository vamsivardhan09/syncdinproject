/**
 * Server-only helpers for the separate, explicit Google authorization used to
 * teach a member's Twin. This is NOT the Google Sign-In used for auth: signing
 * in never grants Contacts or Calendar access, so we ask for it on its own with
 * the minimum read-only scopes.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Minimum read-only scopes needed for useful professional signal. */
export const GOOGLE_TWIN_SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export type GoogleTwinCredentials = { clientId: string; clientSecret: string };

export function readGoogleTwinCredentials(): GoogleTwinCredentials | null {
  const clientId = process.env["GOOGLE_TWIN_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_TWIN_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleTwinRedirectUri(requestUrl: string): string {
  return new URL("/api/public/auth/google/twin/callback", requestUrl).toString();
}

export function buildGoogleAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_TWIN_SCOPES);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", options.state);
  return url.toString();
}

export async function exchangeGoogleCode(options: {
  code: string;
  redirectUri: string;
  credentials: GoogleTwinCredentials;
}): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: options.code,
      client_id: options.credentials.clientId,
      client_secret: options.credentials.clientSecret,
      redirect_uri: options.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  const json = JSON.parse(text) as { access_token?: string; scope?: string };
  if (!json.access_token) throw new Error("Google returned no access token");
  return { accessToken: json.access_token, scope: json.scope ?? "" };
}

/**
 * Reads only what the member authorized and returns an aggregated, de-identified
 * digest: organizations, job titles and meeting themes — never contact names or
 * email addresses.
 */
export async function googleSignalDigest(accessToken: string): Promise<string> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const parts: string[] = [];

  try {
    const res = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?pageSize=500&personFields=organizations,occupations",
      { headers },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        connections?: {
          organizations?: { name?: string; title?: string; department?: string }[];
          occupations?: { value?: string }[];
        }[];
      };
      const companies = new Map<string, number>();
      const titles = new Map<string, number>();
      for (const person of json.connections ?? []) {
        for (const org of person.organizations ?? []) {
          if (org.name) companies.set(org.name, (companies.get(org.name) ?? 0) + 1);
          if (org.title) titles.set(org.title, (titles.get(org.title) ?? 0) + 1);
        }
        for (const occ of person.occupations ?? []) {
          if (occ.value) titles.set(occ.value, (titles.get(occ.value) ?? 0) + 1);
        }
      }
      const top = (map: Map<string, number>) =>
        [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([name, count]) => `${name} (${count})`)
          .join(", ");
      parts.push(
        `--- Contact network (aggregated, no names) ---\nTotal contacts: ${
          json.connections?.length ?? 0
        }\nOrganizations: ${top(companies) || "none"}\nRoles: ${top(titles) || "none"}`,
      );
    }
  } catch {
    /* contacts scope may not have been granted */
  }

  try {
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=150&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(past)}`,
      { headers },
    );
    if (res.ok) {
      const json = (await res.json()) as { items?: { summary?: string }[] };
      const titles = (json.items ?? [])
        .map((e) => e.summary?.trim())
        .filter((t): t is string => Boolean(t && t.length < 90))
        .slice(0, 120);
      if (titles.length) {
        parts.push(`--- Recent calendar topics ---\n${titles.join("\n")}`);
      }
    }
  } catch {
    /* calendar scope may not have been granted */
  }

  if (parts.length === 0) {
    throw new Error(
      "Google returned no readable Contacts or Calendar data for the permissions you approved.",
    );
  }
  return parts.join("\n\n");
}
