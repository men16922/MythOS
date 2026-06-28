# Project MythOS Next Plan

Last updated: 2026-06-21

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Companion affection + cutscene unlock + prompt-layer separation (current top priority)

Authority design: `docs/plans/2026-06-16-companion-affection-cutscenes.md`. Baseline: prompt-layer Phase 0-2 done (commits `751a37b`/`cfe6a2d`/`ed37c39`/`7fd91e5`, `docs/PROMPT_LAYER.md`).
Key finding: relationship deltas (`scenario.json` perspective/choice `effect.relationship`) were **authored but ignored at runtime (dead data)** — `route_runtime.py:96` applied only flags.

- `[/]` **Prompt-layer separation (Foundation)**: Phase 0-4 + node-addressing done. Remaining — `[ ]` Phase 5 system_prompt few-shot example extraction (cache-prefix sensitive, lowest priority).
- `[/]` **P1 cutscene unlock**: backend and frontend wiring/QA done. Remaining: `[ ]` in-game cutscene node appearance (P1-a, directive injection).
- `[/]` `[manual]` **P2 Se-rin cutscene**: `se_rin.md` 2 cuts authored. Remaining: `[ ]` adopt 2 dedicated arts from `outputs/experiments/adult/serin/imagegen/*.png` (IMAGE_POLICY) + image swap + live QA.
- `[ ]` `[manual]` **P3 companion expansion**: kai/lin_yue/tae_o/han/su_a cutscenes + promote 6 `side_arcs` to route side-anchors (WS-B track 2).

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

## Overnight QA Seed — automated content/balance integrity

> "Does it not break" (bot, deterministic) content/balance invariants. green=locked, red=Blocker surface. offline·`make check`.

- [x] [auto:claude] Content-integrity invariants for the 2026-06-27 archetype-id migration. Completion criterion: extend tests/test_content_integrity.py — (C1) every archetypes[].id unique & non-empty AND combat.archetype_loadout/archetype_base_skills key sets each equal the archetype id set (neo-seoul + glass-library); (C4) neo-seoul characters[].id unique & non-empty; (C2) every neo-seoul combat skill id has a skills/<id>.png icon (drop the test_assets.py skill-icon exclusion, neo-seoul only); make check green.
- [ ] [auto:codex] Clean up stale test_assets.py skill exclusion note in STATUS.md. Completion criterion: Remove the stale statement about test_assets.py skill icon exclusion in docs/STATUS.md.
- [ ] [auto:codex] Compress completed tracks in NEXT_PLAN.md to reclaim line budget. Completion criterion: Compress completed details (e.g., completed WS parts and Neo-Seoul playability phases) into docs/COMPLETED_SUMMARY.md to keep the line count within the 120-line cap.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress (current top track. Remaining is mostly `[manual]` human play QA + some `[auto]` QA seed).

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria:

- Within the first 5 minutes, the goal/risk/reason-to-follow-se_rin must be clear.
- Every scene's choices must reveal which of `people / evidence / safety / control` is being chosen.
- Combat must feel like a consequence of pursuit, operation failure, ally protection, and reward — without breaking narrative.
- Codex/Run History/progression must give info and rewards that make the next loop better.
- The ending must make clear what was saved, what was lost, and what carries into the next loop.

Completed (summary): Phase 1 (Golden Path 45 min + fail/bypass Path + QA rubric → `docs/scenarios/01-neo-seoul-connect.md`),
Phase 2 (Story Bible/choice density + `scenario.json` playability meta), Phase 3 data baseline (encounter learning_goal/reward_intent).
P0 (`encounter_reward.insight` meta applied, combat-result panel reward display, early forced ambient combat eased, BGM/se_rin labeling Live QA, encounter reward baseline update).
P1 operation map route-node-ification + session memory (→ COMPLETED_SUMMARY M39), Tactical Board legend/tile inspector/learning-goal banner, encounter difficulty tuning (per-spawn `overrides` + per-learning-goal numerics).

Open work:

### Live QA narrative improvements (2026-06-19, authority `docs/test/neo_seoul_live_qa.md`)

Narrative QA #1 and #3 done.
- `[/]` `[manual]` **#2 ending narrativization + #5 post-combat callback**: code merged, unit tests locked. Remaining = live feel.
- `[x]` **Automatic AGY QA in existing overnight (WS-A..F DONE)**: candidate filter + AGY 2-stage decision + dedup ledger + post-commit/DONE-drain hooks in `run.sh`, now **default-on** (`OVERNIGHT_BROWSER_QA=auto`; `=0` kill-switch); `status.sh`/overnight-report surface QA; standalone `live-qa-agy-probe` removed. Verified: 502 tests + one real integrated run (`20260621-113313-drain`, Chrome DevTools, PASS_CANDIDATE). Guide `docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21.
- `[ ]` **#4 map in-layer choice destinations** · **#6 skill-tree RPG node graph** (separate track, frontend; analysis done).

### Operation map dynamic routing — done (foundation, detail in COMPLETED_SUMMARY/archive)

- `[/]` Follow-up: dynamic node title variety/dedup done. Remaining: inject current node into visual prompt, consider gradual conversion of static scenarios too.

### Opening sequence consistency (live_qa §1.1) — done (foundation), montage follow-up

- `[ ]` Pre-game montage repositioning: move the pursuit cut to a later beat to ease the time-spoiler where the montage runs ahead of in-game awakening.
- `[ ]` Full 4-turn human play feel (awakening→arrival→contact→pursuit, image transition·se_rin portrait sync).
- `[ ]` Minor: turn1 "corridor" word leaks once·title "Changed " prefix artifact, intro bullet chips (`·`) CSS polish.

### Human play QA findings (live_qa §0/§1-6) — A/B/C/E/G done, F·D remaining

- `[/]` **F streaming speed**: root cause RAM shortage identified + dual-model narrative (8B story → 3b parser) wired·context 8192 cap applied. Remaining: with user RAM freed, approach ~13s, actual multi-turn live feel. Design `bin/docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
- `[/]` **D narrative repetition**: synopsis truncation-drop fix (`session_synopsis` dedicated field fully rendered) + scene length/prefill cache fix. Remaining: actual multi-turn live feel.

