# Progress Log

Last updated: 2026-07-08

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

## 2026-07-08 — S4 variant-routed opening CONTENT — the loop now branches by variant end-to-end
- Status: Committed (S4 slice, 16 files); `make check` **902** green; e2e smoke verified (in-memory loop 2 = kai pick → anchor beat `opening_reentry_kai` / title 백도어 좌표 / variant image_sequence).
- Changed: layer-0 anchor `variants` ×6 (beat/title/summary + variant art incl. 07-07 shot 02 as `image_sequence`, `reentry_<v>` events) · connect gate `player_goal_variants` ×6 · all 12 variant directives (KO+EN parity) extended 1-cut → **turn 0-3 window** with authored REENTRY_SCENE2/3 beats (hook development → route hand-off; every follow-up beat forbids the Se-rin first-contact re-enactment + meeting completion).
- Verified: `make check` 902 (obsolete 1-cut invariant → 0-3 window contract w/ per-beat se_rin policy assertion; S1 placeholder → real-data skin test; new coupling test anchors↔goals↔directives per variant); `validate-content` clean; directive parser check (max_turn 3, beats 0/1/2); loop-1 default untouched.
- Blockers: none. Note: connect-gate variant goal shares the base gate's narrow display window (phase reaches explore at first scene — parity with base); the per-turn objective is now steered by the variant directives instead.
- Next: `[manual]` **S4 카피 톤 검수** (anchor titles/summaries/goals + 12 directive beats) · in-game 2회차 feel run · shot 03 `[blocked]` quota · deploy+sign-off.

## 2026-07-07 (overnight, codex failover) — Type-noise cleanup + completed-plan archive
- Status: Claude-lane cleanup and codex doc-migration seeds completed with no runtime behavior changes.
- Changed: lifespan annotation now uses `AsyncGenerator[None, None]`; the recovered asset-test cleanup removed unused loop variables. Six implemented plans were archived, references repaired, and M57 added.
- Verified: `$GATE_CMD` (`make check`) green (ruff/eslint, mypy 165, frontend build, unittest 901 with 2 skipped, validate-content 2); doc budget and moved-plan sweeps green.
- Blockers: SHOT 03 image generation hit `usage_limit_reached` again (`resets_in_seconds=71218`); second occurrence, so the item is now `[blocked]` with no partial/fake assets promoted.
- Next: Codex/Claude lanes have no unblocked `[auto:*]` items; retry SHOT 03 only after quota/human review.

## 2026-07-07 (overnight, codex lane) — Variant intro SHOT 03 ×6 blocked (attempt 1)
- Status: Not completed; the image-generation usage limit stopped the six-image batch after 3/6 drafts.
- Changed: No project assets or scenario metadata were changed. The three partial drafts remain outside the workspace
  under `.codex/generated_images/` and were intentionally not promoted or replaced with placeholders.
- Verified: `git status --porcelain` was clean before the attempt; generator returned `usage_limit_reached`
  (`resets_in_seconds=73385`) on image 4/6; `make check` green (901 tests, 2 skipped).
- Blockers: First occurrence for `[auto:codex]` variant intro SHOT 03 ×6 — in-session image quota unavailable.
- Next: Retry the same item after quota reset; on a second identical Blocker, append `[blocked]` per loop policy.

## 2026-07-07 (overnight, codex lane) — Variant intro SHOT 02 ×6
- Status: The first codex intro-expansion slice is done; all six Loop 2+ variants now have a two-shot boot cinematic.
- Changed: generated six 1672×941 RGB PNGs (`opening-{han,kai,lin_yue,su_ah,tae_o,solo}-02.png`) in the
  established first-person rainy cyan/red style; appended directive-aligned KO metadata + text-only EN overlays.
- Verified: visually read back all six promoted images; JSON parse clean; `tests.test_opening_variant_intro` 3/3;
  `make check` green (ruff/eslint/mypy 165/tsc+vite/unittest 901, 2 skipped, validate-content 2).
- Blockers: None. Next: `[auto:codex]` variant intro SHOT 03 ×6; human intro/cut feel review remains manual.

## 2026-07-07 (overnight, claude lane) — SFX reference↔file integrity test (QA seed 1/2)
- Status: Overnight QA Seed item 1 done; `make check` **901** green (+2 tests, `tests/test_sfx_integrity.py`).
- Changed: new test scans `scenario.json` + SPA ts/tsx + static `app.js` for `sfx_*` ids — each must map to
  `resources/neo-seoul/audio/sfx/<id>.wav` with RIFF/WAVE magic (playSfx fails silently, so a dangling ref was
  invisible); serializer `_presentation_cues` cues cross-checked vs SPA `CUE_SFX`. Guards: ≥8 ids (10) + ≥5 cues.
