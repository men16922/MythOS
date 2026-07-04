# Project MythOS Next Plan

Last updated: 2026-07-04

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md` (slimmed to human-only items). The full 07-04 bundle — ending arts, Rank scaling, Clues cleanup, Kai recruitment, companion cuts, **defeat-ending-screen fix** — is committed (`89e1935`) and **deployed as Cloud Run rev `mythos-api-00008-7sx`** (`make check` 731 green; AGY render QA + defeat→erasure browser QA done, PROGRESS_LOG 2026-07-04).

- `[/]` **Prompt-layer separation (Foundation)**: Phase 0-4 + node-addressing done. Remaining — `[ ]` Phase 5 system_prompt few-shot example extraction (cache-prefix sensitive, lowest priority).
- `[x]` **Companion equipment**: DONE 2026-07-04 — `equipped_by` wearer (per-wearer slot exclusivity, party-membership validated), ally builds fold worn gear (`_worn_equipment_stats`), `EquipRequest.wearer` + wearer picker UI (player+party select, worn-by label). 743 green. Remaining `[ ]` equip-lang API regression test (low) + `[manual]` live feel.
- `[x]` **Commit follow-up round + redeploy**: DONE — round committed (`1d30aa6`) and Cloud Run now serves rev **`00015-nl5`** (includes the 2026-07-04 image root-cause fix, live-verified). Remaining `[ ]` `[manual]`: human fresh-loop play per the 🔴 checklist; human `git push origin main` (ahead 9).
- `[~]` `[blocked]` **Vertex context caching (measured same-day, externally blocked)**: implicit caching does not fire on 3.5/global (byte-identical 7.6k-token prompt ×3 → cached=0) and explicit caching requires **min 4096 tokens** while our true stable prefix is ~1.1–1.8k (system 1012 tok). Prompt reordered stable-first anyway (harmless, future-proof; committed). Unblock paths: redesign to cache the full directive set (quality risk — selective injection is game logic) or wait for implicit caching on 3.5. Alternatives if 3.5 adopted: per-turn model split (3.5 on key beats only). Detail `docs/plans/2026-07-04-gemini-2.5-vs-3.5-eval.md`. `[manual]` decide 2.5→3.5 on live-play prose value.
- `[ ]` **Kiro lane runtime smoke**: `make overnight-kiro-once` once an `[auto]` item is seeded (lane committed `4ab2c7c`, only `bash -n`/`--check` verified).
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: the 5-beat opening prologue is shared across archetypes (only stat-voices/GM flavor differ). Author per-archetype opening variations (e.g. Data Smuggler wakes mid-deal, Echo Collector hears the echoes first) — directive-layer work (`resources/neo-seoul/directives/opening.md` variants + KO/EN), gated on CBT priorities.
- `[x]` **Lin-yue combat recruitment**: DONE 2026-07-04 — ally kit (`allies.lin_yue`, ranged support/EMP) + side-arc `met_lin_yue` effect + 5 codex-generated combat sprites (RGBA-keyed). Remaining `[manual]`: live-QA her join + battle feel.
- `[x]` **Companion growth (3 channels)**: DONE 2026-07-04 — bond tiers (affection→HP/stats), achievement `allies[].upgrades` (all 6 neo-seoul allies), party-targeted boons ×3 (`companion_growth.py`). CHARACTER-tab companion sheet card (snapshot `companions`, StatBars growth overlay) DONE same day. Remaining: `[ ]` `[manual]` live visual QA + growth balance feel.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43), only WS4 remains

- `[/]` **WS4 image regen-on-reject loop**: `scripts/overnight/image-regen.sh` + `make image-regen` (opt-in, human-launched) — `GEN_ENGINE` (agy|codex) generate → claude vision-judge vs frame bible → codex prompt-refine → FLUX-local fallback → integrity gate. **Live-validated 2026-06-20**: 6 skill icons generated + adopted (5 via agy judge-loop, nanoshield via codex). codex CAN generate (own in-session Imagen/Gemini, `PROMPT.codex.md:23`); `GEN_ENGINE=codex` skips the vision-judge + the orchestrator collects codex output from `~/.codex/generated_images/`. Design `docs/plans/2026-06-20-ws4-image-regen-loop.md`. Remaining: `[ ]` agy→codex content-pipeline (original WS4 broader scope, plan-only).
- `[/]` **WS5 harness hardening (backlog, derived from 2026-06-19 usage report)**: ① **DONE** — `/goal` integration (`run.sh` + plugin `templates/`): `OVERNIGHT_VERIFY_GATE` external re-gate at each commit → phantom-success revert + `gate_exit`/`commit_verified` columns in `status.tsv`; opt-in `OVERNIGHT_GOAL` /goal convergence. Measured phantom detection 0→100% (fault-injection). Design+실측 `docs/plans/2026-06-19-goal-in-overnight-loop.md`. Remaining ② auto morning digest at shutdown (`/overnight-report` is manual) ③ Model B 3-lane concurrent run demonstration ④ runner iter-output cap. Low-impact / already-mitigated, deprioritized. (diagnose-first `/diagnose` + gate-phase applied 2026-06-19.)

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order.
- Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md`.
- After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md`.
- Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

On an **axis separate** from status boxes (`[x]`/`[/]`/`[ ]`/`[~]`), inline tags mark whether the unattended overnight loop (`scripts/overnight/`,
`docs/engineering/mythos/LOOP.md`) can consume an item.

- `[auto]` — only for items verifiable locally/deterministically/offline (`make check` or `make smoke-local`).
  **Must carry a 1-line completion criterion** (prevents scope creep).
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.
- **MythOS live-QA guard (repo-specific, not a tag)** — a commit touching browser-observable UI is auto-screened by AGY (`OVERNIGHT_BROWSER_QA=auto`, stop-on-FAIL); so *objective* UI refactor/codemod/wiring can be `[auto]` (criterion adds "post-commit AGY live-QA not FAIL/NEEDS"), while *subjective* feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §3.4.1 · `VERIFICATION.md` §4.

**Engine lanes (3 engines in parallel — conflict avoidance, design: `docs/engineering/mythos/AGENTIC.md`):** append an engine suffix to `[auto]` to
specify which engine consumes it. Each engine consumes **only its own lane** → two never pick the same item.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- When claude's quota is exhausted, codex consumes the claude lane instead (runner auto-failover, `run.sh`).

## Overnight QA Seed — CBT completeness batch (2026-07-03, Tier 1+2, human-approved)

> Structure/bug/image only (deterministic, `make check`/image-integrity). Narrative QUALITY·emotional immersion·30-60min FEEL stay `[manual]` (morning play-QA). Dep-order within claude lane. Prior seed (archetype-id + stale-note) done → PROGRESS_LOG 2026-07-02.

**CBT completeness batch DONE (2026-07-03 → PROGRESS_LOG, merged locally to `main` at `cf7f57f`, `make check` 657 green):**
- [x] claude 7/7: IX boss-fire fix (`_defer_*_archive`) · pacing guard · anti-repeat · side-anchor mechanism (`attach_side_anchors`) · per-loop variation · side-anchor integrity · golden-path length. All test-backed.
- [x] agy 8/8 scene images (integrity green). Character scenes later **regenerated for portrait consistency via codex Imagen** (se-rin/kai/lin-yue) — interactive.
- [x] codex content (authored **interactively** — unattended-forbidden `[manual]`, codex correctly refused): 9 side_arcs wired (beat/image/related_npcs incl. 3 NEW companion arcs han/su_ah/tae_o + meet art) + 7 side-arc branch Story Bible entries (KO+EN) + doc compression.
- [x] side-arc runtime + prompt lifecycle: deterministic producer/entry effects, no fallback leaks/side chains, context-only route-target preview, typed KO/EN locks for all 9 side scenes, and non-replacement dynamic-growth type sampling (200-seed duplicate titles 21→0). Service integration proves side choice→first-scene directive→state→combat ally (`make check` 657 green).


## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress (current top track. Remaining is mostly `[manual]` human play QA + some `[auto]` QA seed).

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria:

- Within the first 5 minutes, the goal/risk/reason-to-follow-se_rin must be clear.
- Every scene's choices must reveal which of `people / evidence / safety / control` is being chosen.
- Combat must feel like a consequence of pursuit, operation failure, ally protection, and reward — without breaking narrative.
- Codex/Run History/progression must give info and rewards that make the next loop better.
- The ending must make clear what was saved, what was lost, and what carries into the next loop.

Completed (→ COMPLETED_SUMMARY M35–M40, M39): Phase 1–3 (Golden Path 45min·Story-Bible/choice-density·data baseline), P0 (insight meta·reward panel·ambient-combat ease·BGM/se_rin labeling), P1 (route-node map + session memory·Tactical Board legend/inspector·encounter difficulty tuning).

Open work:

### IX Boss Fight — design+art+engine DONE (2026-06-30 → COMPLETED_SUMMARY). Authority `docs/plans/2026-06-30-ix-boss-fight.md`
- `[x]` Climax gate/precedence fix (2026-07-02). **✅ ROOT CAUSE FOUND + FIXED 2026-07-03 (`make check` 667):** the boss-not-firing was NOT tension-archive (that was the symptom) — a turn-5 `patrol_ambush` left `_combat.active=true` (zombie) kept `is_active` True, so the `not is_active` launch guard silently skipped the IX climax at the boss node; tension then auto-archived unguarded. Fixed: `choose`/`stream_choose` re-sync to a live fight instead of orphaning it (`_redirect_to_active_combat`) + route-node climax supersedes a stale `_combat` (`_without_combat_state`) + 2 regression tests. Live cloud API restarted. Remaining: human fresh-loop live-QA to confirm the fight fires end-to-end (the earlier dead loop is `ended`).
- `[x]` CBT feedback: #1 UI accent hierarchy (`6afa6d9`) + combat-console overlap fix (`52f7aa1`) + KO-toggle label — DONE 2026-07-02..03.
- `[ ]` `[manual]` Pre-CBT follow-ups: glass-library EN glossary (hold); dev-log ~32 KO literals (dev-only). Human live play → `docs/test/neo_seoul_live_qa.md`. (bug#4 fixed `3b7d26b`.)

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` Route lifecycle live sign-off after deploy: Night Market deterministically unlocks `Restarting Kai`; rapid/repeated choice input never shows `choice not found`; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel). **Overnight Seed B targets D structurally.**
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

