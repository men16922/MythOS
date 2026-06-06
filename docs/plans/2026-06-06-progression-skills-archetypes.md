# 진행도 기반 해금: 아키타입 · 스킬 · Codex Skill 트리 — 설계안

작성일: 2026-06-06
상태: 설계 (구현 미착수)
관련: `docs/plans/2026-06-06-combat-visual-effects.md`(스킬 이펙트 데이터 공유), `docs/plans/2026-06-06-party-controllable-allies.md`(동료 스킬), `src/mythos_runtime/progression.py`(메타 진행 버킷)

## 목표

루프형 정체성에 맞춰 **해금(unlock)을 진행의 보상**으로 만든다.

1. **아키타입 진행도 해금** — 처음엔 **Ghost(비접속자)만** 선택 가능, 나머지(Data Smuggler / Echo Collector)는 메타 진행으로 해금.
2. **튜토리얼 시퀀싱** — Ghost + 세린 오프닝 = **첫 튜토리얼 루프**. 이를 통과하면 다른 시나리오로 진행 개방.
3. **캐릭터 맞춤 스킬 획득** — 처음엔 캐릭터별 **기본 스킬만**. 서사 **이벤트/깨달음(Epiphany)**으로 스킬이 *해금 가능* 상태가 되고, **통찰 포인트(Insight)**를 써서 Codex에서 *습득/강화*.
4. **Codex Skill 메뉴 = 스킬트리** — 효과 표시 + 포인트 지출(습득/Rank-up) 화면.

## 확정 모델: 하이브리드 (서사 게이트 + 포인트 투자)

> "서사가 가능성을 열고, 포인트가 투자를 정한다."

```
[깨달음 이벤트] ──unlock──> [스킬: 잠금 해제]
                                  │
                        [통찰 3p 소모] 습득(Rank1)
                                  │
                        [통찰 2p] 강화(Rank2)

Codex > Skill 탭 = 트리 + 포인트 지출 화면
```

- **깨달음 이벤트**(단서/엔딩/전투/특정 선택/flag)가 스킬을 `unlocked_skills`에 올려 *습득 가능* 상태로 만든다.
- 깨달음/런 완료/단서로 **통찰 포인트**를 소량 적립.
- Codex Skill 탭에서 통찰을 써서 미습득 노드를 **습득**하거나 보유 스킬을 **Rank-up**.
- **전투에서 실제 사용 가능한 스킬 = 습득(learned)된 스킬만**. (현재는 시나리오 전체 스킬을 무조건 보유 → 변경)

## 현재 상태 (코드 기준)

- **아키타입**: `resources/<scenario>/scenario.json` `archetypes[]`에 3종, **항상 전부 선택**. `OnboardingPanel`/`/scenarios`가 그대로 노출.
- **스킬 부여**: `src/mythos_runtime/combat_service.py:77` — `skill_ids = list(scenario_combat.get("skills", {}).keys())`로 **전체 스킬 무조건 부여**. 스킬 정의는 `role`(damage/healing/defense/mobility) + `tags` + `effect` + `cost`/`range`/`cooldown` 보유.
- **메타 진행**: `progression.py`가 **룰 기반 grant 시스템**. 버킷 `unlocked_traits`/`unlocked_allies`/`unlocked_starting_items`/`codex_unlocks`를 run summary 조건(runs_completed/total_clues/combats_won/allies_met)으로 채움. `apply_meta_progression_to_state`가 루프 state에 주입.
- **Codex**: `CodexPanel.tsx`에 단서/로어/인벤토리/잔향 4섹션. Skill 섹션 없음.

→ 메타 진행이 이미 버킷 grant 구조라 **버킷 추가 + 게이트 적용**으로 확장 가능. 평행 시스템 불필요.

## 데이터 모델

`MetaProgression`(progression.py)에 버킷 추가:
- `unlocked_archetypes: list[str]` — 항상 `["비접속자 (Ghost)"]` 기본 포함.
- `unlocked_skills: list[str]` — 깨달음으로 *습득 가능* 상태가 된 스킬 id.
- `learned_skills: list[str]` / `skill_ranks: dict[str,int]` — 통찰로 실제 습득/강화한 스킬과 랭크.
- `insight_points: int` — 미사용 통찰 잔액.
- `epiphanies_seen: list[str]` — 중복 지급 방지.

(버킷은 `meta_progression_to_content`/`_from_content`/`_grant_if` 패턴 그대로 확장. JSONB 저장이라 마이그레이션 불요 — 기존 status risk 패턴 유지.)

시나리오 데이터(scenario.json) 신규 필드:
- `archetypes[].unlock`: `{condition}` (없으면 항상 해금; Ghost는 기본 해금). 예: `{"runs_completed": 1}` / `{"ending_seen": "..."}`.
- `archetypes[].base_skills` / `characters[].base_skills`: 시작 시 자동 learned되는 캐릭터 맞춤 기본 스킬.
- `combat.skills[].epiphany` / `tier`: 깨달음 트리거 키, 트리 계층(선행 노드).
- `epiphanies`: `{id, trigger(flag/clue/ending/combat), grants_skill, insight, narrative_hint}` 목록.
- `scenario.unlock`: 시나리오 자체 해금 조건(튜토리얼=Neo-Seoul은 기본 해금, 그 외는 조건).

