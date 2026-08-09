# SyncdIn v2 — 10-Day Plan to a Retention-First Submission

The current build already demonstrates craft. The gap is not visual quality — it is that the product proves "an AI Twin exists" more than it proves "SyncdIn creates valuable human connections and makes me come back." The plan below closes that gap with a small number of high-impact changes and moves everything else to an idea tank.

## A. Already strong — do not rebuild

- Brand and design system (tokens in `src/styles.css`, wordmark, card language). Keep as-is.
- Auth: split-layout sign-in/sign-up, forgot/reset password, Google, plus a real LinkedIn OIDC exchange (`src/routes/api/public/auth/linkedin/*`).
- Twin-to-Twin AI chat: real LLM calls in `src/lib/twin-chat.functions.ts`, WhatsApp-style thread list + peer profile header, autopilot toggle. This is the most distinctive thing in the product.
- Résumé/portfolio analysis with real extraction (`src/lib/twin-analyze.functions.ts`).
- Google Maps network map with clustering, geolocation persistence, in-view results.
- Connect-sync modal reward animation (`src/components/connect-sync-modal.tsx`) — reuse it, don't replace it.
- Landing page. It stays; it only needs one honesty pass.

## B. The 3–5 highest-impact changes

1. **Value before signup.** Onboarding lives at `/_authenticated/onboarding`, so a visitor must create an account before seeing anything useful. Add a public "instant Twin" step: paste a role/goal or a portfolio link on the landing page, get 3 real match cards with reasons in under 60 seconds, then sign in to unlock chat and the rest. This is the single biggest time-to-value fix.
2. **Make the match score honest and reactive.** Match percentages and reasons are hardcoded per person in `src/lib/demo-data.ts`; they do not move when the Twin improves. Replace with a computed score from the user's Twin profile (skills, goals, connected sources) against `demo_profiles`, with the reasons generated from the actual overlap. Enrichment must visibly change scores and reorder matches — that is the reward that powers the loop.
3. **Close the return loop.** The `notifications` table exists but is never read or written (0 rows, no code references) and the settings toggles are local-only. Build a real "Since you were away" surface: Twin activity while offline (autopilot replies, new matches unlocked by the last enrichment), a next-best-action, and a daily digest state. This is the founder's stated top priority.
4. **A "Twin at work" outcome, not just a chat.** Every conversation should end in something a human can act on: an AI-drafted intro, a suggested meeting agenda, and a "worth meeting / not worth meeting" verdict with reasons. Connections are currently local-only (`connectionsMade` in `src/lib/twin-store.tsx`, `connections` table empty) — persist them so the loop has memory.
5. **Honesty layer for integrations.** LinkedIn and GitHub buttons inside the Twin page run scripted mock flows (`src/lib/sync-flows.ts`) while sign-in has real LinkedIn OAuth. Label simulated sources as "Demo ingestion" with a short explanation, and route the Twin-page LinkedIn button to the real OAuth flow. A candidate who marks the boundary reads as more senior than one who hides it.

## C. Exact user journey after the changes

```text
Landing ──► "What are you working on?" (1 input, no account)
   │            └─► Twin drafts in ~10s → 3 match cards WITH reasons
   ▼
Sign up / Google  (context carried across, nothing re-typed)
   │
   ▼
Dashboard = first value screen
   • Your matches (real scores + why)
   • Twin Intelligence 34% and what the next +12% unlocks
   │
   ▼
Enrichment (résumé upload / portfolio link / demo source)
   • reward modal: skills discovered, intelligence up
   • 2 new matches unlock and scores visibly reorder   ◄── reward
   │
   ▼
Open a match ──► peer profile header ──► Twin-to-Twin chat (autopilot)
   • outcome card: verdict, suggested collaboration, drafted intro
   • Connect → persisted
   │
   ▼
Leave. Return.
   • "While you were away": 2 autopilot replies, 1 new opportunity
   • next-best-action: "Add your goals → unlock 3 investor matches"
   └────────────────► back to Enrichment (loop closes)
```

## D. Build now vs idea tank

Build now: public instant-Twin preview, computed match scoring + reasons, return-loop surface, conversation outcome cards, persisted connections, integration honesty states, one 6-minute demo path that never breaks.

Idea tank (documented in the submission, not built): conference/community custom links and event-scoped networks, group/trusted-circle graphs, recruiter-side workspace, real GitHub OAuth ingestion, live ChatGPT/Claude export ingestion, email digests, mobile app, warm-intro paths through mutual connections, marketplace of Twin-brokered intros.

