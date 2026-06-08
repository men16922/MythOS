# Progression · Inventory · Equipment 데이터모델 통합 패스

작성: 2026-06-09
상태: `[/]` 진행 중. 확정: 해금=player+scenario, 인벤토리/장비=loop 단위.
- `[x]` 1단계 토대: migration 005(player_progression+loop_inventory)+백필+store 계층(`eacc847`).
- `[x]` 2단계 progression 전환: load/persist_progression 헬퍼, session/ProgressionService read·write 전환(`5ec98e4`).
- `[x]` 3단계 인벤토리 전환: PostgresMythOSStore.save_loop/get_loop에서 중앙집중식
  dehydrate/hydrate — `loop.state._inventory`를 loops.state에서 분리해 loop_inventory 테이블로
  저장, get_loop이 working form으로 재주입. CombatService/progression/engine **무변경**(투명).
  인메모리 테스트 스토어는 자체 save/get이라 무영향. (CombatService store 주입 대신 store 경계
  방식을 택해 전투 영속화 회귀 위험 회피.)
- `[ ]` 4단계 장비: scenario items에 `kind:equipment`+slot+stats, 착용 토글, 전투 시작 보너스 합산, UI(#4).

## 목표

JSONB-on-row에 얹혀 있던 **진행도(해금)·인벤토리·장비**를 관계형 전용 테이블로 정리한다.
성능이 아니라 **정합성·확장성·쿼리 가능성**이 목적이다(로컬 1인 규모에선 성능 이슈 없음).
동시에 미구현이던 **실제 장비 착용 시스템**을 이 데이터모델 위에 올린다.

## 현재 상태(문제)

- **진행도/해금**: `MetaProgression`(runs_completed, unlocked_skills/archetypes/traits/allies/
  starting_items, learned_skills, skill_ranks, insight_points, codex_unlocks, epiphanies_seen,
  endings_seen, total_* …)를 `player_memories` 테이블에 `kind="meta_progression"` JSONB row로
  저장. 갱신마다 새 row append → 읽을 때 player+scenario 필터 후 `created_at` 최신 1개 스캔
  (`latest_meta_progression`). 무한 증가 + "latest wins" 함정 + 가로 쿼리 불가.
- **인벤토리**: `loops.state["_inventory"]` JSONB 배열. 항목이 dict/문자열 혼재(방금 serializer
  drift 버그). 루프 단위(loop-scoped) — 새 루프면 초기화.
- **장비**: 메커니즘 없음. 아이템 kind는 consumable/key/data/material만 존재.

## 타깃 스키마 (migration 005)

```sql
-- 진행도: player+scenario 당 단일 mutable row (append-scan 제거)
CREATE TABLE IF NOT EXISTS player_progression (
  player_id    TEXT NOT NULL REFERENCES players(player_id),
  scenario_id  TEXT NOT NULL,
  runs_completed     INTEGER NOT NULL DEFAULT 0,
  insight_points     INTEGER NOT NULL DEFAULT 0,
  total_clues        INTEGER NOT NULL DEFAULT 0,
  total_combats_won  INTEGER NOT NULL DEFAULT 0,
  total_combats_lost INTEGER NOT NULL DEFAULT 0,
  -- 배열/맵은 통째로 읽고 쓰므로 JSONB 컬럼 유지(과도 정규화 회피)
  unlocked_skills          JSONB NOT NULL DEFAULT '[]',
  learned_skills           JSONB NOT NULL DEFAULT '[]',
  skill_ranks              JSONB NOT NULL DEFAULT '{}',
  unlocked_archetypes      JSONB NOT NULL DEFAULT '[]',
  unlocked_traits          JSONB NOT NULL DEFAULT '[]',
  unlocked_allies          JSONB NOT NULL DEFAULT '[]',
  unlocked_starting_items  JSONB NOT NULL DEFAULT '[]',
  codex_unlocks            JSONB NOT NULL DEFAULT '[]',
  epiphanies_seen          JSONB NOT NULL DEFAULT '[]',
  endings_seen             JSONB NOT NULL DEFAULT '[]',
  allies_met               JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, scenario_id)
);

-- 인벤토리: 보유 아이템 (scope는 아래 결정에 따라 loop_id 또는 player_id+scenario_id)
CREATE TABLE IF NOT EXISTS loop_inventory (
  loop_id   TEXT NOT NULL REFERENCES loops(loop_id) ON DELETE CASCADE,
  item_id   TEXT NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 1,
  equipped  BOOLEAN NOT NULL DEFAULT FALSE,  -- 장비 착용 상태
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (loop_id, item_id)
);
```

- 아이템 **정의**(name/kind/rarity/effect/slot/stats)는 DB가 아니라 `scenario.json combat.items`가
  권위. 인벤토리 테이블엔 id+수량+착용여부만(이름은 serializer가 정의에서 해석 — 기존 방식 유지).
- 장비 아이템 정의 확장: `{"id","name","kind":"equipment","slot":"weapon|armor|accessory",
  "stats":{"strength":1,...}}`.

## 장비 메커니즘

- 착용/해제: 인벤토리 UI(기억의 별자리 #4)에서 토글 → `loop_inventory.equipped`.
- 보너스 적용: 전투 시작 시(`session._begin_requested_combat`/`start_combat`) 착용 장비의
  `stats` 합산을 `player_stats`에 가산해 `combat.begin`에 전달. 슬롯당 1개 제한.

## 코드 surface

- `migrations/005_progression_inventory_equipment.sql` — 테이블 + **백필**(기존 최신
  meta_progression player_memory row → player_progression, loops.state._inventory →
  loop_inventory).
- `store.py` ABC + `postgres_store.py` + 테스트용 in-memory store:
  `get_progression(player_id,scenario_id)`/`save_progression(...)`,
  `list_inventory(loop_id)`/`set_inventory(loop_id, items)`/`set_equipped(loop_id,item_id,bool)`.
- `progression.py`: `latest_meta_progression`/저장 경로를 store 테이블로 교체(MetaProgression
  dataclass·to_content/from_content 형태는 재사용).
- `combat_service.py`: loot 적립을 loop_inventory로(또는 store 콜백). 소비/착용도 테이블 경유.
- `session.py`: progression read/write를 테이블로, 전투 시작 장비 보너스 합산.
- `serializers.py`: `inventory`를 store에서(이미 resolved) — loop.state 의존 제거.
- `DECISIONS.md`(데이터모델 변경 기록), `STATUS.md`/`NEXT_PLAN.md`, 본 plan 상태 갱신.

## 결정 필요

1. **인벤토리/장비 scope** — loop 단위(현 의미 유지, 루프형 로그라이크) vs player 단위(루프
   넘어 영속). 해금(progression)은 명백히 player+scenario 단위. 권장: 인벤토리/장비는 **loop
   단위**(전리품은 런 자원, 영속되는 건 Echo+해금만), 장비 *해금*은 player_progression.
2. **백필 방식** — SQL 인라인 vs 1회 python 스크립트. 권장: migration SQL 내 INSERT…SELECT.
3. **하위호환** — 진행 중 루프의 loop.state._inventory를 백필 후에도 읽을지(읽기 폴백 1버전 유지).

## 단계 (구현 시)

1. 005 migration + 백필. 2. store ABC/구현/in-memory. 3. progression.py 전환 + 테스트.
4. combat/session 인벤토리·loot 전환. 5. 장비 정의(scenario)+보너스+착용 토글. 6. serializer/UI.
7. 회귀 테스트 + DECISIONS/STATUS/plan 갱신.
