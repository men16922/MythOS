# Roguelike + Tactical Combat Track — Design Snapshot

작성일: 2026-05-31

## 목표
«Neo-Seoul» 데모를 만족스러운 1인용 **로그라이크 TRPG**로:
- 턴제 + **위치/거리(체비쇼프) 전술** 전투.
- 성공 판정은 TRPG식 **스탯 + 다이스**.
- 적/아이템은 첫 시나리오에서 **사전 정의 풀** 사용.
- 전투는 **텍스트 기반이되 다이나믹**: 엔진이 결정적으로 판정→구조화 로그→LLM이 라운드별 산문 연출.
- 장면 이미지 옆 **터미널 레이더 UI** = 전술 보드(적/아군/플레이어 블립, 깜빡임).

## 핵심 원칙: 엔진 권위(authoritative) + LLM 서술
LLM은 HP·전리품·명중을 **직접 정하지 않는다**. 엔진이 플레이어 스탯 + **시드 RNG**로 결정적으로 굴려
**CombatLog**를 만든다. LLM(또는 fallback 내레이터)이 그 로그를 산문으로 변환 → 일관·공정 + 매번 다른 묘사.
상태는 전부 `loop.state` JSON 안(이미 자유 블롭 → **DB 마이그레이션 불필요**):
`_party`, `_inventory`, `_combat`(CombatState|null), `_run`(depth/encounters_cleared/dead).

## 스탯 / 파생치 (정본 5스탯 1–10, `docs/archive/DESIGN_SYSTEM_STATS.md`)
- `strength(근력), intelligence(연산), charisma(공명), agility(반사), perception(관측)`.
- 전투 그리드는 **strength·agility만** 기계적으로 사용. 연산/공명/관측은 GM 서사 판정용(해킹/설득/단서).
- `max_hp = 10 + strength` · `defense = 8 + agility//2 + armor` · `speed = 2 + agility//3` · `initiative = d20 + agility`.
- 근접 명중 `d20+strength` vs defense / 원거리 `d20+agility`. 데미지 = 무기 다이스 + (근접 str//2 / 원거리 agi//3). 자연20 = 크리(2배).

## 공간/턴 구조
- 아레나 `arena_w×arena_h`(기본 8×6), 좌표 (x,y), 거리=체비쇼프(대각=1).
- 근접 `reach`(1), 원거리 `range`(타일). 사거리 밖이면 이동 필요.
- 턴: 이동(최대 speed) + 행동 1회(attack/defend/flee/item). 적 AI: 접근·공격, 원거리는 거리 유지(kite), coward 저HP 도주.
- 한쪽 전멸/도주 시 종료. 매 게임턴(플레이어 1행동)=전투 1스텝(엔진이 플레이어+적 턴 일괄 resolve).

## 사전 정의 풀 (`scenario.json["combat"]`)
`weapons`(8), `archetype_loadout`, `bestiary`(정비/감시 드론·집행 유닛·글리치 망령), `items`(5),
`loot_tables`(3), `encounters`(4). `ScenarioConfig.combat` 로더 필드로 노출.

## 단계
- **A. 기반 — [x] 완료**: `mythos_core/dice.py` + `mythos_combat`(models/engine/factory/encounter) + 시나리오 풀 + 로더 + 유닛 테스트(dice 6, combat 8). 결정적 리플레이 검증.
- **B. 통합/프롬프트**: 런타임 전투 서브모드 배선, world_delta 확장(`start_combat`/`grant_items`/`hp`)·검증, 전투 로그→서사 연출(LLM+fallback), 퍼머데스→Echo.
- **C. 터미널 레이더 UI**: 이미지 옆 전술 보드(격자/블립/깜빡임/HP/턴순서/액션 선택).
- **D. 로그라이크 메타**: depth 스케일링, 절차적 전리품, 인카운터 구성, 밸런스.

## 검증
각 단계 `make lint`/`typecheck`/`test`. 전투는 시드 고정 → 결정적 리플레이 테스트로 회귀 방지.