## 변경 지점

1. **`progression.py`** — 신규 버킷 + grant 규칙. 깨달음 이벤트 평가(`evaluate_epiphanies(loop_state, scenario)`), 통찰 적립/소비 헬퍼. `apply_meta_progression_to_state`가 learned_skills/insight를 루프 state에 주입.
2. **`combat_service.py:77`** — `skill_ids`를 **learned_skills로 필터**(없으면 base_skills fallback). 동료(`_build_allies`)도 동일하게 learned/base 기준.
3. **온보딩(`/scenarios` + `OnboardingPanel.tsx`)** — 해금된 아키타입만 선택 가능, 미해금은 잠금(조건 힌트) 표시. 시나리오 목록도 해금 게이트.
4. **깨달음 트리거 배선** — 서사 진행(scene flags/clue 획득/엔딩/전투 결과)에서 `epiphanies` 조건 평가 → `unlocked_skills`/`insight_points` 적립. `session.py` 전이 시점에 평가(메타 진행과 같은 트랜잭션).
5. **Codex Skill 탭(`CodexPanel.tsx` + API)** — 신규 섹션:
   - 보유/미보유/잠금 스킬을 `role`별 그룹·트리 노드로 표시(효과/cost/range/cooldown/tags 카드).
   - 통찰 잔액 표시, 미습득 노드에 **[습득 -Np]** / 보유 노드에 **[강화 -Np]** 버튼 → API로 포인트 소비.
   - 잠금 노드는 깨달음 힌트(`narrative_hint`)만 노출.
   - 신규 엔드포인트: `GET /api/v1/players/{id}/skills`(트리 상태), `POST .../skills/learn`(포인트 소비).
6. **튜토리얼 시퀀싱** — Neo-Seoul(Ghost/세린)을 튜토리얼 루프로 명시(부트/온보딩 카피 연동). 완료 시 다른 아키타입/시나리오 해금 grant.

## 단계(Phasing) — 리스크 완화

- **Phase 1 — 아키타입 해금 + 기본/습득 스킬 필터 + Codex Skill 표시(읽기)**:
  - `unlocked_archetypes`/`learned_skills`/`base_skills`, 온보딩 게이트, combat_service 스킬 필터, Codex Skill 탭(효과 표시 + 보유/미보유 구분, 포인트 없음).
  - *깨달음=자동 grant(이벤트 해금만)로 먼저 동작.* 가장 안전, 즉시 가치.
- **Phase 2 — 통찰 포인트 + 트리 투자(쓰기)**:
  - `insight_points`/`skill_ranks`, 적립/소비, Codex 트리 노드 [습득]/[강화] 버튼 + 엔드포인트, 선행 노드(tier) 게이팅.
- **Phase 3 — 깨달음 서사 연출 + 시나리오 해금 흐름**:
  - 깨달음 발생 시 전용 알림/연출(전투 이펙트 플랜의 연출 톤 재사용), 시나리오 간 진행 개방 UX.

## 검증 / 리스크

- **회귀**: 현재 "전체 스킬 보유" → "learned만"으로 바뀌므로 기존 전투 테스트가 스킬 가용성에 의존하면 base_skills 기본값으로 보정 필요. 신규 단위 테스트: 아키타입 게이트, 깨달음 grant, 통찰 소비/잔액, combat 스킬 필터.
- **E2E**: 온보딩이 Ghost 단일 노출로 시작 → `tests/playwright/test_e2e_play_checklist.py`의 아키타입 선택 단계(현재 "Netrunner"/기본 매핑) 갱신 필요.
- **밸런스**: 통찰 적립/비용 곡선은 실 플레이 로그로 재조정(기존 전투 밸런스 패턴).
- **데이터 일관성**: 깨달음/스킬/시나리오 해금 조건이 scenario.json에 모이므로, 신규 시나리오 추가 시 같은 스키마로 자동 동작(글라스 라이브러리 확장과 호환).
- **combat-VFX 연계**: 스킬 이펙트(VFX 플랜)는 `role`/`tags`를 키로 쓰는데, 이 트랙이 "어떤 스킬을 보유/사용하는가"를 정한다 — 데이터 모델 공유, 충돌 없음. VFX Phase 1은 본 트랙과 독립적으로 선행 가능.

## 권장 순서

1. **전투 이펙트 Phase 1**(독립, 승인 게이트 없음) — 별도 플랜.
2. **본 트랙 Phase 1**(아키타입 해금 + 스킬 필터 + Codex Skill 표시).
3. **본 트랙 Phase 2**(통찰/트리 투자).
4. 파티 조작 2단계 / glass-library / 전투 이펙트 Phase 2·3.
