# Project MythOS Next Plan

최종 갱신: 2026-06-16

이 파일은 앞으로 할 일(열린 작업)만 유지하는 rolling plan이다. 완료 트랙은
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `bin/docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## Priority 0 — 동료 호감도 + 컷씬 언락 + 프롬프트 레이어 분리 (현재 최우선)

권위 설계: `docs/plans/2026-06-16-companion-affection-cutscenes.md`. 진행 베이스라인: prompt-layer Phase 0-2 완료(커밋 `751a37b`/`cfe6a2d`/`ed37c39`/`7fd91e5`, `docs/PROMPT_LAYER.md`).
핵심 발견: relationship 델타(`scenario.json` perspective/choice `effect.relationship`)는 **저작됐으나 런타임 무시(dead data)** — `route_runtime.py:96`이 flags만 적용.

- `[/]` **프롬프트 레이어 분리(Foundation)**: Phase 0-2 완료(loader/fallback 단일화/오프닝 비트→`directives/opening.md`). 잔여 — `[ ]` Phase 3 fallback→`directives/fallback.md`+context 배선 · `[ ]` Phase 4 naming/stat/encounter prose→md(generic 기본값 코드 유지·glass-library 회귀0) · `[ ]` Phase 5 system_prompt 예시 추출 · `[ ]` **노드-주소 지정**(`node=`/`beat=` 키 → 앵커·컷씬 잠금, P1 prereq).
- `[ ]` **P0 호감도 런타임**(`[auto]` 검증): `effect.relationship`를 `loop.state.relationships[name]` 누적(route_runtime+session) + meta progression 이월 + serializer/프론트 게이지. 무결성 테스트(relationship 키∈동료, 누적 단조성). 완료 기준: 누적/지속/표시 + `make check` green.
- `[ ]` **P1 컷씬 언락**: `directives/companions/<name>.md`(컷씬 블록: unlock_affection/flags/image+대본) 로더 + 임계 판정(결정론) + 갤러리(기억의 별자리, 미언락 잠김) 우선 → 인게임 등장 후속.
- `[ ]` `[manual]` **P2 Se-rin 컷씬**: `outputs/experiments/adult/serin/imagegen/*.png` 2종 채택(IMAGE_POLICY) + `directives/companions/se_rin.md` 임계별 컷씬 저작 + 라이브 QA.
- `[ ]` `[manual]` **P3 동료 확장**: 카이/린위에/태오/한/수아 컷씬 + `side_arcs` 6종 route 사이드-앵커 승격(WS-B 트랙2).

## 엔지니어링 정비 트랙 — WS0-3 완료(COMPLETED_SUMMARY M43), WS4만 잔존

- `[ ]` **WS4(plan-only)**: agy 이미지 초안 → codex 적합도 검토 → NEXT_PLAN 콘텐츠 항목 추가 → codex 최종 이미지 생성 파이프라인. 권위 `docs/plans/2026-06-14-engineering-plan.md`.

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

### 2026-06-16 시드 — Priority 0 foundation (prompt-layer + 호감도, `docs/plans/2026-06-16-companion-affection-cutscenes.md`)

- `[x]` `[auto:claude]` **(A) relationship 타깃 무결성 invariant**: 모든 perspective/choice `effect.relationship` 키가 동료 집합(combat allies id 또는 `relationship_subjects` 선언)에 실재. `RelationshipSubjectIntegrityTest` 2건 + 비전투 동료 `lin_yue`를 `relationship_subjects` 선언(npc_agenda allowlist 패턴). dangling 0 green, 고장주입 3/3 RED 확인.
- `[x]` `[auto:claude]` **(B) `effect` 키 closure invariant**: 모든 route perspective/choice `effect` 키 ∈ 인식 집합{`flags`,`stability`,`tension`,`insight`,`relationship`,`hp`,`grant_items`,…}(실제 소비 키 근거). 완료 기준: 미지 키 0 green 또는 Blocker(relationship처럼 조용히 드롭되는 오타 가드).
- `[x]` `[auto:claude]` **(C) prompt-layer Phase 3 — fallback→`directives/fallback.md`**: `fallbacks.py` DEFAULT_FALLBACK를 `resources/neo-seoul/directives/fallback.md`로 추출 + `scenario_context`가 `NarrativeContext.fallback_scene` populate. 완료 기준: byte-parity 테스트 + `make check` green. (2026-06-16 박제 — byte-parity green, 368 tests)
- `[x]` `[auto:claude]` **(D) directives 노드-주소 지정**: `scenario_directives.py` 로더가 `node=`/`beat=` 헤더 키 파싱(컷씬·앵커 잠금 prereq). 완료 기준: 파서 유닛테스트 green, 기존 동작 불변. (2026-06-16 박제 — `DirectiveBlock.node`/`.beat` + `block_for_node`/`block_for_beat` 룩업 + `OpeningBeat` node/beat 필드, 5 테스트, 373 green)
- `[x]` `[auto:claude]` **(E) ending condition flag 참조 무결성**: 모든 `endings[].condition`이 참조하는 플래그/메트릭이 생성 가능(authored effect 또는 인식 메트릭). 완료 기준: `test_content_integrity.py` 추가, dead 참조 0 green 또는 Blocker. (2026-06-16 박제 — `EndingConditionReferenceIntegrityTest` 3건: 심볼∈resolver namespace + flag∈producible(effect.flags/unlock_flags) + guard-the-guard. 376 green, 고장주입 2/2 CAUGHT)
- `[x]` `[auto:claude]` **(F) route node-type closure**: 모든 layer `pool` 타입·anchor `type`가 `route_map.node_types`에 선언. 완료 기준: 미지 타입 0 green 또는 Blocker. (2026-06-16 박제 — `RouteNodeTypeClosureTest` 2건, 미지 타입 0 green, 고장주입 2/2 CAUGHT, 378 tests)
- `[x]` `[auto:claude]` **(G) 전 시나리오 이미지 ref 실존**: `image_sequence`·anchor `image`/`image_pre`·`characters[].image`·cinematic_shots 경로 파일 존재. 완료 기준: `test_image_assets.py` 확장, dangling 0 green 또는 Blocker. (2026-06-16 박제 — `test_assets.py` `ScenarioImageReferenceIntegrityTest`, 23 refs/dangling 0 green, 고장주입 1/1 CAUGHT, 379 tests. **스킬 아이콘은 제외** — 5/10 미존재가 별도 `[blocked]` 스킬-아이콘 invariant 관장.)
- `[x]` `[auto:claude]` **(H) perspective `when` 플래그 생성가능성**: route perspective `when` 플래그가 effect.flags/엔진/등록 집합서 생성됨(기존 flag invariant 확장, dead 분기 가드). 완료 기준: dead 0 green 또는 Blocker. (2026-06-16 박제 — `PerspectiveWhenFlagProducibilityTest` 2건, neo-seoul `when` 24종 dead 0 green, 고장주입 1/1 CAUGHT, 381 tests. glob+`when` 분리로 `ContentFlagIntegrityTest` 일반화.)
- `[x]` `[auto:claude]` **(I) prompt-layer Phase 4a — naming→`directives/naming.md`**: `NEO_SEOUL_NAMING_RULE` 추출, `scenario_context` generic 루프. 완료 기준: byte-parity 테스트 + `make check` green. (2026-06-16 박제 — `naming.md` + `ScenarioDirectives.naming_rule` + generic 주입(neo-seoul 분기 제거), `NamingDirectiveParityTest` 5건, 386 green, glass-library 회귀0.)
- `[x]` `[auto:claude]` **(J) Phase 4b — stat-voice→`directives/stat_voices.md`**: stat 독백 prose 추출(min/max 선택 로직 STAY). 완료 기준: parity + `make check` green. (2026-06-16 박제 — `StatVoices`/`StatVoiceProfile` + `stat_voices.md` + `DEFAULT_STAT_VOICES` generic 기본값(stat_voices.md 미보유 시나리오 회귀0) + `StatVoiceDirectiveParityTest` 4건, byte-parity green, 390 tests.)
- `[x]` `[auto:claude]` **(K) Phase 4c — encounter→`directives/encounters.md`**: travel/emergency prose 추출(임계 로직 STAY). 완료 기준: parity + `make check` green. (2026-06-16 박제 — `Encounters` 데이터클래스 + `encounters.md`(travel/emergency 3블록) + `DEFAULT_ENCOUNTERS` generic 기본값(encounters.md 미보유 시나리오 회귀0) + `EncounterDirectiveParityTest` 5건, byte-parity green, 395 tests.)
- `[x]` `[auto:claude]` **(L) 호감도 — `route_runtime` relationship 누적**: perspective `effect.relationship` → `state.relationships[name]` 누적(flags 처리 옆). 완료 기준: 유닛테스트(누적 단조성) + `make check` green. (2026-06-16 박제 — `advance_route`가 route relationship_tally를 매턴 fresh 재계산+reconcile(replay 더블카운트 방지·choice 기여 보존), `RouteRelationshipTest` 5건, 400 green. `relationship` 키 PENDING→CONSUMED. feature — 아침 검수 필요)
- `[x]` `[auto:claude]` **(M) 호감도 — `session` choice relationship 누적**: choice `effect.relationship` 동일 누적. 완료 기준: 유닛테스트 + `make check` green. (L 선행) (2026-06-16 박제 — `Choice.effect` 필드 + `fold_relationship` 헬퍼 + `_commit_scene`이 advance_route 직전 fold(route reconcile가 보존, 더블카운트 0). `FoldRelationshipTest` 4건 + session choose 누적/clean 2건, 406 green. feature — 아침 검수 필요)
- `[ ]` `[auto:claude]` **(N) 호감도 — `progression` 크로스-루프 이월**: meta progression에 `relationships` 적립/이월(insight 패턴). 완료 기준: 유닛테스트 + `make check` green. (L 선행, feature — 검수 필요)
- `[ ]` `[auto:agy]` 스킬 아이콘 6종 초안: `emp_pulse`·`glitch_blink`·`memory_resonance`·`nanoshield_projector`·`signal_overdrive`·`system_intrusion` 의 `resources/neo-seoul/skills/<id>.png` 를 IMAGE_POLICY + 기존 스킬 아이콘 스타일을 바이블로 초안 생성(placeholder fabricate 금지). 완료 기준: 6 PNG 실존·비어있지 않음·규격 일치. (2026-06-14 1차 생성분은 미적 반려 — `outputs/agy/skills/VERDICT.md`. 엄격 카드 템플릿으로 재생성 필요.)
- `[blocked]` `[auto:claude]` 스킬/아이콘 무결성 invariant: 모든 `combat.skills[].id`에 `resources/neo-seoul/skills/<id>.png` 존재 + 아키타입 base/learnable + `epiphany` unlock이 실재 스킬 참조. 완료 기준: `test_assets.py`에 추가, green 또는 Blocker. **선행 미충족**: 위 `[auto:agy]` 아이콘 6종 채택·머지 후 해제.

## Priority 1 — Neo-Seoul Playability Upgrade

상태: `[/]` 진행 중(현재 최우선 트랙. 잔여는 주로 `[manual]` 사람 플레이 QA + 일부 `[auto]` QA seed).

목표: `neo-seoul`을 기술 데모가 아니라 일반 유저가 30-60분 동안 만족스럽게 플레이할 수 있는 주력
시나리오로 끌어올린다. 게임성, 스토리 몰입, 선택 결과, 전투 페이스, 진행도 보상을 한 번의 플레이 경험
기준으로 재정렬한다.

권위 설계: `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`
라이브 피드백 액션 플랜: `docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`

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

### 작전 지도 동적 라우팅 — 완료(토대, 상세는 COMPLETED_SUMMARY/archive)

- `[/]` 후속: 동적 노드 title 다양화·중복 억제 완료. 남은 것: visual prompt에 현재 노드 주입, 정적 시나리오도 점진 전환 검토.

### 오프닝 시퀀스 정합 (live_qa §1.1) — 완료(토대), montage 후속

- `[ ]` 프리게임 montage 재배치: 추격 컷을 후반 비트로 옮겨 montage가 인게임 각성보다 앞서가는 시점 스포일 완화.
- `[ ]` 풀 4턴 사람 플레이 체감(각성→도착→접촉→추격, 이미지 전환·세린 포트레이트 동기화).
- `[ ]` 경미: turn1 "회랑" 단어 1회 누수·제목 "Changed " 접두 아티팩트, 인트로 불릿 칩(`·`) CSS 다듬기.

### 사람 플레이 QA 발견 (live_qa §0/§1-6) — A/B/C/E/G 완료, F·D 잔여

- `[/]` **F 스트리밍 속도**: 근본 원인 RAM 부족 규명 + 이원화 서사(8B 스토리 → 3b 파서) 배선·context 8192 캡 적용. 남은 것: 사용자 RAM 확보로 ~13초 근접, 실제 멀티턴 라이브 체감. 설계 `docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
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
