# Project MythOS Next Plan

Last updated: 2026-07-12

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. **Latest deploy = `mythos-api-00052-fcx` (2026-07-12, owner-run; smoke health/root 200; `IMAGEN_MODEL=gemini-3.1-flash-image` pinned-and-verified on the revision)** — carries the whole session #8-#12 bundle: cloud image model migration + push/pull + cover badge/pose + 7 owner-approved cover sprites + tab/도감/companion-join + playtest fixes. Owner live verify list: image character consistency · push/pull feel + cover badge/pose · hot-path choices fix · portrait combat real-device. Prior: `mythos-api-00039-r27` (2026-07-10) — full stack + companion-appearance thread closed (guardrail/combat-spawn/cutscene/callback + bible present-gate `2b5b50f`) + stat voices + **narrative clarity fix tracks 1-4** (patrol/heat `c58a2ac` · identity/IX `ae21be0` · goal↔opening `1d943f7` · **deterministic play-style consequence system `26cacc8`**). **DEPLOYED on top (session #5 = `mythos-api-00040-skm`, smoke 200, `make check` 972)**: choice-latency **image-decouple** (`RuntimeOptions.defer_image`) + mobile touch fixes (typewriter/combat scroll) + density (proportional `--font-read`, STATUS declutter) + stat-name unify (지능/매력/민첩/관측) → remaining: `! git push` (repo sync) + real-device touch-scroll confirm.

