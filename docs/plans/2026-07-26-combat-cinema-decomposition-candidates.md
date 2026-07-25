# CombatCinema decomposition — candidate boundaries

Status: CLOSED 2026-07-26. A `937d2fd` + B `5247719` landed with `make check` 1166/1167 and AGY PASS; C declined as shallow after `useCombatCinema.ts` reached 125 lines.
Fresh survey baseline: `CombatCinema.tsx` 258 lines; `hooks/useCombatCinema.ts` 419 lines.
Vocabulary: `$codebase-design` (small interface hiding cohesive behavior).

## Candidate A — combat skill resolver (selected)

- Scope: the 19-entry skill-card catalog, exact-ID-first normalization, Korean/English
  fallback aliases, and metadata lookup currently embedded in `useCombatCinema.ts`.
- Interface: `resolveCombatSkill(name?) → { id, metadata }`.
- Depth: one pure call hides the catalog and its ordering-sensitive alias policy while the
  cinema hook only consumes the resolved presentation model.
- Risk: low. No timing, rendering, or resource-path behavior changes. Existing scenario
  coverage and exact-ID source-lock tests move with the owning module.
- Expected result: remove roughly 230 lines of unrelated policy from the timeline hook.

## Candidate B — cinema timeline hook (recommended next)

- Scope: phase state, callback refs, fast/normal timing constants, four timers, impact cue,
  and cleanup.
- Interface: `useCombatCinemaTimeline({ defenderId, damage, isFast, callbacks }) → phase`.
- Depth: hides the full attack/impact/resolve state machine and stale-callback protection.
- Risk: medium. Timing is player-visible and needs post-commit browser QA.

## Candidate C — combat image resolver

- Scope: pose selection and fallback order across `combat_images`, portrait, and player
  noise assets.
- Interface: a pure `resolveCombatCinemaImages(...)` result object.
- Depth: modest; it centralizes fallback policy, but may expose too many pose inputs.
- Risk: low-medium. Missing-asset fallback is browser-visible.

## Explicitly rejected

- Moving JSX fragments out of `CombatCinema.tsx`: the component is already small and the
  move would mostly exchange local markup for prop width.
- Extracting only the 350 ms skip guard: too little behavior to justify a new module.
- A props/view-model bundle: repeats the shallow-interface failure already rejected in the
  `App.tsx` track.

## Done criteria

One candidate per iteration; preserve behavior; relevant focused tests plus `make check`
green; commit the generated frontend bundle; post-commit AGY must not report FAIL/NEEDS.