## Post-local — GCP 클로즈베타 (DEPLOYED LIVE)
- `[x]` **🚀 DEPLOYED LIVE (2026-06-29, rev `mythos-api-00003-fzb`)** — `https://mythos-api-1004528040791.us-central1.run.app` (Cloud Run us-central1 + Neon PG18 + Vertex/GCS), EN default + admin key(uncapped) + tester cap 10, keys `INVITE_KEY.md`. CBT 온보딩 UX(Option B 신원·게임식 Save/Load·초대 게이트)·EN end-to-end localization·Vertex 어댑터 3종·cost gating 전부 **DONE** → 상세 `COMPLETED_SUMMARY` M50 + `PROGRESS_LOG`(2026-06-29..30)·archive. **NEXT = human/비차단**: `git push origin main` · 결제 예산 알림 + Vertex 일일 쿼터(콘솔) · 피드백 Google Form → 종료화면 · `?invite=` 링크 배포 → r/playtesters(모집물 `CBT_TEASER.md`/`CBT_RECRUIT_POST.md`) · 오버나이트로 IX 보스(위) 소비 · (선택) Neon TRUNCATE 테스트데이터 리셋. 잔여 EN: K9 자연엔딩 스샷(사람 플레이), glass-library glossary, session `_outcome`. 런북 `docs/cloud/DEPLOY.md` §10. 전략 `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`.

## Hold — Scenario Expansion / Glass Library

Status: `[~]` progression/presentation parity + Story Bible 17 entries done (M38). Further extension held until after Neo-Seoul satisfaction improvements.

- `[ ]` `glass-library` main_arcs/endings·reward meta expansion (now main_arcs 4 / endings 4) + combat art/skill depth (now 5 skills, 4 enemies; new action sheets are follow-ups).

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; hooks useInGameEpiphany/useCombatBoard/useTypewriter/useGameSocket/useCombatCinemaQueue/useSceneVisuals/useSessionLifecycle/useDataLoaders/useCombatRest/useSessionControls/useSnapshotReceiver/useNarrativeStream/useKeyboardChoice + shared `archetypes.ts`). Per-slice detail: `bin/docs/archive/progress-2026-06.md` + git. **slice 14 (`useViewModels`, view-model `useMemo` cluster) was committed green (`d7b3b35`) then HUMAN-REVERTED 8s later (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; needed a 12-field props object = net-negative). `[blocked]` 2026-06-28 (2nd encounter, twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- AGY live-QA findings (from `/overnight-report` triage of `logs/qa-findings.md`): None open (2026-06-21: 2 fixed — name-input `name` + favicon 204).
