# Project MythOS Next Plan

Last updated: 2026-07-09

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. **Latest deploy = `mythos-api-00039-r27` (2026-07-10)** — full stack + companion-appearance thread closed (guardrail/combat-spawn/cutscene/callback + bible present-gate `2b5b50f`) + stat voices + **narrative clarity fix tracks 1-4** (patrol/heat `c58a2ac` · identity/IX `ae21be0` · goal↔opening `1d943f7` · **deterministic play-style consequence system `26cacc8`**). **DEPLOYED on top (session #5 = `mythos-api-00040-skm`, smoke 200, `make check` 972)**: choice-latency **image-decouple** (`RuntimeOptions.defer_image`) + mobile touch fixes (typewriter/combat scroll) + density (proportional `--font-read`, STATUS declutter) + stat-name unify (지능/매력/민첩/관측) → remaining: `! git push` (repo sync) + real-device touch-scroll confirm.

### Live playtest triage 2026-07-11 (owner session on 00042-97c) — diagnosed, fixes need owner scope pick
- `[x]` **전투 A/V 싱크 A+B DONE (`654bdd0`)**: SFX 캐시+전투 시작 프리로드 · 투사체 비행을 임팩트 큐에 정렬(0.65s/0.45s). `[x]` (C) DONE (`6571351`): 리플레이 중 `useCombatCinemaQueue`가 `replayCombat`(캔버스와 동일 중간 보드)를 노출→로스터/인스펙터가 최종 대신 중간 HP 표시(캐논 3면 일치). 잔여 `[ ]` `[manual]` 실플레이 체감.
- `[x]` **drone_scrap 무근거 지급 FIXED (`654bdd0`)**: few-shot 예시 `grant_items` 중립화(빈 배열+주석, KO/EN). `[ ]` `[manual]` 라이브 체감(지급 빈도 정상화). 부수 잔여: 직전결과 raw id/한글명 혼용 표시(용어 패스에 폴드).
- `[x]` **한 뜬금 전투 합류 FIXED (`654bdd0`)**: 미등장 아군 HOLD — 산문이 언급한 적 없는 플래그-언락 아군은 참전 보류(언급 후 다음 전투부터), 파티는 항상 참전; 만남 아크 장면엔 "이름+대사 필수" 의무 조항 추가. `[ ]` `[manual]` 라이브 재확인(만남 아크→합류 흐름 자연스러운지).
- `[x]` **프로덕션 이미지 생성 실패 ROOT-CAUSED + RETRY FIX (`40ccaea`)**: 오너 DB 조회로 확정 — 429(Imagen 분당 쿼터, 4건) + 빈 응답(안전 필터, 3건). 프로바이더 재시도(쿼터 8s/15s 백오프·빈 응답 1.5s 재롤, +4 tests). 남음 `[ ]` `[manual]` **GCP 콘솔에서 `imagen-3.0-generate` `online_prediction_requests_per_base_model` 쿼터 증액 신청**(근본 해소) · 배포 후 실패 빈도 재관찰.
- `[x]` **용어 직관화 DONE (`ece8e08`)**: 도감 용어집 섹션(정본 11개 KO/EN) + naming 가드(시스템 명사 발명 금지·첫 등장 주석, byte-parity 유지) + 직전결과 raw id 해소(materialize 무조건 실행). 남음 `[ ]` `[manual]` 라이브 체감 · `[x]` EN 오프닝 카드 패리티 DONE (`8a9362a`): EN `session_intro`가 07-10 KO Track-2 인물 우선 패스 대비 회귀(신호 우선·ARK 누락·드론/세린 디테일 소실)→인물 우선+ARK/디테일 복원, KO 불변·i18n 키 불변 · 용어집 저작 데이터 승격(scenario.json 오버레이)은 후속.
- **전투 갈아엎기**: 리서치 → `docs/plans/2026-07-11-combat-redesign-research.md` (A안 권고). **P0 DONE (`139587b`)**: 완전 텔레그래프(⚔+주사위 피해+공격선) · 아레나 전부 10×7 · 지형 스프라이트 레이어(에셋 없으면 기존 룩 폴백). 남음: `[ ]` `[manual]` P0 실플레이 재체감 on 00045 (텔레그래프 "안 바뀜" = stale-radar 버그였음 → `055fa9d` 수정+배포; 그리드 페이스·텔레그래프 가독) · `[x]` `[auto:agy]` **지형 타일 아트 3종 DONE (`37afcd2`)** — `resources/neo-seoul/combat/tiles/{floor,cover_half,cover_full}.png` (FLUX 아이소 타일; FLUX는 불투명 RGB라 canvas 계약의 투명 모서리 위배 → floor=기하 다이아몬드 알파 마스크, cover=근흑 루미넌스 키로 후처리) · `[ ]` P1(무확률·밀기/당기기·부동 목표) 오너 GO 후.

### Narrative clarity audit follow-ups (2026-07-10, 4-lane audit)
- `[ ]` `[manual]` **Track 4 balance playtest** — play-style consequence system now ON (`advance_route` axis tally → intent flag @ threshold 2); play two loops in different styles, confirm story/results diverge + balance OK, tune threshold/mapping if needed. **B4 stat-tag** decision rides along (`(민첩)` reads as a check but has 0 effect — make real or restyle).
- `[ ]` remaining clarity items: Su-ah `잔향 가공사` rename (deferred) · Echo/loop-memory in-fiction definition · 물거미/최적화/핑 first-use gloss · EN opening-card parity. Deploy hygiene: use `make deploy` (pins .env project; ambient gcloud config once drifted → stray service in claude-study-501117, deleted). Completed 07-04/05 gameplay/companion/cloud-runtime/model-routing/Kiro work → `docs/COMPLETED_SUMMARY.md` M55-M56.
- `[x]` **Companion-appearance fixes 2026-07-10 (detail PROGRESS_LOG/archive)**: Se-rin variant-loop ROOT FIXED (`31bdceb` variant-anchor flag strip + `9bfce0d` guardrail; flag-carry ruled out by repro) · tae_o/han portrait-flash FIXED+DEPLOYED (`6e5f13f`; detection now further gated by the 2026-07-11 dialogue gate `5bc1e23`). `[ ]` `[manual]` owner fresh-variant retest; legacy loops = new loop or 1-time DB cleanup.
- `[/]` `[manual]` **Full-3.5 live sign-off**: opening/Se-rin-flash **confirmed fixed by owner (2026-07-09)**. Remaining = fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn, and a **real-device mobile pass** (the header-hide/banner/chip/tab-rename UX is emulator-verified @390px only — touch/notch/`100dvh` URL-bar). Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs. (git push: origin in sync as of 2026-07-11.)
- `[ ]` `[manual]` **Teaser #2 (DEFERRED 2026-07-05)**: montage too similar to teaser #1; direction = (A) "uncut single-turn" now-ish or (B) montage after P1 + archetype openings + ending art. Metadata drafts `docs/cbt/CBT_TEASER.md`/`.ko.md`; re-scope when picked up.
- `[ ]` `[manual]` **Key-beat hybrid enablement + A/B verdict (after full-3.5 sign-off)**: deploy `MODEL=gemini-2.5-flash` + `GEMINI_MODEL_KEYBEAT=gemini-3.5-flash`; verify opening/anchor/cutscene/boss-buildup/ending route to 3.5 and normal turns to 2.5; compare matched full loops for quality, repetition/continuity, state/name/language errors, p50/p95 latency, and cost. Done = documented keep/rollback decision; rollback restores full `MODEL=gemini-3.5-flash` with key-beat unset.
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

## Design System — consistent UX (2026-07-08, design `docs/plans/2026-07-08-design-system.md`)

Root fix for "too much info at once" + "inconsistent detail-window sizes": no design tokens today (9 radii · 20 paddings · 51 bespoke panels · 3 duplicate tooltips). Absorbs the T6 concise toggle into a real density system.
- `[x]` **DS0** add spacing/radius/type tokens to `:root` (DONE 2026-07-08 overnight, `make check` 924) — `--space-1..7`/`--radius-sm..full`/`--density-step`/`--text-1..6`+line-heights added, pure additive, no call sites changed.
- `[x]` **DS1a** `Surface` primitive (variant×size×density), ships unused (DONE 2026-07-08 overnight, `make check` 927 green, +3 source-lock tests) — detail `PROGRESS_LOG.md`.
- `[x]` **DS1b** collapse the 3 M3 tooltips → one `Popover` + one passive `Tooltip` (aria-expanded/describedby), migrate call sites, delete bespoke CSS (DONE 2026-07-08 overnight, `make check` 928 green). Detail `PROGRESS_LOG.md`.
- `[x]` **DS2 base-`.panel` sweep COMPLETE 2026-07-08** (`make check` 954; owner sign-off G1/G2/G3). **All ~30 base `.panel` containers → `<Surface>`**: api (size-2=16px + glow + `...rest`/`id` + `as` prop) · a StatusPanel · b aside ×4 · c StoryPanel ×4 · d onboarding `<section>`+dashboards ×6 · e character/codex/skill ×6 · f DevConsolePanel ×6 · g the 3 `<details>` chips via `as="details"`. Sweep invariant locked by `test_ds2_base_panel_sweep_is_complete`. Detail → `PROGRESS_LOG`/`docs/plans/2026-07-08-ds2-sample-migration.md` §8.
  - `[ ]` (optional, low-priority) **bespoke non-`.panel` classes** (`combat-result-panel`/`choice-panel-wrapper`/`modal-panel`/…) — never `.panel`, outside the consistency-sweep scope; some (modal backdrops/wrappers) shouldn't be Surface. Migrate case-by-case only if a real inconsistency shows.
- `[x]` **DS3 DONE 2026-07-09** (`make check` 956; owner decision → `DECISIONS.md`). **DS3a** compact-density mode: `body.concise-mode .surface` drops one 4px step app-wide (default coarse=compact), header toggle CONCISE→COMPACT; 48px tap targets untouched. **DS3b** fixed-size combat inspector: always-visible HP·Intent·Cover trio, `.tile-inspector` 52→96px (no jump). Emulator-verified. **→ Design-System DS0-DS3 COMPLETE.**

## Landscape Combat — decided A (2026-07-08, design `docs/plans/2026-07-08-design-system.md` "Landscape Combat")

Emulator test: concise mode barely helps combat (10%); combat needs a **landscape split layout**, not density. Narrative stays portrait+concise.
- `[x]` **LC0/LC1/LC2 DONE 2026-07-08 overnight** (`make check` 941) — orientation hook+rotate prompt · landscape split (board left | TileInfo+roster right) · TileInfo folded. Detail `PROGRESS_LOG.md`/plan.
- **LC3/LC4 DONE 2026-07-08** (`make check` 948): LC3 compacted header/banner; LC4 made `.combat-layout` fixed-height `overflow:hidden` + folded aside into an independently-scrolling `.combat-bottom-row`. Emulator verify #2: page 1.00× (no scroll ✅), banner→chip ✅ — but header+tab-nav still ate ~215px and the right column led with TileInfo/roster → LC5/LC6 below.
- **LC5/LC6 DONE+EMULATOR-VERIFIED 2026-07-08** (`make check` 953): **the Landscape Combat track is now complete.**
  - `[x]` `[auto:claude]` **LC5** — `body.combat-active` signal (App.tsx effect off `combatLive`) scopes a landscape+coarse CSS block that hides the tab-nav entirely + shrinks the header + drops `.combat-layout` chrome offset 160px→96px, so the board reclaims the height. Narrative landscape keeps its nav.
  - `[x]` `[auto:claude]` **LC6** — hoisted `CombatControls` into one `controlsEl`; in landscape+coarse it leads the right column (actions-first: TARGETS/ACTIONS/SKILLS before TileInfo/roster/Map/Save/STATUS), portrait/desktop unchanged.
  - **Emulator @844×390 (cloud build, combat sim, this session)**: tab-nav `display:none` ✅, page `scrollRatio 1.00` (no page scroll) ✅, board fills full layout height (canvas ~297px) ✅, right-column order `[combat-controls, …]` with ACTIONS co-visible with the board ✅.

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
