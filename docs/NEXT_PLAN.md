# Project MythOS Next Plan

Last updated: 2026-07-02

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

## Overnight QA Seed — CBT completeness batch (2026-07-03, Tier 1+2, human-approved)

> Structure/bug/image only (deterministic, `make check`/image-integrity). Narrative QUALITY·emotional immersion·30-60min FEEL stay `[manual]` (morning play-QA). Dep-order within claude lane. Prior seed (archetype-id + stale-note) done → PROGRESS_LOG 2026-07-02.

- [ ] [auto:claude] Fix IX boss combat not firing at the boss node (live 2026-07-03: tension-100 auto-archive preempts the fight; only patrol_ambush ran, IX never started). Completion criterion: entering the boss route node begins ix_confrontation combat before/over the same-turn auto-archive; regression test; make check green.
- [ ] [auto:claude] Climax reachability pacing guard. Completion criterion: cap per-turn tension climb / raise the archive trigger so under a fixed choice-seed the golden path reaches the boss node without a prior tension>=90 auto-archive; test_route_integrity invariant; make check green.
- [ ] [auto:claude] Consecutive-scene anti-repeat invariant. Completion criterion: regression test asserts consecutive main scenes differ in route node/location under fixed seed; make check green.
- [ ] [auto:claude] Side-anchor mechanism: wire scenario side_arcs into the route as seed-selected optional side-anchor nodes. Completion criterion: a side_arc node is reachable in the route DAG; new test; make check green.
- [ ] [auto:claude] Per-loop variation. Completion criterion: seed-based selection so >=5 distinct loop seeds yield >=3 distinct visited-node/character sets; test; make check green.
- [ ] [auto:claude] Content-integrity for side-anchor data. Completion criterion: extend test_content_integrity/test_route_integrity so every side-anchor beat/image/encounter/npc ref resolves; make check green.
- [ ] [auto:claude] Golden-path length guard. Completion criterion: test asserts >=12 narrative beats reachable before an ending on the golden path (30-60min proxy); make check green.
- [ ] [auto:codex] story_bible entries for the 6 side_arcs. Completion criterion: 6 new bible entries (valid flags/related_npcs/unlocks); make check green.
- [ ] [auto:codex] story_bible entries for character meet scenes (kai/lin_yue/tae_o/han/su_ah). Completion criterion: 5 new bible entries; make check green.
- [ ] [auto:codex] scenario.json: structure the 6 side_arcs as side-anchor data (id/beat/gate/perspectives/image). Completion criterion: data present + integrity passes; make check green.
- [ ] [auto:codex] Per-character meet-node data (kai/lin_yue/tae_o/han/su_ah). Completion criterion: data + integrity; make check green.
- [ ] [auto:codex] Directive *.md files for the new side-anchor scenes. Completion criterion: directives/*.md present + loader resolves; make check green.
- [ ] [auto:codex] Dynamic-node title/type variety pool for per-loop differentiation. Completion criterion: pool entries + integrity; make check green.
- [ ] [auto:codex] Doc compression (NEXT_PLAN/COMPLETED_SUMMARY line budgets). Completion criterion: make check-doc-budget green.
- [x] [auto:agy] Scene image: side_arc 버려진 자들의 신호. Completion criterion: scenes/abandoned_signal.png + image integrity gate.
- [x] [auto:agy] Scene image: side_arc 관리망의 유령. Completion criterion: scenes/control_grid_ghost.png + image integrity gate.
- [x] [auto:agy] Scene image: side_arc 린위에의 은밀한 의뢰. Completion criterion: image integrity gate.
- [ ] [auto:agy] Scene image: side_arc 물거미의 빚. Completion criterion: image integrity gate.
- [ ] [auto:agy] Scene image: side_arc 명단의 빈칸. Completion criterion: image integrity gate.
- [ ] [auto:agy] Scene image: side_arc 카이의 꿈 단편. Completion criterion: image integrity gate.
- [ ] [auto:agy] Dedicated scene art: data_incinerator + subway_control_hub (replace concept/ reuse). Completion criterion: 2 scenes/*.png + integrity gate.
- [ ] [auto:agy] Character meet-scene images: kai + lin_yue. Completion criterion: 2 images + integrity gate.

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
- `[x]` Climax gate/precedence fix (2026-07-02). **⚠️ LIVE re-finding 2026-07-03: at the boss node the fight still doesn't start — tension-100 auto-archive preempts it (only patrol_ambush ran). Targeted by Overnight Seed A/B above.**
- `[x]` CBT feedback: #1 UI accent hierarchy (`6afa6d9`) + combat-console overlap fix (`52f7aa1`) + KO-toggle label — DONE 2026-07-02..03.
- `[ ]` `[manual]` Pre-CBT follow-ups: glass-library EN glossary (hold); dev-log ~32 KO literals (dev-only). Human live play → `docs/test/neo_seoul_live_qa.md`. (bug#4 fixed `3b7d26b`.)

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel). **Overnight Seed B targets D structurally.**
- `[ ]` #4 map in-layer choice destinations · #6 skill-tree RPG node graph (frontend) · opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

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
