/**
 * Server-only relationship email pipeline.
 *
 * Renders the SyncdIn notification email and hands it to a provider adapter.
 * Nothing here may be imported from the browser: it reads service-role
 * credentials and provider secrets.
 */

export type RelationshipEmailKind =
  | "connection_request"
  | "connection_accepted"
  | "new_message"
  | "strong_match"
  | "event_match";

export type EmailActor = {
  name: string;
  headline?: string | null;
  avatarUrl?: string | null;
};

export type RelationshipEmailInput = {
  kind: RelationshipEmailKind;
  actor: EmailActor;
  /** Path inside SyncdIn the CTA should open (e.g. `/people/<id>`). */
  path: string;
  /** Short teaser lines — curiosity, never the full payoff. */
  reasons?: string[];
  /** Event title for `event_match`. */
  eventTitle?: string | null;
  /** Optional note (connection request opener, message preview). */
  note?: string | null;
};

const BRAND = {
  ink: "#0f1222",
  muted: "#5b6076",
  primary: "#5b5bd6",
  primarySoft: "#eef0ff",
  border: "#e6e8f0",
  page: "#f6f7fb",
};

export function appBaseUrl(): string {
  return (process.env["APP_URL"] || "https://syncdin.lovable.app").replace(/\/+$/, "");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "SI"
  );
}

type Copy = { subject: string; heading: string; lead: string; cta: string };

function copyFor(input: RelationshipEmailInput): Copy {
  const name = input.actor.name;
  const event = input.eventTitle?.trim() || "the event";
  switch (input.kind) {
    case "connection_request":
      return {
        subject: `${name} wants to connect with you on SyncdIn`,
        heading: `${name} wants to connect`,
        lead: "Your Twins already have common ground. Open the request to see what they matched on.",
        cta: "See the request",
      };
    case "connection_accepted":
      return {
        subject: `${name} accepted your connection on SyncdIn`,
        heading: `${name} accepted your connection`,
        lead: "The introduction is open. Your Twin drafted a starting point for the conversation.",
        cta: "Open the conversation",
      };
    case "new_message":
      return {
        subject: `${name} sent you a message on SyncdIn`,
        heading: `${name} sent you a message`,
        lead: "There is a new message waiting in your SyncdIn inbox.",
        cta: "Read the message",
      };
    case "strong_match":
      return {
        subject: "Your Twin found someone you should meet",
        heading: `You and ${name} have strong overlap`,
        lead: `Your Twin found ${input.reasons?.length || "a few"} reasons this could be worth a conversation.`,
        cta: "See why you match",
      };
    case "event_match":
      return {
        subject: `Your Twin found people worth meeting at ${event}`,
        heading: `People worth meeting at ${event}`,
        lead: "Your Twin ranked the attendees whose goals and skills line up with yours.",
        cta: "See who to meet",
      };
  }
}

function avatarBlock(actor: EmailActor): string {
  if (actor.avatarUrl) {
    return `<img src="${esc(actor.avatarUrl)}" width="56" height="56" alt="${esc(actor.name)}" style="display:block;width:56px;height:56px;border-radius:28px;object-fit:cover;border:1px solid ${BRAND.border};" />`;
  }
  return `<div style="width:56px;height:56px;border-radius:28px;background:${BRAND.primarySoft};color:${BRAND.primary};font:700 18px/56px Helvetica,Arial,sans-serif;text-align:center;">${esc(initials(actor.name))}</div>`;
}

/** Renders the responsive SyncdIn notification email. */
export function renderRelationshipEmail(input: RelationshipEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const copy = copyFor(input);
  const url = `${appBaseUrl()}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  const reasons = (input.reasons ?? []).filter(Boolean).slice(0, 3);

  const reasonList = reasons.length
    ? `<ul style="margin:16px 0 0;padding-left:18px;color:${BRAND.ink};font:400 14px/22px Helvetica,Arial,sans-serif;">${reasons
        .map((r) => `<li style="margin:0 0 6px;">${esc(r)}</li>`)
        .join("")}</ul>`
    : "";

  const note = input.note?.trim()
    ? `<div style="margin:16px 0 0;padding:12px 14px;background:${BRAND.page};border:1px solid ${BRAND.border};border-radius:10px;color:${BRAND.muted};font:400 14px/22px Helvetica,Arial,sans-serif;">&ldquo;${esc(
        input.note.trim().slice(0, 240),
      )}&rdquo;</div>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(copy.lead)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 16px;font:800 18px/1 Helvetica,Arial,sans-serif;color:${BRAND.ink};letter-spacing:-0.3px;">
        Syncd<span style="color:${BRAND.primary};">In</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="56" valign="top">${avatarBlock(input.actor)}</td>
            <td valign="top" style="padding-left:14px;">
              <div style="font:700 17px/24px Helvetica,Arial,sans-serif;color:${BRAND.ink};">${esc(copy.heading)}</div>
              ${
                input.actor.headline
                  ? `<div style="margin-top:2px;font:400 14px/20px Helvetica,Arial,sans-serif;color:${BRAND.muted};">${esc(
                      input.actor.headline,
                    )}</div>`
                  : ""
              }
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font:400 15px/23px Helvetica,Arial,sans-serif;color:${BRAND.ink};">${esc(copy.lead)}</p>
        ${reasonList}
        ${note}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
          <tr><td style="background:${BRAND.primary};border-radius:10px;">
            <a href="${esc(url)}" style="display:inline-block;padding:12px 20px;font:700 14px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;">${esc(copy.cta)} &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:14px 0 0;font:400 13px/20px Helvetica,Arial,sans-serif;color:${BRAND.muted};">
          Or open in SyncdIn: <a href="${esc(url)}" style="color:${BRAND.primary};">${esc(url)}</a>
        </p>
      </td></tr>
      <tr><td style="padding:16px 6px 0;font:400 12px/19px Helvetica,Arial,sans-serif;color:${BRAND.muted};">
        You are receiving this because someone acted on your SyncdIn network.<br />
        <a href="${esc(appBaseUrl())}/settings" style="color:${BRAND.muted};">Notification preferences</a> &middot; SyncdIn
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    copy.heading,
    input.actor.headline ?? "",
    copy.lead,
    ...reasons.map((r) => `- ${r}`),
    "",
    `${copy.cta}: ${url}`,
    "",
    `Manage notification preferences: ${appBaseUrl()}/settings`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: copy.subject, html, text };
}

export type SendOutcome =
  | { sent: true }
  | { sent: false; reason: "provider_not_configured" | "opted_out" | "duplicate" | "no_email" | "provider_error"; detail?: string };

/**
 * Provider adapter. Configure `RESEND_API_KEY` (and optionally `EMAIL_FROM`)
 * in Project Settings -> Secrets to enable real delivery. Without the key we
 * report `provider_not_configured` — we never pretend an email was sent.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendOutcome> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return { sent: false, reason: "provider_not_configured" };
  const from = process.env["EMAIL_FROM"] || "SyncdIn <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html, text: args.text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`[relationship-email] provider failed [${res.status}]: ${detail}`);
    return { sent: false, reason: "provider_error", detail: `${res.status}` };
  }
  return { sent: true };
}
