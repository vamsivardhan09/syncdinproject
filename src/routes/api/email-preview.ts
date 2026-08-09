/**
 * Development/demo preview of the SyncdIn relationship email.
 * Not under /api/public, so it stays behind site auth on published builds.
 *
 * Usage: /api/email-preview?kind=connection_request
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  renderRelationshipEmail,
  type RelationshipEmailKind,
} from "@/lib/relationship-email.server";

const KINDS: RelationshipEmailKind[] = [
  "connection_request",
  "connection_accepted",
  "new_message",
  "strong_match",
  "event_match",
];

export const Route = createFileRoute("/api/email-preview")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const requested = url.searchParams.get("kind") as RelationshipEmailKind | null;
        const kind = requested && KINDS.includes(requested) ? requested : "connection_request";

        const { html } = renderRelationshipEmail({
          kind,
          actor: {
            name: "Rahul Mehta",
            headline: "Founding engineer, AI infrastructure",
            avatarUrl: null,
          },
          path: "/people/00000000-0000-0000-0000-000000000000",
          reasons: [
            "You both work with applied LLM systems",
            "Shared goal: find a technical co-founder",
            "They add distributed inference, which your Twin does not cover yet",
          ],
          eventTitle: "AI Builders Summit 2026",
          note: "Our Twins flagged AI infrastructure as common ground — worth a short conversation?",
        });

        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
