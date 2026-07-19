# App.tsx decomposition — slice 15 candidate boundaries (proposal)

Status: PROPOSAL — the track is `[blocked]` until a human names the next slice
(`docs/NEXT_PLAN.md` Maintenance; twice-blocked rule after the slice-14 revert).
This doc offers three concrete candidates so the owner can unblock by picking one.
Vocabulary: `$codebase-design` (module/interface/seam/adapter/depth).

Context: `App.tsx` is currently 1102 lines with 18 extracted hooks. Slice 14
(`useViewModels`, `d7b3b35`) was HUMAN-REVERTED (`4d88b80`) because a 12-field
props object is a shallow module — more interface than it hid. Every candidate
below is judged on depth (small interface, real behavior hidden), not line count.

## Candidate 1 — `useCombatTutorial` (recommended)

- Scope: `App.tsx:526-607` — `combatTutorialDone`/`combatTutorialProgress` state,
  first-combat detection from `meta_progression`, step matching, localStorage
  persistence, and the `handleCombatActionTutored` decorator around
  `handleCombatAction`.
- Interface: `useCombatTutorial({ finalizedSnapshot, combatLive, onCombatAction })
  → { tutorialStep, tutorialHighlight, markSeen, onCombatActionTutored }`.
- Depth: 3 inputs / 4 outputs hiding the whole tutorial policy, including the
  subtle move-step rule (a board move dispatches as `wait` WITH coordinates; the
  plain wait button must not satisfy the "move" step). Decorator seam: App swaps
  `handleCombatAction` for the returned wrapped callback in exactly two places
  (`useCombatBoard`, `CombatControls`).
- Risk: low; combat behavior unchanged (wrapper preserved). The move/wait rule is
  the invariant to watch in E2E/live-QA.
- Est. −80 lines from App.tsx.

## Candidate 2 — `useInviteGate`

- Scope: `App.tsx:101-115, 252-281, 772` — gate state machine
  (`checking/blocked/ok`), the mount probe (401 → blocked; network error →
  fail-open), `isAdmin`/`inviteGated` identity bits, `handleInviteSubmit`, and
  the `<InviteGate>` render guard.
- Interface: `useInviteGate() → { gate, gated, isAdmin, submitKey }`. Zero
  inputs — the api module is internal.
- Depth: hides probe lifecycle, fail-open policy, and key storage behind 4
  fields. Cleanest seam of the three; `isAdmin` consumers (dev tab, sim) keep
  reading one boolean.
- Risk: lowest; fully behavior-preserving, no combat surface.
- Est. −45 lines.

## Candidate 3 — `<EpiphanyBanner>` component

- Scope: `App.tsx:647-659, 803-826` — `epiphanyNotice` memo, dismissal state +
  localStorage, and the pre-connect banner JSX.
- Interface: `<EpiphanyBanner runsHistory={…} scenarios={…} />` — the component
  owns notice computation and dismissal persistence internally.
- Depth: 2 props hiding build/dismiss/storage; a component seam (not a hook), so
  it also removes JSX from the render body.
- Risk: low; pre-connect UI only.
- Est. −55 lines.

## Explicitly rejected

- Session body-class/SFX-warm effects (`App.tsx:539-567`) as `useSessionChrome`:
  side-effect-only, returns nothing — a shallow module (same failure mode as
  slice 14). Leave inline.
- Any re-attempt of `useViewModels` or another props-bundle: deliberate revert.

## Done criteria (per track rules)

One slice per iteration, behavior-preserving; `make check` green
(frontend-lint/build included) + post-commit AGY live-QA not FAIL/NEEDS. No
frontend unit-test convention exists — the interface is exercised through
Playwright E2E and the six-assertion objective QA.
