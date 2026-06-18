# Project MythOS Next Plan

최종 갱신: 2026-06-19

이 파일은 앞으로 할 일(열린 작업)만 유지하는 rolling plan이다. 완료 트랙은
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `bin/docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## Priority 0 — 동료 호감도 + 컷씬 언락 + 프롬프트 레이어 분리 (현재 최우선)

권위 설계: `docs/plans/2026-06-16-companion-affection-cutscenes.md`. 진행 베이스라인: prompt-layer Phase 0-2 완료(커밋 `751a37b`/`cfe6a2d`/`ed37c39`/`7fd91e5`, `docs/PROMPT_LAYER.md`).
핵심 발견: relationship 델타(`scenario.json` perspective/choice `effect.relationship`)는 **저작됐으나 런타임 무시(dead data)** — `route_runtime.py:96`이 flags만 적용.

- `[/]` **프롬프트 레이어 분리(Foundation)**: Phase 0-4 + 노드-주소 지정 완료(overnight 시드 C/D/I/J/K — fallback/naming/stat/encounter→md generic 기본값·`node=`/`beat=` 룩업). 잔여 — `[ ]` Phase 5 system_prompt few-shot 예시 추출(캐시 prefix 민감, 최저 우선).
- `[x]` **P0 호감도 런타임**(`[auto]`, overnight 시드 L/M/N/O): `effect.relationship`를 `state.relationships[name]` 누적(route reconcile+choice fold, replay 멱등) + meta progression 크로스루프 이월(migration 006) + serializer 노출 계약. 무결성/누적 테스트 green. **잔여: `[ ]` `[manual]` 프론트 호감도 게이지 UI**(serializer 노출 완료, 시각 feel QA만).
- `[/]` **P1 컷씬 언락**: backend **main 머지 완료**(2026-06-19, migration 006/007 실 DB 적용·round-trip 검증) — `directives/companions/<name>.md` 로더(`CutsceneDirective`) + 결정론 언락(`cutscenes.py`) + 크로스루프 union(migration 007) + `memory_overview.cutscene_gallery` + 무결성(`CutsceneIntegrityTest`). **잔여: `[ ]` `[manual]` 프론트 갤러리 뷰**(payload 준비됨) · `[ ]` 인게임 컷씬 노드 등장(P1-a, directive 주입).
- `[/]` `[manual]` **P2 Se-rin 컷씬**: P1 로더 검증용 `se_rin.md` 2컷(임계 2/4) 저작 완료(placeholder 포트레이트). **잔여: `[ ]` `outputs/experiments/adult/serin/imagegen/*.png` 2종 전용 아트 채택(IMAGE_POLICY) + image 교체 + 라이브 QA.**
- `[ ]` `[manual]` **P3 동료 확장**: 카이/린위에/태오/한/수아 컷씬 + `side_arcs` 6종 route 사이드-앵커 승격(WS-B 트랙2).

## 엔지니어링 정비 트랙 — WS0-3 완료(COMPLETED_SUMMARY M43), WS4만 잔존

- `[ ]` **WS4(plan-only)**: agy 이미지 초안 → codex 적합도 검토 → NEXT_PLAN 콘텐츠 항목 추가 → codex 최종 이미지 생성 파이프라인. 권위 `docs/plans/2026-06-14-engineering-plan.md`.
- `[ ]` **WS5 하네스 하드닝(백로그, 2026-06-19 usage report 도출)**: ① integrity ledger(`HARNESS_HEALTH` + run.sh commit 객체 존재검증 + `status.tsv`에 `gate_exit`/`commit_verified` 컬럼 + phantom-success 플래그 — L3 갭) ② 종료 시 자동 morning digest(현재 `/overnight-report` 수동) ③ Model B 3-lane 동시실행 1회 실증(MythOS-only, ops) ④ 러너 iter-output 캡. 효과 낮음/이미 완화(dirty-tree gate·failover·long→file)라 후순위. 고효과분(진단-우선 `/diagnose`+gate-phase)은 2026-06-19 반영 완료.

## Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> 이 파일 순서로 읽는다.
- 큰 작업은 `docs/plans/YYYY-MM-DD-<topic>.md`에 설계 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`에는 최신 요약만, 완료 트랙은 `COMPLETED_SUMMARY.md`로 압축한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

### 자동화 태그 (overnight 루프용)

상태 박스(`[x]`/`[/]`/`[ ]`/`[~]`)와 **별개 축**으로, 무인 overnight 루프(`scripts/overnight/`,
`docs/engineering/mythos/LOOP.md`)가 소비할 수 있는지를 inline 태그로 표시한다.

- `[auto]` — 로컬·결정론·offline(`make check` 또는 `make smoke-local`)으로 검증 가능한 항목에만.
  **반드시 완료 기준 1줄**을 붙인다(scope 폭주 방지).
- `[manual]` — 사람 플레이 체감 QA·콘텐츠/Story-Bible 저작·밸런스/프롬프트-feel 튜닝 등 무인 검증 불가.
- `[blocked]` — 같은 항목 Blocker 2회 누적(러너가 자동으로 덧붙임). 사람 검수 후 제거. 선행 조건 미충족도 포함.
- **무태그 = 무인 대상 아님**(안전 기본값). 러너는 `[auto*]`만 소비하고, 무태그를 임의로 승격하지 않는다.

**엔진 레인 (3엔진 병렬 — 충돌 방지, 설계: `docs/engineering/mythos/AGENTIC.md`):** `[auto]` 에 엔진 접미사를 붙여
어느 엔진이 소비할지 지정한다. 각 엔진은 **자기 레인만** 소비 → 같은 항목을 둘이 집지 않는다.
- `[auto]` / `[auto:claude]` — claude 레인(src/tests/하네스/복잡 리팩터·invariant). claude 가 둘 다 소비.
- `[auto:codex]` — codex 레인(결정론 docs/scenario/story_bible 리팩터·검증; make check 게이트).
- `[auto:agy]` — agy 레인(이미지 초안 + 간단 검증; resources/ 이미지 디렉터리만, 무결성 게이트).
- claude 한도 소진 시 codex 가 claude 레인을 대신 소비(러너 자동 failover, `run.sh`).

## Overnight QA Seed — 자동 콘텐츠/밸런스 무결성

> "안 깨지는가"(봇, 결정론) 콘텐츠/밸런스 invariant. green=박제, red=Blocker surface. offline·`make check`.

- `[x]` **완료 invariant 배치(2026-06-14~15)** — 상세·검증은 `COMPLETED_SUMMARY.md`(QA Seed 무결성 배치) + PROGRESS archive: 루트·엔딩 도달성 / 플래그·조우 무결성 / 조우 승률 밴드(양면 ≥0.50·≤0.95) / 진행도 경제 / 무기·장비 / 스킬 데이터 / 아키타입 정합 / loot_table↔items / encounter 수치 경계 / item.kind enum / story_bible 메타 / npc_agenda 주체(allowlist 재정의) + codemod(FastAPI lifespan·dotenv ignore 중앙화). 문서 압축(`[auto:codex]`)도 이 정리로 완료.

- `[x]` **2026-06-16 시드 A-O 배치(Priority 0 foundation + 호감도)** — 상세·검증은 `COMPLETED_SUMMARY.md` M46 + PROGRESS archive: 콘텐츠 무결성 invariant 6종(relationship 타깃·effect closure·ending 참조·route node-type·이미지 ref·perspective when) + prompt-layer Phase 3/4a-c·노드-주소 지정(fallback/naming/stat/encounter→md, generic 기본값) + 호감도 런타임 L/M/N/O(route reconcile+choice fold 누적·meta 크로스루프 이월 migration 006·serializer 노출). 아침 검수 PASS(고장주입 3/3·라이브 QA 4/4)·origin/main push 완료.
- `[x]` **2026-06-18 시드 P/Q(`[auto:claude]` player-facing 데이터 클로저)** — `tests/test_route_meaning_and_goals.py` 2종: ① route 노드 `type` 클로저(`session._ROUTE_TYPE_MEANING`에 모든 node_types/anchor type 존재 → junction 라벨 generic fallthrough 방지, 고장주입 RED 실증) ② `session_design.chapter_gates` player_goal 완전성(전 gate 비어있지 않은 player_goal + LoopPhase phase + turn_range 형식 — `_chapter_goal` 막-스트립 공백 방지, content_integrity 미스캔 영역). `make check` green(445, +2).
- `[ ]` `[auto:agy]` 스킬 아이콘 6종 초안: `emp_pulse`·`glitch_blink`·`memory_resonance`·`nanoshield_projector`·`signal_overdrive`·`system_intrusion` 의 `resources/neo-seoul/skills/<id>.png` 를 IMAGE_POLICY + 기존 스킬 아이콘 스타일을 바이블로 초안 생성(placeholder fabricate 금지). 완료 기준: 6 PNG 실존·비어있지 않음·규격 일치. (2026-06-14 1차 생성분은 미적 반려 — `outputs/agy/skills/VERDICT.md`. 엄격 카드 템플릿으로 재생성 필요.)
- `[blocked]` `[auto:claude]` 스킬/아이콘 무결성 invariant: 모든 `combat.skills[].id`에 `resources/neo-seoul/skills/<id>.png` 존재 + 아키타입 base/learnable + `epiphany` unlock이 실재 스킬 참조. 완료 기준: `test_assets.py`에 추가, green 또는 Blocker. **선행 미충족**: 위 `[auto:agy]` 아이콘 6종 채택·머지 후 해제.

## Priority 1 — Neo-Seoul Playability Upgrade

상태: `[/]` 진행 중(현재 최우선 트랙. 잔여는 주로 `[manual]` 사람 플레이 QA + 일부 `[auto]` QA seed).

목표: `neo-seoul`을 기술 데모가 아니라 일반 유저가 30-60분 동안 만족스럽게 플레이할 수 있는 주력
시나리오로 끌어올린다. 게임성, 스토리 몰입, 선택 결과, 전투 페이스, 진행도 보상을 한 번의 플레이 경험
기준으로 재정렬한다.

권위 설계: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`
라이브 피드백 액션 플랜: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`

핵심 기준:

- 첫 5분 안에 목표/위험/세린을 따라갈 이유가 명확해야 한다.
- 매 장면 선택지는 `사람 / 증거 / 안전 / 통제` 중 무엇을 택하는지 드러내야 한다.
- 전투는 서사를 끊지 않고 추적, 작전 실패, 동료 보호, 보상의 결과로 느껴져야 한다.
- Codex/Run History/진행도는 다음 루프를 더 잘하게 만드는 정보와 보상을 줘야 한다.
- 엔딩은 무엇을 구했고, 무엇을 잃었고, 다음 루프에 무엇이 남는지 선명해야 한다.

완료(요약): Phase 1(Golden Path 45분 + 실패/우회 Path + QA rubric → `docs/scenarios/01-neo-seoul-connect.md`),
Phase 2(Story Bible/choice density + `scenario.json` playability 메타), Phase 3 데이터 기준선(조우 learning_goal/reward_intent).
P0(`encounter_reward.insight` meta 반영, 전투 결과 패널 보상 표시, 초반 forced ambient combat 완화, BGM/세린 표기 Live QA, 조우 보상 기준값 갱신).
P1 작전 지도 route-node화 + 세션 메모리(→ COMPLETED_SUMMARY M39), Tactical Board 범례/타일 인스펙터/학습 목표 배너, 조우 난이도 튜닝(per-spawn `overrides` + 학습 목표별 수치).

열린 작업:

### 라이브 QA 서사 개선 (2026-06-19, 권위 `docs/test/neo_seoul_live_qa.md`)

서사 QA 4건 **main 머지 완료**(`..44fd4e7`). 후속(서사 아키텍처 문서·BGM 토글·api 로그 가시화·opening 수동선택지)는 브랜치 **`feat/narrative-doc-bgm-logging`**(push, 미머지, green 454).
- `[x]` `[manual]` **#1 오프닝 일으킴 + #3 IX 위협 이유**: `opening.md` 편집 → **라이브 PASS**.
- `[/]` `[manual]` **#2 종료 서사화 + #5 전투 직후 콜백**: 코드 main 머지 + 단위 테스트 박제. 잔여=라이브 체감.
- `[ ]` **#4 지도 in-layer 선택지 행선지** · **#6 스킬트리 RPG 노드그래프**(별도 트랙, 프론트; 분석 완료).

### 작전 지도 동적 라우팅 — 완료(토대, 상세는 COMPLETED_SUMMARY/archive)

- `[/]` 후속: 동적 노드 title 다양화·중복 억제 완료. 남은 것: visual prompt에 현재 노드 주입, 정적 시나리오도 점진 전환 검토.

### 오프닝 시퀀스 정합 (live_qa §1.1) — 완료(토대), montage 후속

- `[ ]` 프리게임 montage 재배치: 추격 컷을 후반 비트로 옮겨 montage가 인게임 각성보다 앞서가는 시점 스포일 완화.
- `[ ]` 풀 4턴 사람 플레이 체감(각성→도착→접촉→추격, 이미지 전환·세린 포트레이트 동기화).
- `[ ]` 경미: turn1 "회랑" 단어 1회 누수·제목 "Changed " 접두 아티팩트, 인트로 불릿 칩(`·`) CSS 다듬기.

### 사람 플레이 QA 발견 (live_qa §0/§1-6) — A/B/C/E/G 완료, F·D 잔여

- `[/]` **F 스트리밍 속도**: 근본 원인 RAM 부족 규명 + 이원화 서사(8B 스토리 → 3b 파서) 배선·context 8192 캡 적용. 남은 것: 사용자 RAM 확보로 ~13초 근접, 실제 멀티턴 라이브 체감. 설계 `bin/docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
- `[/]` **D 내러티브 반복**: 시놉시스 truncation 드롭 수정(`session_synopsis` 전용 필드 전량 렌더) + 장면 길이/prefill 캐시 수정. 남은 것: 실제 멀티턴 라이브 체감.

- `[/]` P0-P2 다수 완료(상세 COMPLETED_SUMMARY M35-M40·PROGRESS archive; live LLM 14턴 QA 통과·F1 반복완화·anti-stickiness·Tactical Board 줌·회복/소모품/장비·기억의 별자리 재구성·objective/stakes·선택결과 요약). **남은 잔여**: F2 전투 빈도/연속 튜닝(관찰) · Tactical Board 터치 핀 고정 · 소모품/장비 밸런스 · 막 gate 필수 비트 강제 + visual prompt 현재 노드 주입 · 기억의 별자리 탭 세분화 · 선택결과에 관계/Codex/Shard 확장 · objective 막 전환 gate.
- `[ ]` P2 아키타입 의미 강화: 해금 milestone 제한 + 오프닝/시작위치/스킬/아이템/NPC 반응 차별화.
- `[manual]` Codex Skill 상태 문구 wording(첫 플레이어 feel). 버튼 상태 로직(`deriveSkillAction`)은 완료.
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX 통합 마감. `[ ]` Phase 5 — Neo-Seoul RC: 수동 QA(`docs/test/neo_seoul_live_qa.md`) + 자동 회귀.

## Hold — Scenario Expansion / Glass Library

상태: `[~]` 진행도/프레젠테이션 패리티 + Story Bible 17 entries 완료(M38). 추가 확장은 Neo-Seoul 만족도 개선 이후로 홀드.

- `[ ]` `glass-library` main_arcs/endings 분기·보상 메타 확장(현재 main_arcs 4 / endings 4).
- `[ ]` glass-library 전투 아트/스킬 깊이(현재 스킬 5종, 적 4종; 신규 combat action sheet는 후속).

## Maintenance

- `[ ]` `[manual]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` `[blocked]` `_map` 제거 정리(route-node 트랙 완료 후 보류; engine 매 장면 기록 + encounter_map 좌표·story_bible 위치·glass-library 폴백 미니맵 의존). 선행 조건: 전 시나리오 route_map 전환. 충족 시 `[auto]`(codemod + `make check` green)로 승격.
- `[ ]` `[manual]` 프론트엔드 god-component 분해(App.tsx·CombatCinema): custom hook/모듈 추출. E2E 민감하므로 live QA 동반 점진 진행.