Judgement call worth stating in the walkthrough: one very small conference slice is defensible — a shareable `/c/:code` link that scopes matches to an event cohort — but only if days 8–9 are ahead of schedule. It is a differentiator, not a foundation, and the retention loop must land first.

## E. Technical plan on the current architecture

No framework migration. Stays TanStack Start + Supabase + Lovable AI gateway.

- **Scoring**: new `src/lib/matching.ts` (pure, testable) computing overlap of skills/goals/interests plus source-coverage weighting; reasons derived from the actual overlapping terms. Consumed by `network.tsx`, `dashboard.tsx`, `network-map.tsx`, replacing the static `match`/`reasons` fields.
- **Twin profile as source of truth**: extend `profiles` with the extracted Twin fields (skills, goals, interests, summary) and read them back on load. Today `twin-store.tsx` rehydrates only from `localStorage` and `twin_sources` is write-only, so progress does not survive a device change.
- **Public preview**: a public server function (publishable-key client, `TO anon` select on `demo_profiles`) called from a public route — no `requireSupabaseAuth`, since public loaders have no bearer token. Preview input handed to signup via query param, then merged into the profile.
- **Return loop**: write `notifications` rows on autopilot replies, new-match unlocks, and enrichment milestones; a dashboard "While you were away" card reads unread rows and marks them read. Settings toggles persist to `profiles`.
- **Security fix**: `twin-chat.functions.ts` and `twin-analyze.functions.ts` currently have no auth middleware, so the app's AI key is callable by anyone. Add `requireSupabaseAuth` to both (the public preview gets its own separate, tightly capped function).
- **Data**: migrations for the new `profiles` columns and any notification helpers; `demo_profiles` already holds the 9 seeded people with coordinates.

## F. 10-day execution order (impact × risk)

| Days | Focus | Outcome |
|---|---|---|
| 1 | Twin profile persistence + auth middleware on AI functions | Foundation and the one real security hole closed |
| 2–3 | Computed scoring + reasons everywhere; enrichment visibly moves matches | The core promise becomes true, not authored |
| 4 | Public instant-Twin preview + carry context through signup | 60-second time-to-value |
| 5 | Conversation outcome cards + persisted connections | Twin produces human-actionable results |
| 6–7 | Return loop: notifications, "While you were away", next-best-action, digest state | The founder's top priority |
| 8 | Integration honesty states; onboarding trimmed to what earns its friction | Credibility and reduced drop-off |
| 9 | Polish, empty/error/permission states, mobile pass, seed a believable demo account | Nothing breaks on camera |
| 10 | Record walkthrough, write README/idea-tank doc, buffer | Submission |

Risk notes: scoring is the highest-value and highest-rework item, so it lands early. The public preview touches auth boundaries — if it slips, ship it as a signed-out demo on the landing page instead of blocking days 5–7. The conference slice is explicitly cut before anything on days 1–7 slips.

## G. The 5–6 minute walkthrough

1. (30s) The thesis in one line: networking fails because you cannot tell who is worth your time. Twin exists to answer that — it is not the product.
2. (60s) Landing → type one goal → 3 real matches with reasons, before any account.
3. (45s) Sign up, land on dashboard: matches, intelligence, what the next step unlocks.
4. (75s) Upload résumé → reward → scores reorder and 2 new matches appear. Say out loud that this is the retention hook.
5. (75s) Open a match → Twin-to-Twin conversation → outcome card with verdict and drafted intro → connect.
6. (45s) Simulate return: "While you were away" + next-best-action, and name the loop explicitly.
7. (30s) Honesty + prioritisation: what is mocked and why, then the idea tank — conferences, trusted communities, recruiter side — and why they were deliberately not built now.

## H. Current problems that could hurt the submission

- **No value before signup.** Onboarding is behind the auth gate; the 60-second claim is not yet provable to a first-time visitor.
- **Static scores.** Hardcoded `match` numbers and authored `reasons` in `demo-data.ts` mean enrichment has no consequence — a reviewer will notice the loop does not actually close.
- **No retention mechanism at all.** `notifications` unused, `connections` empty, settings toggles cosmetic. This is exactly what the founder said matters most.
- **Progress is device-local.** `localStorage` is the source of truth; a fresh browser or second device shows a beginner Twin.
- **Unauthenticated AI endpoints.** Both AI server functions are callable without a session using the app's shared key.
- **Mock/real mismatch on LinkedIn** (real OAuth for sign-in, scripted flow for the same logo inside Twin training) and a fully simulated GitHub connect — unlabelled, this reads as overclaiming.
- **Dashboard hardcoded stats** ("247 professionals analyzed") that do not correspond to anything.
- Onboarding is 5 steps of scripted animation before the dashboard; several steps do not earn their friction under a 60-second target.