### Live playtest triage 2026-07-11 (owner session on 00042-97c) — diagnosed, fixes need owner scope pick
- `[x]` **07-11 트리아지 배치 전체 DONE** — 전투 A/V 싱크 A+B+C(`654bdd0`/`6571351`) · drone_scrap few-shot 중립화 · 미등장 아군 HOLD("이름+대사 필수" 규칙 포함) · 프로덕션 이미지 실패 재시도 + Imagen 쿼터 1→30/min(`40ccaea`) · 용어 직관화 용어집 11종/naming 가드(`ece8e08`) · EN 오프닝 카드 패리티(`8a9362a`) — 상세 `bin/docs/archive/progress-2026-07.md`. 잔여 `[ ]` `[manual]` 항목별 라이브 체감은 `docs/test/neo_seoul_live_qa.md`가 권위 (구 `imagen-3.0` 쿼터 증액 신청은 lever#3 모델 이관으로 폐기 — Gemini 429 관찰로 대체).
- **전투 갈아엎기**: 리서치 → `docs/plans/2026-07-11-combat-redesign-research.md` (A안 권고). **P0 DONE (`139587b`)**: 완전 텔레그래프(⚔+주사위 피해+공격선) · 아레나 전부 10×7 · 지형 스프라이트 레이어(에셋 없으면 기존 룩 폴백). 남음: `[ ]` `[manual]` P0 실플레이 재체감 on 00045 (텔레그래프 "안 바뀜" = stale-radar 버그였음 → `055fa9d` 수정+배포; 그리드 페이스·텔레그래프 가독) · `[x]` `[auto:agy]` **지형 타일 아트 3종 DONE (`37afcd2`) — `resources/neo-seoul/combat/tiles/{floor,cover_half,cover_full}.png` (FLUX 아이소 타일; FLUX는 불투명 RGB라 canvas 계약의 투명 모서리 위배 → floor=기하 다이아몬드 알파 마스크, cover=근흑 루미넌스 키로 후처리) · **P1 밀기/당기기 DONE** (`5d75d63` `_skill_displace` 지형 상호작용 — overload_strike push:1 + `magnetic_pull` 당기기 스킬; **명중확률 유지**=오너 지시, 무확률 제거는 안 함) + **엄폐 배지 DONE** (`508ad72` 🛡+3/+6). `[x]` **엄폐 포즈 배선 DONE (claude 인계)** — 엄폐 칸 위 유닛은 웅크림 포즈 렌더: pose `"cover"` + `<char>-cover.png` 파생 규약(guard/idle 경로에서 유도), 스프라이트 로드 실패 시 guard 포즈 폴백; +3 소스락 tests. `[x]` `[auto:codex]` 크라우치 스프라이트 1차 생성(`4d5b3be`) → **오너 리젝** (동일 템플릿 + 정체성 뒤섞임). `[/]` `[auto:codex]` **엄폐 포즈 아트 정체성 재생성 — 5/7 확정, 2장 재생성 (오너 규칙 07-12)** — 브리프 `scratch/codex-cover-pose-brief.md` 준수, 자기 guard/idle 레퍼런스 생성, 부분 승격 2회차: se-rin/kai (`df8d1e6`, 러너 image-judge PASS + AGY live-QA PASS_CANDIDATE) → 잔여 5장은 codex 커밋(`33b5a4a`)이 critic-reject(이 항목을 [manual] 후속 없이 DONE으로 닫음)로 revert된 뒤 아트만 복원 + claude 시각 정체성 재판정으로 재적용(`2942a74`; 린위에=여성 인간·태오=남성·7장 포즈 상이). **오너 비교시트 리뷰에서 신규 규칙 확정: cover 소품/무기는 그 캐릭터의 guard 정본에 있는 것만** → `[x]` `[auto:codex]` 3차: player-noise(총기 제거) **오너 승인**·su-ah(나이프 교체) 무기 PASS지만 **스타일 회귀로 오너 리젝**(`cac23f9`; attempt-1의 회로 자수 질감/디테일 밀도 소실). `[x]` `[auto:codex]` **su-ah 1장 4차 재재생성 DONE (2026-07-12)** — 오너 판정 "attempt-1 이미지가 좋았고 무기만 바꾸면 됐다" → attempt-1을 1순위 레퍼런스로 구도·질감·조명 그대로, **데이터패드 손만 guard 나이프로 교체** (브리프 4차 개정). criterion: 스타일-동일성 셀프체크 추가 + `make check` green. 체크표 `outputs/cover-pose-regen/review.md`, 후보/소스 동 디렉토리 보존. `[x]` `[manual]` **오너 정체성 최종 확인 DONE 2026-07-12** — 비교 시트 승인("확인 완료"), 7장 확정. **cover 아트 deploy 블로커 해제.** (`make deploy`가 `IMAGEN_MODEL=gemini-3.1-flash-image`를 기본 고정하도록 Makefile 수정 — 수동 설정 불요.) · `[x]` `[auto:codex]` `magnetic_pull` 전용 아이콘 재생성 DONE (기존 `emp_pulse` 복사 플레이스홀더 교체; `make check` green).

### Combat feedback batch 2026-07-12 (owner live session on 00052) — batch 1 DONE, follow-ups open
- `[x]` **배치 1 DONE (`make check` 1008)**: 시스템 해킹→스턴 · 과부하 일격→스플래시 · 자기 반발(밀기) 신설 · 유틸 스킬 고정 피해 라이더 · EMP 수류탄 XCOM식 광역 투척(셀 지정+프리뷰) · 낚아채기 VFX · 스턴 💫 배지. 상세 `PROGRESS_LOG.md`.
- `[x]` `[auto:agy]` **magnetic_repulse 스킬 아이콘** DONE (agy 생성, review.md 완료, make check green)
- `[x]` **전투 반응성 진단+개선 DONE (`5aa65d8`)** — 계측: 서버 턴 해소 0.1ms대(무죄); 원인=로그 항목당 풀스크린 시네마 직렬 재생(클릭당 p50 7.0s/max 10.5s 강제 관람). 수정: 시네마는 내가 지시한 유닛의 타격+처치 비트만(재계측 p50 3.6s), 나머지는 보드 애니메이션 + **탭하여 스킵**(잔여 큐 플러시, ~1.5s 복귀). 소스락 tests. `[manual]` 라이브 체감 재확인은 다음 배포 후.
- `[/]` **2-티어 전투 컨트롤** — 설계 `docs/plans/2026-07-12-two-tier-combat-control.md`. **핵심 3슬라이스 DONE**: slice 1 EMP 셀 타겟팅 · slice 2 **명중%·피해 예보 칩** (`a164f81` — `_attack_preview`가 실제 공격 수식 미러, 🎯65% ⚔6-16 🛡 형식) · slice 3 **적 인텐트 호버 렌즈** (`de00355` — 적 탭/호버 시 그 적의 텔레그래프만 강조+타 인텐트 딤, 인스펙터 "⚔2d6 → 세린"). 잔여: `[ ]` `[auto:claude]` slice 1 확장(푸시/풀/aoe 스킬도 보드 지정+변위/폭발 프리뷰 — 설계 §1; criterion: make check green + AGY 스크린) · slice 4(턴 순서 스트립)는 `[manual]` 오너 체감 판정 후.
- `[/]` **상태이상 시스템** — 설계 `docs/plans/2026-07-12-status-effects-design.md`. **slice 1 DONE (`b55b37b`)**: `status_effects` 채널 + 연소(턴 시작 1d4 DoT, 행동 전 사망 가능)/부식(장갑 -2) + `applies` 스킬 라이더 + 보드 배지 pill 행(💫/🔥/🧪) + KO/EN 로그 + 직렬화 왕복 tests. `[ ]` `[auto:claude]` **slice 2: 산성(방어↓)/냉동(이동불가)/감전(집중·쿨다운 정지) 훅 + apply 순간 FX + 배지 3종 추가** (criterion: make check green + 결정론 유지) · `[ ]` `[manual]` **slice 3: 부여 콘텐츠 매핑 밸런스 패스** (누가 뭘 거는가 — 설계 §Grants 초안 검토) 후 `[auto:codex]` scenario.json 배선.

### Narrative clarity audit follow-ups (2026-07-10, 4-lane audit)
- `[ ]` `[manual]` **Track 4 balance playtest** — play-style consequence system now ON (`advance_route` axis tally → intent flag @ threshold 2); play two loops in different styles, confirm story/results diverge + balance OK, tune threshold/mapping if needed. **B4 stat-tag** decision rides along (`(민첩)` reads as a check but has 0 effect — make real or restyle).
- `[ ]` remaining clarity items: Su-ah `잔향 가공사` rename (deferred) · Echo/loop-memory in-fiction definition · 물거미/최적화/핑 first-use gloss · EN opening-card parity. Deploy hygiene: use `make deploy` (pins .env project; ambient gcloud config once drifted → stray service in claude-study-501117, deleted). Completed 07-04/05 gameplay/companion/cloud-runtime/model-routing/Kiro work → `docs/COMPLETED_SUMMARY.md` M55-M56.
- **Image continuity**: lever #1 SHIPPED (`9e6e5b3` style preamble + `appearance` ×7) · lever #3 SHIPPED (`b0d7567` prod model → `gemini-3.1-flash-image` via `generate_content` + curated-portrait reference; deploy MUST set `IMAGEN_MODEL=gemini-3.1-flash-image`, Gemini quota is regional not per-model so likely no increase needed — observe 429s). `[x]` `[auto:codex]` **lever #2 DONE**: curated three-turn fixed-art sequences for night market, incinerator, Kai awakening, Spire gate, and IX; `make validate-content` clean + referenced assets exist. **Art + wiring both codex** (오너 지시 "큐레이션 키아트=codex" 2026-07-06 — 기존 큐레이트 스타일 매칭 위해).
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
