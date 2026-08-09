/**
 * Client-callable entry point for relationship emails.
 *
 * The caller is always the actor: the server derives the actor identity from
 * the verified bearer token, resolves the recipient's account email with
 * service-role access, honours the recipient's email preference, and
 * deduplicates so the same event never mails twice.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RelationshipEmailRequest = {
  kind: "connection_request" | "connection_accepted" | "new_message" | "strong_match" | "event_match";
  recipientId: string;
  /**
   * For match emails the person shown in the email is the matched member, not
   * the caller. Ignored for actor-driven kinds, where the actor is the caller.
   */
  subjectId?: string | null;
  /** Path the CTA deep-links to inside SyncdIn. */
  path: string;
  /** Stable key for this event so retries/refreshes cannot double-send. */
  dedupeKey: string;
  /** Minutes to suppress further emails of this kind for this pair. */
  cooldownMinutes?: number;
  reasons?: string[];
  eventTitle?: string | null;
  note?: string | null;
};

const KINDS = new Set([
  "connection_request",
  "connection_accepted",
  "new_message",
  "strong_match",
  "event_match",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const sendRelationshipEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RelationshipEmailRequest) => {
    if (!input || !KINDS.has(input.kind)) throw new Error("Unsupported email kind");
    if (!UUID_RE.test(input.recipientId)) throw new Error("Invalid recipient");
    if (!input.path.startsWith("/") || input.path.length > 200) throw new Error("Invalid path");
    if (!input.dedupeKey || input.dedupeKey.length > 200) throw new Error("Invalid dedupe key");
    return {
      kind: input.kind,
      recipientId: input.recipientId,
      subjectId:
        input.subjectId && UUID_RE.test(input.subjectId) ? input.subjectId : null,
      path: input.path,
      dedupeKey: input.dedupeKey.slice(0, 200),
      cooldownMinutes: Math.min(Math.max(input.cooldownMinutes ?? 0, 0), 1440),
      reasons: (input.reasons ?? []).slice(0, 3).map((r) => String(r).slice(0, 160)),
      eventTitle: input.eventTitle ? String(input.eventTitle).slice(0, 120) : null,
      note: input.note ? String(input.note).slice(0, 400) : null,
    } satisfies RelationshipEmailRequest;
  })
  .handler(async ({ data, context }) => {
    const actorId = context.userId;
    const isMatchKind = data.kind === "strong_match" || data.kind === "event_match";
    // Match emails are self-directed only: nobody can trigger them for others.
    if (isMatchKind && actorId !== data.recipientId) {
      return { sent: false as const, reason: "forbidden" };
    }
    if (!isMatchKind && actorId === data.recipientId) {
      return { sent: false as const, reason: "self" };
    }
    // The person shown in the email: the matched member for match kinds.
    const displayId = isMatchKind ? (data.subjectId ?? actorId) : actorId;

    const { renderRelationshipEmail, sendEmail } = await import("./relationship-email.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Recipient preference (defaults ON).
    const { data: recipient } = await supabaseAdmin
      .from("profiles")
      .select("email_relationship_notifications")
      .eq("id", data.recipientId)
      .maybeSingle();
    if (recipient && recipient.email_relationship_notifications === false) {
      return { sent: false as const, reason: "opted_out" };
    }

    // Cooldown: suppress bursts of the same kind between the same two people.
    if (data.cooldownMinutes > 0) {
      const since = new Date(Date.now() - data.cooldownMinutes * 60_000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("email_deliveries")
        .select("id")
        .eq("recipient_id", data.recipientId)
        .eq("kind", data.kind)
        .eq("actor_id", actorId)
        .eq("status", "sent")
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) return { sent: false as const, reason: "cooldown" };
    }

    // Dedupe claim — the unique index makes this the single source of truth.
    const claim = await supabaseAdmin
      .from("email_deliveries")
      .insert({
        recipient_id: data.recipientId,
        actor_id: actorId,
        kind: data.kind,
        dedupe_key: data.dedupeKey,
        status: "pending",
      })
      .select("id")
      .single();
    if (claim.error) return { sent: false as const, reason: "duplicate" };
    const deliveryId = claim.data.id;

    const finish = async (status: string) => {
      await supabaseAdmin.from("email_deliveries").update({ status }).eq("id", deliveryId);
    };

    const { data: actorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, headline, avatar_url")
      .eq("id", displayId)
      .maybeSingle();

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
      data.recipientId,
    );
    const to = userRes?.user?.email;
    if (userErr || !to) {
      await finish("no_email");
      return { sent: false as const, reason: "no_email" };
    }

    const rendered = renderRelationshipEmail({
      kind: data.kind,
      actor: {
        name: actorProfile?.full_name?.trim() || "A SyncdIn member",
        headline: actorProfile?.headline ?? null,
        avatarUrl: actorProfile?.avatar_url ?? null,
      },
      path: data.path,
      reasons: data.reasons,
      eventTitle: data.eventTitle,
      note: data.note,
    });

    const outcome = await sendEmail({ to, ...rendered });
    await finish(outcome.sent ? "sent" : outcome.reason);
    return outcome.sent
      ? { sent: true as const }
      : { sent: false as const, reason: outcome.reason };
  });
