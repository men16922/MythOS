# Project MythOS Next Plan

Last updated: 2026-07-14

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. **Latest deploy = `mythos-api-00063-hpz` (2026-07-14, owner-run; 100% traffic; smoke health 200 + dock rules verified in served CSS)** — adds the PORTRAIT ACTION DOCK (fixed bottom console sheet + chrome diet; owner pain "스킬/공격하려면 자꾸 스크롤") and the legend/boon layering fixes, on top of 00062's turn-order strip and 00061's owner-QA-passed bundle. Next required action: owner REAL-DEVICE portrait combat pass — dock reachability/height(38dvh)/URL-bar 100dvh/notch + strip 가독성.

### CBT Teaser V2 — production lane (highest immediate promo priority)
- `[x]` **Teaser ASSEMBLED (session #17)** — `docs/cbt/v2/final/mythos_teaser_v2.mp4` (1:49, 1080p30, H.264+AAC): hook→landmarks→choice/stream→map→companions→combat(new layout)→consequence→Veo IX climax→endings→CTA. 10 narrations + BGM v1, onset-verified. Build system `scripts/cbt/build_teaser.py`.
- `[x]` `[manual]` **PUBLISHED 2026-07-14 (owner)** — owner approved and uploaded `final/mythos_teaser_v2.mp4`. Teaser V2 lane CLOSED; media stays out of git (YouTube-distributed). Revision loop remains available via `scripts/cbt/build_teaser.py` if feedback warrants a V2.1.

### Combat overhaul arc + enemy roster + balance — COMPLETE → `COMPLETED_SUMMARY.md` **M59-M60**
- `[x]` 2026-07-11..14 arc fully closed and compressed: M59 (telegraph→control→status→visuals) + M60 (enemy roster overhaul: 텔레그래프 오클루전·스폰 다양성·적 아트 20/20 codex 재생성 · balance verdicts: cap 분리/보스 기절 저항/냉각 2 · 2-티어 slice 1-4 완결 · 포트레이트 액션 독). **Owner QA PASS on `00061-dzr` 2026-07-14.** Detail: M59-M60 + dated plans.
- **Open items only below.**
- `[ ]` `[manual]` **실기기 포트레이트 전투 패스 (`00063-hpz`)** — 액션 독 도달성 · 38dvh 높이감 · URL바/노치 · 턴 순서 스트립 가독성. (에뮬레이터 PASS, 실기기 미검증 — 기존 standing gap.)

### Narrative clarity audit follow-ups (2026-07-10, 4-lane audit)
- `[ ]` `[manual]` **Track 4 balance playtest** — play-style consequence system now ON (`advance_route` axis tally → intent flag @ threshold 2); play two loops in different styles, confirm story/results diverge + balance OK, tune threshold/mapping if needed. **B4 stat-tag** decision rides along (`(민첩)` reads as a check but has 0 effect — make real or restyle).
- `[ ]` remaining clarity items: Su-ah `잔향 가공사` rename (deferred) · Echo/loop-memory in-fiction definition · 물거미/최적화/핑 first-use gloss · EN opening-card parity. Deploy hygiene: use `make deploy` (pins .env project; ambient gcloud config once drifted → stray service in claude-study-501117, deleted). Completed 07-04/05 gameplay/companion/cloud-runtime/model-routing/Kiro work → `docs/COMPLETED_SUMMARY.md` M55-M56.
- **Image continuity**: lever #1 SHIPPED (`9e6e5b3` style preamble + `appearance` ×7) · lever #3 SHIPPED (`b0d7567` prod model → `gemini-3.1-flash-image` via `generate_content` + curated-portrait reference; deploy MUST set `IMAGEN_MODEL=gemini-3.1-flash-image`, Gemini quota is regional not per-model so likely no increase needed — observe 429s). `[x]` `[auto:codex]` **lever #2 DONE**: curated three-turn fixed-art sequences for night market, incinerator, Kai awakening, Spire gate, and IX; `make validate-content` clean + referenced assets exist. **Art + wiring both codex** (오너 지시 "큐레이션 키아트=codex" 2026-07-06 — 기존 큐레이트 스타일 매칭 위해).
- `[/]` `[manual]` **Full-3.5 live sign-off**: opening/Se-rin-flash **confirmed fixed by owner (2026-07-09)**. Remaining = fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn, and a **real-device mobile pass** (the header-hide/banner/chip/tab-rename UX is emulator-verified @390px only — touch/notch/`100dvh` URL-bar). Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs. (git push: origin in sync as of 2026-07-11.)
- `[/]` `[manual]` **Teaser #2**: re-scoped as the balanced CBT Teaser V2 production lane above; it is no longer deferred.
- `[/]` `[manual]` **Key-beat hybrid enablement + A/B verdict — PREPARED 2026-07-14 (owner GO)**: agent-side work done — routing observability added (`model_override`/`key_beat` in the streaming-finished log + `JsonFormatter` whitelist; streaming-path routing source-locked, `test_keybeat_model.py` 18) + full protocol with owner commands in `docs/plans/2026-07-14-keybeat-hybrid-ab.md`. **ENV FLIP LIVE 2026-07-14: `mythos-api-00064-k99`** (health/root 200, env verified). Caveat: `services update` reuses the 00063 image, which predates the log-field commit → **routing log verification needs one `make deploy` (source rebuild; env-preserving, hybrid sticks)**. Remaining (owner): `make deploy` → play turns → routing verify via log query → matched-loop A/B (quality/repetition/errors/p50/p95/cost) → documented keep/rollback in `DECISIONS.md`; rollback command in the plan.
- `[/]` **CBT P1 (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`)** — P1-A/B/C/D/E all DONE 2026-07-05..08; S1-S4 variant-routed opening mechanisms+content DONE (detail archive/`PROGRESS_LOG.md`). Remaining `[ ]` `[manual]`: S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
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

## P1.5 — CBT feedback #3: Clarity & Responsiveness (2026-07-08, design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`)

- `[x]` **T1-T4a + T5/T6 + Track M (M1-3/T6a-c) + T5a/T5b DONE+VERIFIED 2026-07-08** — clarity affordances + mobile-first (100dvh · <600px readable fonts + 44px taps · tap tooltips · concise-mode + coarse-pointer default · board zoom/affordance/tile-floor). Owner decision: mobile-inclusive P0. Summary → `COMPLETED_SUMMARY.md` M58; detail → archive/`progress-2026-07.md`. Residual `[manual]`: T4/S4 copy tone + play-feel.
- **P1.5 open slices**:
  - `[ ]` `[manual]` **M4** verify 7 `position:fixed` modals for scroll-lock/clip on phone.
  - `[ ]` `[blocked]` **T5c** (LARGE) 2D top-down toggle = second orthogonal render path. Precondition (human): owner confirms isometric still illegible @390px after T5a/b. NOT unattended-consumable — do not build on a guess. Promote to `[auto:claude]` after that judgment.



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
  - `[x]` **ally-writeback promotion (DONE 2026-07-09, `efa1c8f`)**: owner ruled it a bug — `_finish_party_state`가
    `controllable=False`(=story-flag 아군, is_party_member 아님) 전투원을 이제 `_party.members`로 승격 안 함
    (초기 파티/route `party_add`만 영구). Se-rin-everywhere 문제의 뿌리. 잔여 `[manual]`: 구 버그로 이미
    `_party.members`에 잘못 승격된 프로덕션 플레이어는 소급 정리 안 됨 — 요청 시 1회성 DB 클린업.
  - `[x]` combat simulator admin-key 게이팅 (DONE 2026-07-05) — 잔여: 시뮬산 활성 루프 캡 정리는 요청 시 DB 작업.
