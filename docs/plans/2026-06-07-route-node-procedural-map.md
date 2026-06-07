# Route-Node Procedural Operation Map (Step 1)

작성일: 2026-06-07
상태: Step 1 구현. 백엔드 결정적 생성기 + 직렬화 + 작전 지도 노드 그래프 뷰.

## 결정 (사용자 확인)

- 방향: **Typed Node Catalog + 결정적 절차 생성 하이브리드**. 노드 유형은 사전 정의,
  배치/순서/분기는 로그라이크처럼 랜덤(단 루프 시드로 결정적), 각 장면 묘사는 LLM이 담당.
- 비주얼노벨식 흐름 고려: 노드 = 장면, edge = 선택지, 다음 노드 = 분기.
- 이번 범위(**Step 1**): 백엔드 생성기 + 지도 뷰까지. 선택지를 edge로 묶는 director 통합은 다음 단계.

## 왜 layered DAG (디아블로 오픈맵 아님)

Neo-Seoul은 필수 비트(세린 구조 → 단서 → 카이 각성 → IX 대면)와 45분 페이싱이 있는 서사다.
완전 오픈 랜덤 던전은 막 순서/보스 위치/페이싱을 깨뜨린다. Slay the Spire식 **레이어드 DAG**가
랜덤성(어떤 노드/어떤 분기)을 주면서도 입구(story)·출구(boss)·막 순서를 보장한다. 레이어를
`playability.golden_path` 6막에 매핑한다.

## 데이터 (scenario.json → 신규 top-level `route_map`)

```
route_map:
  node_types:   # 게임플레이 규칙을 가진 사전 정의 유형 (동적 생성의 재료)
    story|clue|combat|patrol|market|rest|event|boss → {label, glyph, risk, reward, combat}
  layers:       # = golden_path 막. 각 레이어는 fixed 또는 pool에서 width개 샘플
    - {arc, title, width, fixed:[...] | pool:[...]}
```

- `combat: true` 유형(combat/patrol/boss)만 향후 전투 엔진을 트리거(다음 단계).
- `reward`는 결정적 보상 힌트(insight/stability 등). director 통합 시 실제 적용.

## 생성기 (`mythos_runtime/route_map.py`, 결정적)

`build_route_map(config, seed) -> dict` (state["_route_map"]에 저장):

```
{ version, seed, current, visited:[...],
  nodes: { id: {id,type,layer,arc,label,glyph,risk,reward,combat,col} },
  edges: { id: [next_id,...] },
  layers: [[id,...], ...] }
```

알고리즘 (모든 랜덤은 `Dice(f"{seed}:route:...")`):
1. 레이어별로 width개 노드 생성. fixed 레이어는 고정 유형, pool 레이어는 pool에서 샘플.
   각 비-최종 레이어에 **non-combat 노드 ≥1** 강제(전투 회피 루트 보장).
2. edge 생성(Slay the Spire식): 레이어 i 각 노드를 i+1의 1~2개 노드에 연결.
   연결성 불변식: 모든 노드 outgoing ≥1, 다음 레이어 모든 노드 incoming ≥1.
   non-combat 노드는 가능하면 non-combat 다음 노드로 우선 연결(회피 경로 thread).
3. start = layer0 단일 story, end = 마지막 layer 단일 boss.

불변식(단위 테스트):
- 같은 seed → 동일 그래프(결정성).
- start=story, end=boss.
- 그래프 연결(start→boss 도달 가능).
- **전투 회피 경로 1개 + 전투 경로 1개** 모두 존재(완료 기준).

## 통합

- `session._prepare_start_loop`: seed 계산 직후 `build_route_map`로 생성,
  `initial_state["_route_map"]`에 주입. serializer는 `to_json_dict(state)`로 자동 전달.
- `_route_map` 없을 때(config 미정의/타 시나리오)는 생성 생략 — 기존 `_map`이 호환 fallback.

## 프론트 (`GameAside.tsx`)

- `OperationMapPanel`을 노드 그래프 뷰로 교체: 레이어를 행으로, 노드를 칩으로,
  현재 노드 강조, 다음 후보(현재의 edge 대상) 강조, 방문 dim, 유형 glyph + 위험/보상 배지.
- `_route_map` 없으면 기존 좌표 미니맵으로 fallback(호환 계층).

## 다중 관점 anchor (영화 교차 스토리)

임팩트 있는 스토리 비트(anchor)는 단일 장면이 아니라 **여러 관점(perspectives)** 으로 저작한다.
같은 장면을 사람/증거/안전/통제 축의 다른 시점(lens)에서 보고, 플레이어가 누적한 flag가
`when`을 만족하는 관점이 그 세션의 진행으로 선택된다(없으면 `default_perspective`).

각 perspective 필드:
- `id`/`lens`/`axis`(choice axis)/`summary`(시점별 장면 시드)
- `when`: 이 관점을 선택하는 route flag (route_branches와 정합)
- `crosses`: 교차하는 다른 anchor 비트(여러 영화 스토리가 교차하는 효과)
- `effect`: 세션 영향(flags/stat 델타/relationship)
- `ending_influence`: 이 관점이 기우는 엔딩(들)

boss anchor(`ix_confrontation`)의 4관점이 4엔딩(safe_refuge/code_rewrite/noble_sacrifice/erasure)을
모두 커버 → "플레이어 루트 → 세션 영향 → 엔딩 도출"이 데이터로 닫힌다.
관점 선택/effect 적용/ending 판정의 실제 런타임 실행은 director 통합 단계.

## 보류 (다음 단계 = director 통합)

- 현재 노드의 outgoing edge를 실제 선택지로 노출, 선택 시 current 이동 +
  combat 노드 진입 시 전투 엔진 트리거 + reward 적용.
- 누적 flag로 anchor perspective 선택 → `effect` 적용 → `ending_influence` 누계로 엔딩 판정.
- LLM이 선택된 perspective의 `summary`/`crosses`를 시드로 노드 장면 + edge 라벨 "맛" 생성
  (타입/위험/보상/관점 배지는 데이터 유지). anchor 큐레이트 이미지를 장면에 표시.
- `_map` 호환 계층 제거.
