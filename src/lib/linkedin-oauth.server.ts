/**
 * Server-only helpers for the LinkedIn "Sign In with LinkedIn using OpenID Connect" flow.
 * Never import this from client code — it reads LinkedIn client credentials.
 */

export const LINKEDIN_STATE_COOKIE = "syncdin_li_state";
export const LINKEDIN_SCOPES = "openid profile email";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export interface LinkedInCredentials {
  clientId: string;
  clientSecret: string;
}

export function readLinkedInCredentials(): LinkedInCredentials {
  const clientId = process.env["LINKEDIN_CLIENT_ID"];
  const clientSecret = process.env["LINKEDIN_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn sign-in is not configured yet.");
  }
  return { clientId, clientSecret };
}

/** Callback URL registered in the LinkedIn app, derived from the incoming request origin. */
export function linkedInRedirectUri(requestUrl: string): string {
  return new URL("/api/public/auth/linkedin/callback", requestUrl).toString();
}

export function buildAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  url.searchParams.set("scope", LINKEDIN_SCOPES);
  return url.toString();
}

export interface LinkedInProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export async function exchangeCodeForProfile(options: {
  code: string;
  redirectUri: string;
  credentials: LinkedInCredentials;
}): Promise<LinkedInProfile> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri,
      client_id: options.credentials.clientId,
      client_secret: options.credentials.clientSecret,
    }),
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`LinkedIn token exchange failed (${tokenRes.status}): ${tokenText}`);
  }
  const token = JSON.parse(tokenText) as { access_token?: string };
  if (!token.access_token) throw new Error("LinkedIn token response had no access_token");

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const infoText = await infoRes.text();
  if (!infoRes.ok) {
    throw new Error(`LinkedIn userinfo failed (${infoRes.status}): ${infoText}`);
  }
  const info = JSON.parse(infoText) as {
    sub?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
  if (!info.sub) throw new Error("LinkedIn userinfo response had no subject");
  if (!info.email) {
    throw new Error("LinkedIn did not return an email address for this member");
  }
  const name =
    info.name ?? [info.given_name, info.family_name].filter(Boolean).join(" ") ?? null;
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    name: name && name.length > 0 ? name : null,
    picture: info.picture ?? null,
  };
}

/**
 * Finds or creates the Supabase user for a verified LinkedIn member, syncs the
 * LinkedIn name/photo, and returns a one-time verify URL that signs them in.
 */
export async function createLinkedInSignInUrl(
  profile: LinkedInProfile,
  completeUrl: string,
): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await supabaseAdmin.auth.admin.createUser({
    email: profile.email,
    email_confirm: true,
    user_metadata: {
      full_name: profile.name,
      avatar_url: profile.picture,
      picture: profile.picture,
      provider: "linkedin",
      linkedin_sub: profile.sub,
    },
  });

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo: completeUrl },
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`Could not start the LinkedIn session: ${error?.message ?? "no token"}`);
  }

  const userId = data.user?.id;
  if (userId) {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: profile.name,
        avatar_url: profile.picture,
        picture: profile.picture,
        provider: "linkedin",
        linkedin_sub: profile.sub,
      },
    });
    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: profile.name,
        avatar_url: profile.picture,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  const verify = new URL(`${process.env["SUPABASE_URL"]}/auth/v1/verify`);
  verify.searchParams.set("token", data.properties.hashed_token);
  verify.searchParams.set("type", "magiclink");
  verify.searchParams.set("redirect_to", completeUrl);
  return verify.toString();
}
