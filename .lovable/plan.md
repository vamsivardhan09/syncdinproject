# SyncdIn — Founder-Philosophy Alignment Plan

## Audit summary

### Already good — preserve as-is
- **Computed matching, not fake scores** — `src/lib/matching.ts` builds a Twin vector from real connected/trained sources and derives score + up-to-3 evidence reasons. This is the strongest asset in the product and must stay the single scoring path.
- **Real two-account backbone** — `connection_requests` with symmetric status, auth-gated SECURITY DEFINER reads (`search_people`, `get_public_profile`, `list_my_connections`, `get_notification_actors`), actor-aware notifications via the `notify_connection_request` trigger, and `/people/$id` request lifecycle (connect / accept / decline / withdraw).
- **Server-authoritative Twin** — `twin-store.tsx` treats `twin_sources`, `connections` and `profiles.onboarded` as source of truth, with localStorage only bridging first paint.
- **Event Radar** — explicit check-in presence (`event_presence`), event-weighted ranking in `rankForEvent`, and a real activity window (`PRESENCE_WINDOW_MIN = 45`). The "rank by fit AND recency" idea already exists here.
- **Brand/UI language** — indigo/violet tokens, `surface-card`, gradient meters, motion. No redesign.

### Broken / misaligned with the founder philosophy
1. **Onboarding is far too long.** `onboarding.tsx` runs `onboardingSteps.length + 2` steps (multi-source pitch → loading → reward per source, then a communication-sources step, then a summary) before the user ever sees a person. The philosophy is: one source, immediate value, enrich later.
2. **Real members get no intelligence.** `search_people` orders by `twin_intelligence DESC, created_at DESC`. Real people are never scored by `matchFor`, never carry reasons, and never show a suggested intro — while demo personas do. The core promise ("AI compresses compatibility into reasons") is only true for fake people.
3. **No activity signal for real members.** `profiles` has no last-seen column, so an abandoned account outranks an active one. The radar solved this for demo attendees only.
4. **Twin signals cannot describe a real user.** Signals come only from `SOURCE_SIGNALS[sourceId]`; `profiles.skills` exists but is unused by matching, and there are no goals/interests columns. Two real users therefore cannot be compared meaningfully.
5. **No viral artifact.** Nothing in the product is shareable. There is no public, genuinely-useful personal-intelligence output.
6. **Weak return loop.** `while-you-were-away.tsx` and the dashboard show demo counts (`demoStats()` counts `demoPeople`), so returning gives no evidence that "recommendations got better since last time".
7. **Discovery is one flat list.** Global directory + events exist; there is no "communities" surface and no single "find my people" entry point.

### Deliberately NOT building now
Voice onboarding, personality/deep-question modules, message-reply prediction, life-path modules. Noted as future; out of scope per the founder's own instruction.

---

## P0 — The smallest high-impact loop

### P0.1 — 60-second onboarding: one source, instant value
Exact journey: sign up → **one screen**: "Give your Twin one thing to read" with three equal options (upload résumé, paste portfolio/LinkedIn URL, or paste a short "what I'm working on" paragraph) → single analyze pass (reuse `twin-analyze.functions.ts`) → **"Here's what I understood about you"** (extracted skills/goals/interests as editable chips, confirm in one tap) → **immediately land on ranked people with reasons**. No per-source pitch/reward carousel, no communication step, no summary step.

- Reduce `/onboarding` to 3 phases: `source → understood → people`.
- The existing multi-source carousel content moves to `/twin` as optional enrichment ("Your Twin is 34% — add GitHub to unlock project matches"), so nothing is deleted, just relocated.
- Confirmed chips are written to the profile so matching can use them.

Acceptance criteria
- A brand-new account reaches a ranked people list with reasons in under 60 seconds and ≤ 3 taps after auth.
- Skipping is allowed but shows the concrete cost, and `profiles.onboarded` is still set.
- Refresh preserves everything (server-authoritative, no localStorage-only state).

