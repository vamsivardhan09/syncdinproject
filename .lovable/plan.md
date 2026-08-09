# SyncdIn production-readiness audit

Verdict: the app is a **single-player demo**. Every "other person" in the product is a locally generated persona, and every table is scoped to `auth.uid()` with no cross-user read or write path. Two real signed-in users cannot currently find each other, view each other, request/accept a connection, notify each other, or chat. This is an architecture gap, not a set of small bugs.

## What is verified today

- `profiles` has exactly one policy: `Own profile ALL USING (auth.uid() = id)`. No other user can read any profile row.
- `connections` stores `peer_slug text` + `status` with a single owner row and one policy (own rows). There is no requester/recipient model and no pending/accepted lifecycle.
- `notifications` is own-rows-only, and `recordActivity` in `src/lib/network-activity.ts` always inserts `user_id = self`. Nothing can notify another user.
- `messages` is own-rows-only, keyed by `peer_slug` text. Two users writing "the same" conversation produce two private, invisible-to-each-other row sets. `src/lib/twin-chat.functions.ts` generates the other side's replies with AI.
- Discovery is hardcoded: `/network` maps over `demoPeople`; event attendees are synthesised in `src/lib/event-network.ts`; `demo_profiles` is a public read-only demo table. `event_presence` is written but never read back for discovery.
- `src/lib/people-directory.ts` resolves peer slugs only from demo personas / generated attendees, so a real user's UUID resolves to `null` and would be dropped from Connections lists and the network graph.
- Profile connection rows render `photoFor(person.id)` demo photos; there is no real avatar lookup for other users. "Profile" buttons in the connections list link to `/network`, not to a person page. There is no `/people/$id` route at all.
- Client state lives in `localStorage` (`syncdin.twin.v2`) and merges backend rows by union only — a stale local list can never be corrected by the server, and `joinedNetworks` / `onboarded` are device-local, so onboarding replays on a new device.

## P0 — blocks any two-account workflow

1. **No shared identity graph.** Introduce a real, queryable directory of app users: a `profiles` read policy for authenticated users exposing only safe columns (name, headline, location, avatar, optional coords), plus opt-in `is_discoverable`. Demo personas stay clearly separated as a seeded source.
2. **No connection request lifecycle.** Replace owner-scoped `connections` usage for real users with a symmetric table: `requester_id`, `recipient_id`, `status` (`pending` / `accepted` / `declined`), unique on the ordered pair, RLS letting both sides read and only the recipient accept/decline.
3. **No cross-user notifications.** Notifications for the other party must be written by a server function (`requireSupabaseAuth` for identity, service-role insert for the recipient's row) — never client-side. Notification rows need `actor_id` so the bell can render the correct person's avatar, name and a link to their profile.
4. **No shared conversations.** Model a `conversations` + `conversation_messages` pair keyed by conversation id with both participants allowed to read/insert, and subscribe with Supabase realtime. Twin-to-Twin AI replies become an explicit demo-only mode, not the transport.
5. **No person page.** Add `/people/$id` reading the public profile projection, with connect / request / message actions and correct states (self, not connected, request sent, incoming request, connected).
6. **Peer identity is unresolvable for real users.** `resolvePerson` must fall back to a real-profile fetch (and treat unknown ids as "loading"/"unavailable" rather than silently dropping them).

## P1 — correctness and trust

7. **Local state can outlive the server.** Replace the union-merge hydration in `src/lib/twin-store.tsx` with server-authoritative reads for connections/sources (localStorage as cache only), so removals propagate and a new device shows the truth.
8. **Onboarding + joined networks are device-local.** Persist `onboarded` and joined event networks on `profiles` / `event_presence` so a second device does not restart the flow.
9. **Event Radar isn't real presence.** Rank real checked-in users from `event_presence` joined to profiles, and label the synthetic attendee fill-in explicitly as demo.
10. **Notification content is generic.** Bell shows title/body only; no avatar, no actor, no deep link, no per-item read. Extend with actor rendering and click-through once `actor_id` exists.
11. **`listNotifications` / `listUnreadActivity` rely on RLS alone** without `user_id` filters — correct today but fragile; filter explicitly.
12. **Accept/decline UX missing everywhere**: dashboard, bell and profile need an incoming-requests surface with pending/accepted counts.

## P2 — polish and hygiene

13. Demo data separation: mark `demo_profiles` rows and generated attendees as `source: "demo"` in one place, and gate demo-only affordances (Autopilot AI replies, simulated LinkedIn/GitHub imports) behind that flag so a reviewer can tell real from staged.
14. Connections list "Profile" button links to `/network`; point it at `/people/$id`.
15. Error/empty/loading coverage is inconsistent (network graph, event radar, messages list); standardise skeleton + retry.
16. Twin intelligence and match scores are computed purely client-side from local state, so they differ per device — move the inputs server-side eventually.
17. Security follow-ups: keep avatar/photo fields on the safe projection only, verify no server function returns another user's email, and re-run the linter after the new tables land.

## Recommended implementation order

1. Migration: `profiles` discoverable projection + policy, `connection_requests` (symmetric, RLS), `conversations` / `conversation_messages`, `notifications.actor_id`. Grants for every new public table.
2. Server functions: `searchPeople`, `getPublicProfile`, `sendConnectionRequest`, `respondToRequest`, `getOrCreateConversation`, each writing the counterparty notification with service role after verifying the caller.
3. UI: `/people/$id`, real-user results in `/network` alongside demo matches, incoming-requests panel, bell with actor avatars and deep links.
4. Chat: shared conversation transport + realtime; keep Twin autopilot as an opt-in demo mode.
5. Hydration: server-authoritative twin store, persisted onboarding/joined networks.
6. Verify with two accounts end to end: discover → request → notification with correct avatar → accept → both Connections lists update → chat both directions → refresh/new device persists.

## Technical notes

- All cross-user writes go through `createServerFn` with `requireSupabaseAuth`; the service-role client is loaded inside the handler only after the caller's identity and permission are verified.
- No new anon-readable policies for real user data; the public projection is `TO authenticated` and column-limited.
- Keep the existing `connections` table for demo-persona connections to avoid breaking Event Radar and the network graph during the transition; real user links live in the new symmetric table.
