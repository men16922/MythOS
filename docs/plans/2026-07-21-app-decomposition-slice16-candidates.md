# App.tsx decomposition — slice 16 candidate boundaries (proposal)

Status: PROPOSAL — the track is `[blocked]` until a human names the next slice
(`docs/NEXT_PLAN.md` Maintenance; twice-blocked rule after the slice-14 revert).
This doc offers three concrete candidates, re-anchored to the current file, so the
owner can unblock by picking one. Vocabulary: `$codebase-design`
(module/interface/seam/adapter/depth).

Context: `App.tsx` is now **1050 lines** (post slice 15) with 19 extracted hooks.
Slice 15 landed **Candidate 1 `useCombatTutorial`** from the slice-15 doc
(`docs/plans/2026-07-20-app-decomposition-slice15-candidates.md`, `6a019eb`), so
that candidate is retired. Slice 14 (`useViewModels`, `d7b3b35`) was HUMAN-REVERTED
(`4d88b80`) because a 12-field props object is a shallow module — more interface
than it hid. Every candidate below is judged on **depth** (small interface, real
behavior hidden), not line count.

## Candidate 1 — `useIntroSequencer` (recommended — deepest)

- Scope: `App.tsx:138` (`openingVariant` state) + `679-721` — the B2 loop2+
  opening-variant resolution: `introVariantKey`/`introVariantArrived` derivation,
  the 12s last-resort reveal timer (`introWaitExpired`, effect `697-703`), the
  per-loop reset effect (`704-712`, which nulls `openingVariant` on intro close),
  and the `introPending`/`introVariants`/`introData` selection.
- Interface: `useIntroSequencer({ showIntro, currentScenario, finalizedSnapshot,
  lastSnapshot }) → { introData, introVariantKey, setOpeningVariant }`.
  `setOpeningVariant` is the only setter that must stay exposed — `useNarrativeStream`'s
  `onLoopMeta` callback (`App.tsx:409`) writes the early meta-frame variant into it.
- Depth: this is the **trickiest timing logic in the file** — it resolves a race
  between the early `loop_meta` WS frame (~1s) and the snapshot that also carries
  the variant (8–20s later). Getting it wrong is exactly the "flashed the default
  Se-rin cut then swapped" bug the current code fixes. 4 inputs / 3 outputs hide
  that whole race, the fallback timer, and the per-loop signal reset. Highest
  **locality** win of the three: the next time this race regresses, it is one hook
  to reason about, not a thicket spread across the render body.
- Risk: medium. Behavior-preserving but the intro-hold path (`introPending` →
  skeleton until variant known) is only visible on loop 2+ with a real server
  `loop_meta` frame; the E2E fallback path (`?fallback=1`) shows the default cut
  and won't exercise the variant branch. Watch: intro no longer flashes-then-swaps
  on a loop-2 non-fallback live loop; the 12s dead-stream fallback still reveals.
- Est. −40 lines from App.tsx.

## Candidate 2 — `useInviteGate` (lowest risk; carried from the slice-15 doc)

- Scope: `App.tsx:101,104,114` (`isAdmin`/`inviteGated`/`inviteGate` state), the
  mount probe (`256-272`, 401 → blocked; network error → fail-open), the
  `handleInviteSubmit` mutation (`274-281`), and the render guard (`725-727`).
- Interface: `useInviteGate() → { gate, gated, isAdmin, submitKey }`. Zero inputs —
  the `api` module (`verifyInvite`/`setInviteKey`) is internal to the hook.
- Depth: hides the probe lifecycle, the fail-open policy (a backend hiccup must not
  lock everyone out), and key storage behind 4 read fields + one submit fn.
  Consumers keep reading plain values: `gate` gates two mount effects (`285`, `315`)
  and the render guard; `isAdmin` drives `TabNav.showDev`/`swipeTabs`/
  `OnboardingPanel.showCombatSim`/dev tab; `gated` drives `showCombatSim`.
- Risk: lowest of the three; fully behavior-preserving, no combat/timing surface.
- Est. −40 lines.

## Candidate 3 — `<EpiphanyBanner>` component (downgraded — presentational only)

- Scope: the pre-connect banner JSX (`757-781`) + `dismissEpiphany`/`dismissedEpiphany`
  (`122-128,606-613`).
- **Entanglement found (revised vs the slice-15 doc):** `epiphanyNotice` (memo
  `601-604`) is ALSO read by `tabNotices` (`640`) to light the skills-tab notice
  dot, so the notice computation + dismissal state **must stay in App**. A component
  can only take `notice`/`onDismiss` as props — it removes ~24 lines of render-body
  JSX but hides no behavior. That makes it a **shallow** extraction (same failure
  mode class as slice 14), so it is listed for completeness, not recommended.
- Interface: `<EpiphanyBanner notice={epiphanyNotice} onDismiss={dismissEpiphany} />`.
- Risk: low; pre-connect UI only. But low depth → weak payoff.
- Est. −20 lines (JSX only).

## Explicitly rejected

- Session body-class / SFX-warm effects (`523-551`) as `useSessionChrome`:
  side-effect-only, returns nothing — a shallow module. Leave inline.
- Item-gain toast (`106-107,367-374,831-840`) as `useItemNotice`: a genuine but
  tiny timer-lifecycle hook (~−15 lines); acceptable as a small deepening but lower
  value than Candidates 1–2. Mention-only.
- Any re-attempt of `useViewModels` or another props-bundle: deliberate revert.
  (The pure `buildCodexLists`/`buildDevConsoleData`/`buildEpiphanyNotice` builders
  in `viewModels.ts` are fine — the reverted thing was the *hook* wrapper, not the
  functions.)

## Recommendation

Pick **Candidate 1 (`useIntroSequencer`)** for the depth/locality win on the
file's highest-risk timing code, or **Candidate 2 (`useInviteGate`)** if a
zero-risk, no-live-QA-surface slice is preferred this iteration. Skip Candidate 3
unless a pure render-body cleanup is explicitly wanted.

## Done criteria (per track rules)

One slice per iteration, behavior-preserving; `make check` green
(frontend-lint/build included) + post-commit AGY live-QA not FAIL/NEEDS. No
frontend unit-test convention exists — the interface is exercised through
Playwright E2E and the seven-assertion objective QA. For Candidate 1, the intro
variant branch needs a loop-2 **non-fallback** check (fallback shows the default
cut and skips the race).
