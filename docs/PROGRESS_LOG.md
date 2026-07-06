# Progress Log

Last updated: 2026-07-07

This file keeps **only recent incremental summaries within the 120-line budget**. Older 2026-07 entries are in
`bin/docs/archive/progress-2026-07.md`; the 2026-06 detailed log in `bin/docs/archive/progress-2026-06.md`, 2026-05 in `bin/docs/archive/progress-2026-05.md`.

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

## 2026-07-06 (night) — Local P1 playtest → per-variant boot intro shipped + variant-routed opening designed
- Status: Committed `a1e3b81..7aa9491` (checklist refresh + feature + fix + design); `make check` **865** green (+3 tests); ahead 4 (user pushed through `a1e3b81`). Local test stack live (`make api-cloud`, port 8000, infra healthy).
- **Live-QA checklist refreshed** (`a1e3b81`): repointed at rev `00025-856`, undeployed-P1 warning, new 🆕 P1 section (onboarding rows carry 07-06 AGY PASS runs), known-noise notes updated. Icons/SFX wiring row → human (2 AGY attempts failed browser attach; later resolved by code read: action-bar glyphs are BY DESIGN — icons render in SkillTree/cinema).
- **Per-variant boot OPENING SEQUENCE** (`ca5c835` + `0039c45`): `ui_copy.session_intro_variants` ×6 (KO+EN, 1 shot each on the codex art); SPA binds to snapshot `_opening_variant`; returning identities hold on a "신호 재정렬 중" screen until the variant lands (8s fallback) — no mid-read swap; new players get the Se-rin sequence instantly. EN merge helper extracted; 3 tests lock variant↔intro↔image + merge.
- **User playtest verdict → variant evaporates at turn 1**: live loop `loop_88ba…` (tae_o, idx 6, patrol_surge) re-enacted Se-rin first contact at turn 1 (`met_se_rin` flag, Se-rin cut, Se-rin objective). Root cause = 3 fixed rails: layer-0 mandatory anchor `opening_escape` (Se-rin image_sequence/perspectives/endings), connect chapter-gate goal, canon pull + directive window `max_turn: 0`.
- **Design snapshot** (`docs/plans/2026-07-06-variant-routed-opening.md`, user chose design-first): anchor variantization (content overrides, node identity kept) + directive windows 0→3 + mechanical se_rin flag clamp + `player_goal_variants`; B1/perspective/ending interaction analysis; 6-variant copy drafts (§4, tone verdict pending). Slices S1-S3 `[auto:claude]` seeded in NEXT_PLAN; S4 `[manual]` tone; S5 rides the codex shots item.
- Next: NEXT SESSION = implement S1→S2/S3; humans: S4 tone verdict · deploy+sign-off · G2 twist review · voice pinning · `git push` (ahead 4).

## 2026-07-06 (PM, session wrap) — Overnight lanes drained + 3 harness failures fixed in-flight
- Status: `c85ee52..d661f44` (10 commits incl. 2 phantom-revert pairs); `make check` **862** green independently re-run at final HEAD; **ahead 10** (origin already pushed through `26435c5`). Both runners STOPPED — `[auto:agy]`/`[auto:codex]` backlog fully drained. Asset detail = the three engine entries below.
- **Harness fixes**: ① PROGRESS_LOG at exactly 120/120 → every commit gate-RED (tidy `c85ee52`) ② agy's integrity-test mypy type-var → phantom-revert; assets recovered + 1-line fix (`b095446`) ③ agy CLI prints its verdict then never exits (dangling chrome-devtools conn, `--print-timeout` dead) → 30-min iteration burns; gtimeout hard ceiling + verdict-rescue (`6f61d9a`).
- **Live-QA closed** (`deb24c4`): 2 direct non-nested runs PASS_CANDIDATE (`20260706-202053/202327-manual`) — tutorial 4-step card, entry banner, skill badges, roster chips, cover 🛡, KO placeholder; screenshots visually audited. **Nested agy-in-agy hangs intermittently** (burned 3 iterations) — run live-QA direct from a supervising session.
- Next: `[manual]` in-game feel review of tonight's assets · G2 twist tone review · sign-off run · `git push` (ahead 10). Morning note: simulator action-bar renders glyphs — check `skills/*.png` wiring.

## 2026-07-06 — Regenerated 6 opening variant cutscenes (codex)
- Status: Completed the user-directed replacement of all six placeholder opening-variant images.
- Changed: Replaced `opening-{han,kai,lin_yue,solo,su_ah,tae_o}.png` with in-session generated cinematic first-person cuts matching the original rainy cyan/red opening style; retained 1672x941 8-bit RGB PNG format.
- Verified: Read back all six files and SHA-256 hashes; `make check` passed (ruff, eslint, mypy 160 files, frontend build, unittest 862 green / 2 skipped).
- Blockers: None.
- Next: Human visual/feel review of the six replacement cuts alongside the original three-cut opening.

## 2026-07-06 — Generated and promoted 10 new skill icons and SFX wavs (agy)
- Status: Completed drafting, converting, and promoting 10 new skill card images and 4 SFX WAV files; tests passed.
- Changed: Generated 10 new skill card images via in-session Imagen 3/Gemini (9:16 aspect ratio), saved as PNG in `outputs/agy/skills/` staging, promoted to `resources/neo-seoul/skills/`. Generated 4 sound effect WAV files (`sfx_alarm.wav`, `sfx_sting.wav`, `sfx_drone.wav`, `sfx_pickup.wav`) in `resources/neo-seoul/audio/sfx/`. Created review report at `outputs/agy/skills/review.md`.
- Verified: Extended `tests/test_assets.py` to assert companion and enemy skill icons, ran `python -m unittest tests/test_assets.py` and `tests/test_image_assets.py` (both green), and ran `make test` (all 862 tests green).
- Blockers: None.
- Next: Human play-feel sign-off on the generated skill cards and SFX.

## 2026-07-06 — Curated art for 6 opening variants (agy)
- Status: Completed drafting and promoting opening variant images; `make check` / integrity unit tests passed.
- Changed: Generated 6 opening variant images via in-session Imagen (1672x941 PNG format), saved to `outputs/agy/opening-variants/` staging, promoted to `resources/neo-seoul/opening/` (`opening-han.png`, `opening-kai.png`, `opening-lin_yue.png`, `opening-solo.png`, `opening-su_ah.png`, `opening-tae_o.png`). Created review report at `outputs/agy/opening-variants/review.md`.
- Verified: Ran `python -m unittest tests/test_image_assets.py` via virtualenv python (all tests green).
- Blockers: Local live-QA screen task (`[auto:agy]` onboarding screen test) is blocked because local PostgreSQL database is down (Docker daemon is offline, and `infra-up` is forbidden for unattended agent).
- Next: Human play-feel sign-off on the generated opening images, and database/API launch to test the onboarding screens.
