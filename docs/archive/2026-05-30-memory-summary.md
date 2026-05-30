# 2026-05-30 Archive Memory Summary Policy

상태: `[x]` Policy designed, `[x]` rollup 구현 완료 (Streamlit/score blend 포함)

이 문서는 `world_memories`와 `narrative_shards`가 루프 누적으로 무한정 늘어나는 문제에 대한 장기 요약/압축 정책을 설계한다. 최신 rolling plan은 `docs/NEXT_PLAN.md`를 따른다.

## Context

Phase 12에서 archive 시 비-Echo 기억을 저장한다.

- `world_memories`: 루프당 `loop_archive` 1건(`final_title`, `stability`, `tension`, `phase` 등). `session._world_memory_from_archive`.
- `narrative_shards`: 루프당 1건(`symbol`, `emotional_tone`, `text`). `session._narrative_shard_from_archive`.
- archive dedup으로 동일 루프 중복 저장은 막지만, 루프 수가 늘면 두 테이블은 선형 증가한다.

현재 runtime 사용 범위는 제한적이다.

- `_initial_loop_scores`: 최근 archive `world_memories`의 마지막 8건 중 5건만 사용.
- `list_narrative_shards(..., limit=8)`: 최근 8건만 NarrativeContext에 반영.
- `NoveltyController`: 최근 6개 루프의 최신 scene만 사용.

즉 **오래된 기억은 이미 runtime 입력에서 제외**되지만, 저장소에는 계속 쌓이고 prompt/통계 계산에 잠재적 노이즈가 된다.

## Goals

1. 저장소 무한 증가를 막는다.
2. 오래된 개별 기억을 손실 없이 "압축된 요약"으로 보존한다.
3. runtime 입력(점수 보정/novelty/shard prompt)의 신호 품질을 유지하거나 개선한다.

## Policy Design

### 1. Retention Window (활성 기억)

- player별 `world_memories(loop_archive)` 활성 보존: 최근 N=20건.
- player별 `narrative_shards` 활성 보존: 최근 N=20건.
- 활성 윈도우 안의 기억은 지금처럼 원본 그대로 runtime에 노출한다.

### 2. Rollup Summary (압축 기억)

윈도우를 초과하는 오래된 기억은 삭제하지 않고 **rollup 기억 1건으로 압축**한다.

- `world_memories`에 `kind="archive_rollup"` 레코드 추가:
  - `player_id`
  - `loop_count`: 압축된 루프 수
  - `avg_stability`, `avg_tension`
  - `phase_histogram`: 종료 phase별 빈도
  - `tone_histogram`: shard `emotional_tone` 빈도
  - `top_symbols`: 자주 등장한 symbol 상위 K개
  - `window`: 압축 대상 루프의 시간/인덱스 범위
- rollup은 누적 가능하다. 새 압축이 생기면 기존 rollup과 가중 평균으로 병합한다(loop_count 가중).

### 3. Compaction Trigger

- 압축은 archive 시점에 점검한다: archive 후 player 활성 기억이 N을 초과하면, 가장 오래된 초과분을 rollup으로 흡수하고 원본 활성 레코드는 `kind="archive_compacted"`로 표시(또는 별도 보존 테이블로 이동)한다.
- MVP 단계에서는 hard delete 대신 status 표시만으로 "활성 목록에서 제외"한다. 보존 가치를 유지하면서 활성 쿼리를 가볍게 한다.

### 4. Runtime Consumption

- `_initial_loop_scores`: 활성 윈도우 + rollup의 `avg_stability`/`avg_tension`을 함께 반영한다. rollup은 장기 추세, 활성 윈도우는 최근 변동을 담당한다.
- `NoveltyController`: 활성 shard/scene만 사용(현행 유지). rollup의 `top_symbols`는 "최근 반복 회피"가 아니라 "장기 모티프 유지" 신호로 별도 활용 가능(후속).
- `narrative_shards` prompt 반영: 활성 윈도우만 사용(현행 유지).

## Out Of Scope

- LLM 기반 자연어 요약(현 단계는 통계적 rollup만). 필요 시 후속.
- 별도 보존 테이블 신설(우선 status 컬럼/플래그로 처리).
- 실시간 압축(현 단계는 archive 시점 동기 점검).

## Implementation Steps

1. `[x]` `_initial_loop_scores`에 rollup 반영 추가 + 단위 테스트.
2. `[x]` archive 흐름에 compaction 트리거(`_compact_player_archives`)와 rollup 병합 함수(`_merge_archive_rollup`) 추가 + 단위 테스트.
3. `[x]` `world_memories` 활성 쿼리에서 `archive_compacted` 제외 (kind 필터로 자동 제외).
4. `[x]` Streamlit Memory 패널에 rollup 요약 노출("Long-term summary" expander).
5. `[x]` `make test`(54) / `make test-db` / `make smoke-local` 회귀 + Postgres e2e 압축 검증.

## Implementation Notes (2026-05-30)

- 구현된 rollup content: `player_id`, `loop_count`, `avg_stability`, `avg_tension`,
  `phase_histogram`, `tone_histogram`, `symbol_histogram`, `window`. tone/symbol은
  흡수 대상 loop의 `narrative_shards`에서 파생한다(설계의 `top_symbols`는 저장 시
  전체 `symbol_histogram`로 보존하고 표시 시 상위 K개를 계산).
- compaction은 hard delete 대신 흡수 대상 `loop_archive`를 `kind="archive_compacted"`로
  재저장한다(`memory_id` upsert). 활성 소비자는 모두 `kind == "loop_archive"`만 읽으므로
  쿼리 변경 없이 자동 제외된다.
- `ARCHIVE_RETENTION = 20`(기본). archive마다 `_compact_player_archives`가 동기 점검한다.
- LLM 자연어 요약은 여전히 out of scope.

## Decision Summary

- 정책: **retention window + 통계 rollup 압축**, hard delete 없이 status 표시로 활성 목록 축소.
- 활성 윈도우 기본값 N=20 (튜닝 가능).
- 구현은 이 문서의 Implementation Steps로 후속 진행한다. 결정은 `docs/DECISIONS.md`에 요약한다.