- `[/]` P0-P2 mostly done (detail COMPLETED_SUMMARY M35-M40·PROGRESS archive; live LLM 14-turn QA pass·F1 repetition-mitigation·anti-stickiness·Tactical Board zoom·recovery/consumable/equipment·memory-constellation reorg·objective/stakes·choice-result summary). **Remaining**: F2 combat-frequency/streak tuning (observe) · Tactical Board touch pin lock · consumable/equipment balance · act-gate required-beat enforcement + inject current node into visual prompt · memory constellation tab subdivision · expand choice-result with relationship/Codex/Shard · objective act-transition gate.
- `[ ]` P2 archetype meaning strengthening: unlock-milestone limits + differentiate opening/start-location/skills/items/NPC reactions.
- `[manual]` Codex Skill status wording (first-player feel). Button state logic (`deriveSkillAction`) is done.
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX integration finish. `[ ]` Phase 5 — Neo-Seoul RC: manual QA (`docs/test/neo_seoul_live_qa.md`) + auto regression.

## Post-local — 글로벌(영어) → GCP 클로즈베타 (neo-seoul live-QA A·F 사인오프 후)
- `[/]` **① EN/KO 언어지원(영어 default)** = LLM 영어 생성 + 저작물(directives/story_bible/fallbacks/scenario sidecar) EN + UI i18n **— DONE (`c02c41b`, both scenarios fully EN); 남은 것은 default flip(KO live-QA 사인오프 게이트)뿐**. 상세 `docs/plans/2026-06-27-en-ko-localization.md`. → **② GCP 클로즈베타**: **Vertex 어댑터 3종 코드 DONE + gate-verified** (`[/]`, 584 green) — narrative Gemini `JSONProvider`(`gemini_provider.py`, `MYTHOS_NARRATIVE_PROVIDER`, controlled gen + `stream`), Vertex Imagen `VisualProvider` + GCS `StorageAdapter`(`visual_service.py`, `MYTHOS_VISUAL_PROVIDER`/`MYTHOS_STORAGE_BACKEND`); fake-client 테스트(`test_gemini_provider`19+`test_vertex_visual`13), `[gemini]`/`[gcs]`/`[gcp]` extras, `.env.example`(SDK-native env명). 남은 것 = `[manual]` 실제 Vertex 프로젝트 live-test(GCP 서비스계정/ADC; `.env`에 프로젝트 기입됨) + `[manual]` Cloud Run 컨테이너화·WS 검증 + DB 결정(GCP_PLAN §8) → 최소기능 배포 → **r/playtesters 5~10명 모집** → 핵심루프 개선 → **r/aigamedev 결과·아키텍처 공유** → 공개베타. 전략 `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`(+`GCP_PLAN`/`CAREER_STRATEGY`). 제품 정체성=Vertex/Gemini AI 게임(로컬 LLM=dev only; `fully local` 프레이밍 폐기).

## Hold — Scenario Expansion / Glass Library

Status: `[~]` progression/presentation parity + Story Bible 17 entries done (M38). Further extension held until after Neo-Seoul satisfaction improvements.

- `[ ]` `glass-library` main_arcs/endings·reward meta expansion (now main_arcs 4 / endings 4) + combat art/skill depth (now 5 skills, 4 enemies; new action sheets are follow-ups).

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; hooks useInGameEpiphany/useCombatBoard/useTypewriter/useGameSocket/useCombatCinemaQueue/useSceneVisuals/useSessionLifecycle/useDataLoaders/useCombatRest/useSessionControls/useSnapshotReceiver/useNarrativeStream/useKeyboardChoice + shared `archetypes.ts`). Per-slice detail: `bin/docs/archive/progress-2026-06.md` + git. **slice 14 (`useViewModels`, view-model `useMemo` cluster) was committed green (`d7b3b35`) then HUMAN-REVERTED 8s later (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; needed a 12-field props object = net-negative). `[blocked]` 2026-06-28 (2nd encounter, twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- AGY live-QA findings (from `/overnight-report` triage of `logs/qa-findings.md`): None open (2026-06-21: 2 fixed — name-input `name` + favicon 204).
