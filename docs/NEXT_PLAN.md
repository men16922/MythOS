# Project MythOS Next Plan

Last updated: 2026-07-06

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. Cloud Run rev `00019-jf6` serves the dieted full-3.5 stack; completed 07-04/05 gameplay, companion, cloud-runtime, model-routing, and Kiro work is summarized in `docs/COMPLETED_SUMMARY.md` M55-M56.

- `[ ]` `[manual]` **Full-3.5 live sign-off**: fresh-loop prose/tone/length verdict, Audrey EN coherence retest, IX/companion/equipment/growth feel, authenticated production turn, and human `git push`. Objective save/load/map/idempotency/support/loot/equip checks already passed via three AGY runs.
- `[ ]` `[manual]` **Teaser #2 (DEFERRED 2026-07-05 — next plan)**: montage format too similar to teaser #1; decided
  direction = (A) "uncut single-turn" format now-ish or (B) montage after P1 + archetype openings + ending art
  (visible deltas). Metadata drafts ready (`docs/cbt/CBT_TEASER.md`/`.ko.md`); re-scope when picked up.
- `[ ]` `[manual]` **Key-beat hybrid enablement + A/B verdict (after full-3.5 sign-off)**: deploy `MODEL=gemini-2.5-flash` + `GEMINI_MODEL_KEYBEAT=gemini-3.5-flash`; verify opening/anchor/cutscene/boss-buildup/ending route to 3.5 and normal turns to 2.5; compare matched full loops for quality, repetition/continuity, state/name/language errors, p50/p95 latency, and cost. Done = documented keep/rollback decision; rollback restores full `MODEL=gemini-3.5-flash` with key-beat unset.
- `[ ]` **CBT P1 (feedback #1 Audrey + #2 owner 7-loop self-play) — design snapshot DONE
  (`docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`), tracks in priority order**:
  - `[x]` **P1-A onboarding+skill legibility (DONE 2026-07-05; live-QA PASS ×2 07-06; action-bar glyphs = by
    design)** — detail archive/`PROGRESS_LOG.md`.
  - `[x]` **P1-B replay variety (DONE 2026-07-05; variant art ×6 `d661f44` + per-variant boot intro `ca5c835`
    07-06)** — detail archive/`PROGRESS_LOG.md`. Remaining:
    `[ ]` `[auto:codex]` **variant intro shot 02 ×6** (opening style spec + each variant's directive beat; append to
    `session_intro_variants[v].cinematic_shots` + EN overlay text; done = `make check` green incl. `test_opening_variant_intro`).
    `[ ]` `[auto:codex]` **variant intro shot 03 ×6** (same spec + criterion as shot 02).
    `[ ]` `[manual]` in-game feel review of the 6 variant intros/cuts.
  - `[ ]` **Variant-ROUTED opening (user-directed 2026-07-06; live evidence: variant evaporates at turn 1.
    Design = `docs/plans/2026-07-06-variant-routed-opening.md`)**:
    `[x]` `[auto:claude]` **S1 anchor variantization (DONE 2026-07-07 overnight)** (plan §2.1: layer-0 anchor
    `variants` field overrides resolved at route materialization + new beat registration + neutral
    perspective-summary fallback). `make check` 880 green + 15 tests + loop-1/default byte-identical.
    `[x]` `[auto:claude]` **S2 chapter-gate variant goal (DONE 2026-07-07 overnight)** (`player_goal_variants`
    resolution in `_chapter_goal` via `_opening_variant`, fallback preserved + content guard). `make check`
    890 green + 10 tests; copy lands with S4.
    `[x]` `[auto:claude]` **S3 early se_rin flag clamp (DONE 2026-07-07 overnight)** (validator `clamped_delta`
    strip on variant loops turn ≤3). `make check` 899 green + 9 tests.
    S4 `[manual]` directive windows 0→3 + 6종 copy tone verdict (drafts in plan §4).
  - `[x]` **P1-C density/continuity + P1-D/E identity/arc (DONE 2026-07-05; icons ×10 + SFX ×4 `b095446`
    07-06)** — detail archive/`PROGRESS_LOG.md`.
  - `[ ]` `[manual]` decisions: G2 twist tone review (3 drafts in scenario.json `twist_bank`) ·
    in-layer pacing knob (C2) · overload-strike range balance (D5) · EN fresh-loop coherence retest.
- `[x]` **Save-slot overwrite + delete (DONE 2026-07-05)** — 남음 `[manual]` 라이브 체감. 상세 archive/progress-2026-07.
- `[/]` **Prompt-layer separation**: Phase 0-4 + node-addressing done. Remaining `[ ]` Phase 5 few-shot extraction (lowest priority).
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: the 5-beat opening prologue is shared across archetypes (only stat-voices/GM flavor differ). Author per-archetype opening variations (e.g. Data Smuggler wakes mid-deal, Echo Collector hears the echoes first) — directive-layer work (`resources/neo-seoul/directives/opening.md` variants + KO/EN), gated on CBT priorities.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43), only WS4 remains