### P0.2 — Real members are ranked by fit AND activity, with reasons
- Store real Twin signals on `profiles`: `goals text[]`, `interests text[]`, plus `twin_summary text` (the "what I understood" paragraph) and `last_active_at timestamptz`.
- Touch `last_active_at` on app load (single lightweight authenticated write, debounced per session).
- Add `search_people_ranked(_q, _limit)` returning the safe projection **plus** `last_active_at`, `goals`, `interests`, `skills`, `twin_summary`, filtered to discoverable non-self profiles and ordered by recency of activity first, then intelligence.
- Score client-side with the **existing** `matchFor` by adapting a `PublicProfile` into a `Candidate`, so real members and demo personas share one scoring path and one reason format.
- Directory and `/people/$id` show: match %, up to 3 reasons, one suggested introduction line, and an "active today / this week / dormant" chip. Dormant profiles rank last and are visually de-emphasised, never hidden with a lie.

Acceptance criteria
- Two real accounts each see the other with a computed %, ≥ 2 concrete reasons, and a suggested intro.
- An account with no activity in 30 days ranks below an active account of equal fit.
- Adding a source to your Twin visibly changes the order and the reasons of the real-member list.

### P0.3 — Twin-to-Twin compatibility on the member profile
On `/people/$id`, add one "Why your Twins match" block: shared signals, complementary strengths, a suggested collaboration, and a copyable opening message. Sent connection requests carry that opening line into the first message so the relationship starts with context, not "hi".

Acceptance criteria
- Every real member profile with any signal overlap renders reasons derived from actual overlap (no authored fallback text for real users).
- Accepting a request produces a conversation pre-seeded with the suggested opener.

---

## P1 — Retention and organic virality

### P1.1 — "What changed since your last visit"
Replace the demo-count dashboard header block with a real delta: new people matched, requests received, and how your Twin's score/reasons moved since `last_active_at`'s previous value. Keeps `while-you-were-away.tsx`, feeds it real data.

Acceptance criteria: returning after any new match or request shows a non-empty, accurate delta; a returning user with nothing new sees an honest "nothing new — add a source to widen your matches" state.

### P1.2 — Shareable Personal Intelligence card
A public route (`/p/$handle` style, opt-in) rendering the Twin's read of the person: summary, top signals, what they're looking for, and "what a good intro to me looks like". Genuinely useful to paste in a bio or DM. No referral points, no gimmicks. Opt-in only, safe-column projection only.

Acceptance criteria: signed-out visitor can load the card with correct OG title/description/image; owner can toggle it off and the route then 404s.

### P1.3 — Real members in Event Radar and communities
Include real, checked-in members in `rankForEvent` alongside demo attendees, and generalise event networks into "communities" (event / company / topic) using the same check-in + ranking mechanic.

---

## P2 — Later
Voice onboarding, personality/deep questions, reply prediction, life-path modules, message-thread AI autopilot beyond the current demo. Each is a separate future decision.

---

## Technical notes

Database (single P0 migration)
- `ALTER TABLE public.profiles ADD COLUMN goals text[] NOT NULL DEFAULT '{}', ADD COLUMN interests text[] NOT NULL DEFAULT '{}', ADD COLUMN twin_summary text, ADD COLUMN last_active_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN public_card boolean NOT NULL DEFAULT false;`
- New `search_people_ranked(_q text, _limit int)` — SQL, STABLE, SECURITY DEFINER, `SET search_path = public`, gated on `auth.uid() IS NOT NULL`, projecting only safe columns.
- Extend `get_public_profile` to return the new signal columns (same auth gate and discoverability rule).
- Owner writes go through the existing `Own profile` RLS policy; no new grants needed for existing tables, and any new table would ship its own GRANT block.

Code
- `src/lib/matching.ts` — add a `Candidate` adapter for `PublicProfile`; do not change the scoring formula.
- `src/lib/real-people.ts` — add `searchPeopleRanked`, `touchActivity`, extend `PublicProfile`.
- `src/routes/_authenticated/onboarding.tsx` — collapse to 3 phases; move the source carousel content into `/twin`.
- `src/components/real-people-directory.tsx`, `src/routes/_authenticated/people.$id.tsx` — render score, reasons, intro, activity chip.
- No changes to `client.ts`, `types.ts`, or the `_authenticated/route.tsx` gate.
