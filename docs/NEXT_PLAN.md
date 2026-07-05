# Project MythOS Next Plan

Last updated: 2026-07-05

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. Cloud Run rev `00019-jf6` serves the dieted full-3.5 stack; completed 07-04/05 gameplay, companion, cloud-runtime, model-routing, and Kiro work is summarized in `docs/COMPLETED_SUMMARY.md` M55-M56.

- `[ ]` `[manual]` **Full-3.5 live sign-off**: fresh-loop prose/tone/length verdict, Audrey EN coherence retest, IX/companion/equipment/growth feel, authenticated production turn, and human `git push`. Objective save/load/map/idempotency/support/loot/equip checks already passed via three AGY runs.
- `[ ]` `[manual]` **Key-beat hybrid enablement + A/B verdict (after full-3.5 sign-off)**: deploy `MODEL=gemini-2.5-flash` + `GEMINI_MODEL_KEYBEAT=gemini-3.5-flash`; verify opening/anchor/cutscene/boss-buildup/ending route to 3.5 and normal turns to 2.5; compare matched full loops for quality, repetition/continuity, state/name/language errors, p50/p95 latency, and cost. Done = documented keep/rollback decision; rollback restores full `MODEL=gemini-3.5-flash` with key-beat unset.
- `[ ]` **CBT feedback #1 (Audrey, EN) — first-session comprehension track (2026-07-05, triage `docs/cbt/CBT_FEEDBACK.md`)**: praise = visuals/theming/intro; all 4 criticisms = onboarding, not depth. Sub-items: `[ ]` combat entry telegraph (risk badge on combat-leading choices + 1-beat transition; boss buildup generalized) · `[ ]` first-combat interactive tutorial overlay (move→attack→skill→guard, one-time) · `[ ]` progressive UI disclosure on first loop (turn 0-2 story+choices+gauges only; map/character panel unlock on first use; DEV LOG collapsed) · `[ ]` `[manual]` EN fresh-loop retest of story coherence on the 3.5+diet stack (the "disjointed story" complaint predates the rule-truncation fix — confirm residue before more prompt work). UI sub-items become `[auto]` after a design snapshot.
- `[x]` **Save-slot overwrite + delete (user request, DONE 2026-07-05)**: 수동 슬롯 덮어쓰기(같은 slot_id 재기록,
  autosave 북마크는 거부) + 슬롯 삭제(수동/autosave 모두, 2-클릭 확인 UI) — 스토어 `delete_player_memories`부터
  SAVE 모달 버튼까지 수직 구현, 유닛테스트 6종. 남음 `[manual]`: 라이브 체감 (덮어쓰기/삭제 후 목록 갱신).
- `[/]` **Prompt-layer separation**: Phase 0-4 + node-addressing done. Remaining `[ ]` Phase 5 system-prompt few-shot extraction (cache-prefix sensitive, lowest priority).
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

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress behind Priority 0; remaining work is mostly `[manual]` human play feel.

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria:

- Within the first 5 minutes, the goal/risk/reason-to-follow-se_rin must be clear.
- Every scene's choices must reveal which of `people / evidence / safety / control` is being chosen.
- Combat must feel like a consequence of pursuit, operation failure, ally protection, and reward — without breaking narrative.
- Codex/Run History/progression must give info and rewards that make the next loop better.
- The ending must make clear what was saved, what was lost, and what carries into the next loop.

Open work:

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` IX and route lifecycle live feel: boss fires end-to-end; Night Market→Kai feels causal; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel).
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

## Hold — Scenario Expansion / Glass Library

Status: `[~]` progression/presentation parity + Story Bible 17 entries done (M38). Further extension held until after Neo-Seoul satisfaction improvements.

- `[ ]` `glass-library` main_arcs/endings·reward meta expansion (now main_arcs 4 / endings 4) + combat art/skill depth (now 5 skills, 4 enemies; new action sheets are follow-ups).

## Maintenance

- `[ ]` `[auto:claude]` **postgres_store stale-connection retry**: 라이브 500 (2026-07-05, `/auth/connect`) — Neon이
  유휴 연결을 `AdminShutdown`("terminating connection due to administrator command")으로 끊은 뒤 앱이 풀의 죽은
  연결을 재사용. `_execute`류에 연결-종료 계열(psycopg `OperationalError`/`AdminShutdown`) 1회 재연결-재시도.
  Done = 재시도 unit test + `make check` green.
- `[ ]` `[auto:claude]` **image-placeholder i18n init race**: KO 세션에서 이미지 패널 기본 안내문이 영어로 노출
  (라이브 2026-07-05). `useSceneVisuals`의 `imagePlaceholderText` `useState` 초기값이 마운트 시점(언어 적용 전)에
  1회 고정되어 언어 전환을 못 따라감. Done = lang-반응형 초기화 + `make check` green + AGY live-QA not FAIL/NEEDS.
- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; hooks useInGameEpiphany/useCombatBoard/useTypewriter/useGameSocket/useCombatCinemaQueue/useSceneVisuals/useSessionLifecycle/useDataLoaders/useCombatRest/useSessionControls/useSnapshotReceiver/useNarrativeStream/useKeyboardChoice + shared `archetypes.ts`). Per-slice detail: `bin/docs/archive/progress-2026-06.md` + git. **slice 14 (`useViewModels`, view-model `useMemo` cluster) was committed green (`d7b3b35`) then HUMAN-REVERTED 8s later (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; needed a 12-field props object = net-negative). `[blocked]` 2026-06-28 (2nd encounter, twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- AGY live-QA findings (from `/overnight-report` triage of `logs/qa-findings.md`): None open (2026-06-21: 2 fixed — name-input `name` + favicon 204).
- **2026-07-05 objective-QA 파생 트리아지 (human decision needed, evidence `outputs/live-qa/objC-063151`)**:
  - `[ ]` **ally-writeback promotion**: `CombatService._finish_party_state`가 전투 커밋 때 **모든 ally 진영
    전투원을 `_party.members`에 영구 기록** — 플래그로만 참전한 AI 아군(예: met_lin_yue 린위에)이 한 판 함께
    싸우면 이후 영구 플레이어-조작 파티가 됨. 설계 문서("flag-unlocked non-party allies stay AI")와 상충.
    의도("싸우면 영입")인지 버그인지 사람 판정 → 의도면 DESIGN.md에 명문화, 버그면 `is_party_member`만 writeback.
  - `[x]` **combat simulator CBT 노출 → A안(admin-key 게이팅)으로 결정·구현 (2026-07-05)**: verify-invite가
    `gated` 플래그를 내려주고, SPA는 `isAdmin || !gated`일 때만 부트 시뮬레이터 렌더 — 게이트 켜진 CBT에서
    테스터는 못 보고(캡 보호 + 부트 화면 경량화), keyless 로컬 dev/AGY QA 경로는 유지. 회귀 테스트 포함.
    잔여: 기존 시뮬산 활성 루프들(예: d1b0da3e 계정 5개)은 캡에 남아 있음 — 정리 원하면 DB 작업 별도.