- `[/]` **WS4 content pipeline**: image regen/judge loop is live-validated; remaining `[ ]` agy→codex authored-content pipeline, plan-only. Design `docs/plans/2026-06-20-ws4-image-regen-loop.md`; completed foundation → `COMPLETED_SUMMARY.md` M47.
- `[/]` **WS5 harness hardening (deprioritized)**: `/goal` + external re-gate is complete. Remaining `[ ]` automatic shutdown digest, `[ ]` Model-B 3-lane demonstration, `[ ]` runner iteration-output cap. Design `docs/plans/2026-06-19-goal-in-overnight-loop.md`.

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order.
- Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md`.
- After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md`.
- Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

Inline tags (separate axis from `[x]`/`[/]`/`[ ]`/`[~]`) mark unattended-loop consumability (`scripts/overnight/`, `docs/engineering/mythos/LOOP.md`).

- `[auto]` — only locally/deterministically/offline verifiable (`make check`/`make smoke-local`); **must carry a 1-line completion criterion**.
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.
- **MythOS live-QA guard (repo-specific, not a tag)** — a commit touching browser-observable UI is auto-screened by AGY (`OVERNIGHT_BROWSER_QA=auto`, stop-on-FAIL); so *objective* UI refactor/codemod/wiring can be `[auto]` (criterion adds "post-commit AGY live-QA not FAIL/NEEDS"), while *subjective* feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §3.4.1 · `VERIFICATION.md` §4.

**Engine lanes** (design `docs/engineering/mythos/AGENTIC.md`): engine suffix on `[auto]`; each engine consumes only its own lane.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- When claude's quota is exhausted, codex consumes the claude lane instead (runner auto-failover, `run.sh`).

## Overnight QA Seed (2026-07-07, user-approved)

- `[ ]` `[auto:claude]` **SFX reference↔file integrity test**: every `sfx_*` id referenced in
  `resources/neo-seoul/scenario.json` / `serializers.py` cues / SPA sources maps to a real file in
  `resources/neo-seoul/audio/sfx/` with RIFF/WAV magic bytes; guard-the-guard ≥8 ids scanned.
  Completion criterion: new test runs inside `make check`, green.
- `[ ]` `[auto:claude]` **lint/type-noise cleanup**: fix the deprecated `@asynccontextmanager` return
  annotation in `src/mythos_api/app.py` + remove unused loop variables in `tests/test_assets.py`.
  Completion criterion: `make check` green, zero behavior change (no test deltas).
- `[ ]` `[auto:codex]` **doc migration + M57**: move completed `docs/plans/*` (implemented plans only) to
  `bin/docs/plans/`, add `COMPLETED_SUMMARY.md` M57 (2026-07-06 overnight: variant art/icons/SFX/live-QA +
  per-variant boot intro). Completion criterion: `make check-doc-budget` green + `rg` sweep shows no broken links.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress behind Priority 0; remaining work is mostly `[manual]` human play feel.

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria (compressed): 5-min goal/risk clarity · choices reveal the value axis · combat = consequence of
pursuit/rescue/protection · progression informs the next loop · endings state saved/lost/carried.

Open work:

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` IX and route lifecycle live feel: boss fires end-to-end; Night Market→Kai feels causal; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel).
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

## Hold — Scenario Expansion / Glass Library

- `[~]` parity + Story Bible done (M38); held until Neo-Seoul satisfaction. `[ ]` main_arcs/endings·reward meta + combat art/skill depth expansion.

## Maintenance

- `[x]` postgres stale-conn retry + placeholder i18n race (DONE `08f764f`; i18n 라이브 AGY 확인 07-06) — 상세 archive.
- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; hooks useInGameEpiphany/useCombatBoard/useTypewriter/useGameSocket/useCombatCinemaQueue/useSceneVisuals/useSessionLifecycle/useDataLoaders/useCombatRest/useSessionControls/useSnapshotReceiver/useNarrativeStream/useKeyboardChoice + shared `archetypes.ts`). Per-slice detail: `bin/docs/archive/progress-2026-06.md` + git. **slice 14 (`useViewModels`, view-model `useMemo` cluster) was committed green (`d7b3b35`) then HUMAN-REVERTED 8s later (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; needed a 12-field props object = net-negative). `[blocked]` 2026-06-28 (2nd encounter, twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- AGY live-QA findings (from `/overnight-report` triage of `logs/qa-findings.md`): None open (2026-06-21: 2 fixed — name-input `name` + favicon 204).
- **2026-07-05 objective-QA 파생 트리아지 (human decision needed, evidence `outputs/live-qa/objC-063151`)**:
  - `[ ]` **ally-writeback promotion**: `_finish_party_state`가 모든 ally 전투원을 영구 파티로 승격(설계 문서와
    상충) — 의도면 DESIGN.md 명문화, 버그면 `is_party_member`만 writeback. 사람 판정 필요.
  - `[x]` combat simulator admin-key 게이팅 (DONE 2026-07-05) — 잔여: 시뮬산 활성 루프 캡 정리는 요청 시 DB 작업.