- Verified: `make check` green (ruff/eslint/mypy 165/tsc+vite/unittest 901, 2 skipped, validate-content 2).
- Blockers: None. Next: QA seed item 2 — lint/type-noise cleanup (`app.py` asynccontextmanager annotation +
  `tests/test_assets.py` unused loop vars).

## 2026-07-07 (overnight, claude lane) — S3 early se_rin flag clamp (variant-routed opening)
- Status: S3 of `docs/plans/2026-07-06-variant-routed-opening.md` implemented; `make check` **899** green (+9 tests).
- Changed: `mythos_loop/validator.py` — `validate_scene_payload` strips `met/trusted/refused_se_rin` from
  `world_delta.flags` when the loop is a variant loop (`_opening_variant` != "default") and
  `scene.turn_index <= 3` (`SE_RIN_CLAMP_MAX_TURN`), via the existing `clamped_delta` soft-repair path — so
  the strip propagates to state merge AND the recorded WorldEvent. Default/loop-1 byte-identical; turn 4+
  passes through untouched.
- Verified: `make check` green (ruff/eslint/mypy 164/tsc+vite/unittest 899, validate-content 2 scenarios).
  `tests/test_serin_flag_clamp.py` ×9: validator strip/boundary/after-window/default-passthrough/non-contact
  flags + engine-level state+event assertions + design-constant lock.
- Blockers: None.
- Next: S1-S3 `[auto:claude]` all done — S4 `[manual]` directive windows 0→3 + copy tone verdict (plan §4),
  S5 `[auto:codex]` variant shots. Claude lane continues with the Overnight QA Seed items.

## 2026-07-07 (overnight, claude lane) — S2 chapter-gate variant goal (variant-routed opening)
- Status: S2 of `docs/plans/2026-07-06-variant-routed-opening.md` implemented; `make check` **890** green (+10 tests).
- Changed: `serializers._chapter_goal` — on a variant loop (`state["_opening_variant"]` != "default") a gate's
  optional `player_goal_variants: {<vid>: str}` overrides `player_goal`; missing map/entry/blank/non-string
  falls back to the shared copy (loop-1 byte-identical; explore+ gates converge by design, resolution is
  per-gate). Mechanism only — no scenario ships `player_goal_variants` yet; KO copy lands with the S4 tone
  verdict (drafts in plan §4).
- Verified: `make check` green (ruff/eslint/mypy 163/tsc+vite/unittest 890, validate-content 2 scenarios).
  `tests/test_chapter_goal_variants.py` ×8 (override/default/unmapped/blank/malformed/per-gate/real-scenario
  dormant invariant). `tests/test_route_meaning_and_goals.py` +2: content guard — `player_goal_variants` keys
  must be authored opening variants + non-empty values (`_variant_goal_violations`), with a guard-the-guard
  self-test since the scan is vacuous until S4 copy lands.
- Blockers: None.
- Next: S3 early se_rin flag clamp (`[auto:claude]`), then S4 `[manual]` directive/copy tone.

## 2026-07-07 (overnight, claude lane) — S1 anchor variantization (variant-routed opening)
- Status: S1 of `docs/plans/2026-07-06-variant-routed-opening.md` implemented; `make check` **880** green (+15 tests).
- Changed: `route_map.py` — layer-0 (any) anchor gains an optional `variants` map resolved at route
  materialization (`_apply_anchor_variant`): content fields (beat/title/image/image_pre/event/image_sequence/
  default_perspective) override the base, explicit `null` clears a field, a `summary` override rewrites ONLY the
  default perspective's line (§3.2 neutral fallback), node carries a `variant` marker; `opening_variant` kwarg
  threaded through `build_route_map`/`build_route_seed`. `session.py` passes the loop's `_opening_variant` to both
  builders. `route_content.py` — validator registers variant beat ids (unique/non-empty), rejects unknown override
  fields and dangling `default_perspective` refs.
- Verified: `make check` green (ruff/eslint/mypy/tsc+vite/unittest 880, validate-content 2 scenarios).
  `tests/test_route_variants.py` ×15: override resolution, null-clear, summary-only-default, default/unknown-variant
  byte-identical builds (incl. real neo-seoul config = loop-1 invariant), dynamic seed path, validator contracts,
  session wiring (spy asserts builders receive the picked variant).
- Blockers: None. Note: no scenario ships `variants` data yet — mechanism only; copy lands with S4 tone verdict.
- Next: S2 chapter-gate `player_goal_variants` + S3 se_rin flag clamp (`[auto:claude]`), then S4 `[manual]` tone.
