# Late-loop Repetition Scope — 2026-07-31

## Decision

**REMEDIATION REQUIRED before another paid production run.** The valid production pair shows two
independent deterministic gaps: ambient combat can re-enter sooner than its documented narrative-scene
cooldown, and the current novelty guard can turn a structural repeat into a cosmetic `Changed ...` title.
The next run would measure known defects rather than a new promotion candidate.

The fresh 2026-07-30 loop was not used for transcript counts because its production transcript was not
available through the local database and direct production API access was policy-blocked. Its rendered
drainage/vent/searchlight/escape/combat repetition is supporting observation only. The quantitative corpus
below is the two already-banked 47/47 non-fallback production transcripts.

## Reproduction

| Production arm | Narrative scenes | Dominant location | Duplicate-title groups | Combat episodes | Fled | Narrative gaps before next combat |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| people/help | 47 | `c17_surface_streets` 25/47 | 3 | 12 | 8 | 2, 2, 2, 2, 2, 5, 11 (median 2) |
| safety/evidence | 47 | `c17_neon_alley` 22/47 | 1 | 7 | 7 | 3, 4, 2, 2, 9, 16 (median 3.5) |

An explicit lexical proxy (`drain|sewer|sluice|vent|searchlight|escape|combat` plus Korean equivalents)
matched 32/47 people/help scenes and 44/47 safety/evidence scenes. This proxy is diagnostic, not a release
threshold; the location concentration, duplicate titles, and combat/flee gaps are the stronger structural
signals. In safety/evidence, `Changed The Sluice Gate Squeeze` directly follows `The Sluice Gate Squeeze`,
and the same cosmetic repair occurs for `The Sluice Gate's Rest`.

## Hypothesis verdict

1. **Route topology stalls or is too short — rejected as the primary cause.** Neo-Seoul has 10 planned
   layers, and the five-narrative-turn layer clock predicts roughly 45 narrative commits; both transcripts
   reached 47. Authored route pools and growth tests already require distinct dynamic titles/types.
2. **Prompt-only novelty is insufficient — confirmed.** Non-fresh route notes already require a different
   location and opening paragraph. `NoveltyController.build_signal(...)` only supplies recent-title/location/
   choice notes, while `_apply_novelty_guard(...)` checks an exact title and repairs it by prefixing `Changed`
   plus a canned tail. It does not reject a repeated location, motif, composition, or situation.
3. **Combat cooldown uses the wrong clock — confirmed.** `COMBAT_COOLDOWN_SCENES = 3` is documented as
   narrative scenes, but `_gate_next_combat(...)` compares raw scene turns with `_last_combat_turn`; combat
   rounds therefore consume the cooldown. High pressure bypasses it, and `player_fled` has no equivalent of
   the existing soft-defeat cooldown.

## Ordered remediation

### 1. Combat re-entry pacing

Keep the decision inside `RuntimeSessionService`: measure ambient-combat cooldown with the narrative commit
clock, and apply a post-`player_fled` minimum that high pressure cannot bypass. Deliberate route/boss combat
continues to bypass the ambient gate so route completion and IX remain reachable. Preserve old saves that
only carry `_last_combat_turn`.

Completion criteria:

- after `player_fled`, fewer than three committed narrative scenes cannot trigger another ambient combat,
  including at tension 80+;
- combat rounds do not advance this cooldown;
- route/boss combat and existing soft-defeat behavior remain regression-locked;
- focused sequence tests and the authoritative local gate pass.

### 2. Structural novelty enforcement

Deepen the existing `NoveltyController` module rather than introduce another seam. Its interface should
assess a candidate against normalized recent title/location/motif signatures, and the Director should reject
or deterministically repair a structurally repeated candidate through that one interface. Prompt notes remain
useful context, but a `Changed` prefix alone cannot satisfy the guard.

Completion criteria:

- a candidate repeating the same normalized location/motif pattern across the configured recent window is
  identified through `NoveltyController`'s public interface;
- an exact-title duplicate with the same structure cannot pass solely because it is renamed `Changed ...`;
- opening turns and intentionally fixed route anchors remain unaffected;
- focused Director/controller regressions, `make smoke-local`, and the authoritative local gate pass.

## Promotion boundary

Deploy the already-local typed fallback evidence together with both remediations only after their gates pass.
Then collect one fresh full-loop production arm. Promotion still requires 47/47 non-fallback generation,
rendered completion, and the owner's subjective ending/overall verdict; deterministic improvements do not
substitute for that sign-off.
