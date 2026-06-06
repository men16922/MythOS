# 2026-05-30 Narrative Runtime Depth Plan

상태: `[x]` Completed

## Context

Phase 11 Streamlit Demo Polish는 완료되었다. 다음 단계는 루프 간 반복을 줄이고, Echo 외 기억을 runtime narrative input으로 사용하기 위한 기반을 만든다.

최신 rolling plan은 `docs/NEXT_PLAN.md`를 따른다.

## Goal

Variation Engine / Novelty Controller의 첫 버전을 만들고, `world_memories`와 `narrative_shards`를 runtime에서 기록/조회할 수 있게 한다.

## Scope

작업:

- `[x]` 현재 `NarrativeContext`, `NarrativeDirector`, `RuntimeSessionService` 입력 구조 확인.
- `[x]` 최근 scene title/location/choice pattern 요약 방식 정의.
- `[x]` Variation Engine module 추가.
- `[x]` 반복 감지 결과를 다음 scene/loop prompt context에 반영.
- `[x]` loop 종료 또는 archive 시 `world_memories` 저장.
- `[x]` narrative shard 저장/조회 경로 추가.
- `[x]` fallback path에서 memory 반영 검증.
- `[x]` Ollama path에서 memory 반영 smoke.

검증:

- `[x]` `make test`
- `[x]` `make test-db`
- `[x]` `make smoke-local`
- `[x]` CLI 또는 service-level next loop memory reflection test
- `[x]` Browser Streamlit basic regression

## Out Of Scope

- 완전한 story planner.
- Redis async visual job.
- Next.js UI.
- Cloud provider migration.

## Expected Outputs

- 반복을 줄이기 위한 novelty signal이 runtime에 생긴다.
- `world_memories` 또는 `narrative_shards`가 실제 runtime flow에서 기록된다.
- 다음 loop/scene generation이 Echo 외 memory context를 받을 수 있다.

## 2026-05-30 Increment

완료:

- `src/mythos_narrative/variation.py`에 `NoveltyController`와 `NoveltySignal`을 추가했다.
- `NarrativeContext`에 `world_memories`, `narrative_shards`, `novelty_notes`를 추가하고 prompt payload에 반영했다.
- `MythOSStore`/`PostgresMythOSStore`에 `save_narrative_shard()`와 `list_narrative_shards()`를 추가했다.
- `RuntimeSessionService`가 start/choose 시 world memory와 narrative shard를 읽고 novelty notes를 전달한다.
- `archive()`가 Echo memory 외에 `world_memories`와 `narrative_shards`를 저장한다.
- fallback scene이 novelty/world memory context를 받을 때 반복 회피 힌트를 반영한다.

검증:

- `.venv/bin/python -m compileall src tests streamlit_app.py agent.py` PASS.
- `make test` PASS, 32 tests, 2 skipped.
- `make test-db` PASS.
- `make smoke-local` PASS.
- Service-level DB check PASS: archive 후 `world_memories_for_loop=1`, `narrative_shards_for_loop=1`, 다음 loop fallback title `Changed Signal at the Threshold`.
- Browser Streamlit basic regression PASS: saved player/loop selection and novelty-adjusted scene render.
- `make narrative-smoke` PASS through Ollama after JSON object response format and parser unwrap repair.
- Service-level Ollama memory smoke PASS: archived one fallback loop, loaded shard/novelty context, then created a non-fallback Ollama scene titled `The Echoing Core`.

남은 작업:

- choice intent pattern까지 포함한 novelty signal 확장 완료.
- Echo 외 World Memory 통계 기반 stability/tension 보정 설계.

## 2026-05-30 Choice Pattern Increment

완료:

- `NoveltySignal`에 `recent_choice_patterns`를 추가했다.
- 최근 scene choices의 intent 빈도를 `explorex1, interactx2` 같은 패턴으로 요약한다.
- novelty notes에 `Avoid repeating recent choice intent patterns` 지시를 추가했다.

검증:

- `.venv/bin/python -m compileall src tests streamlit_app.py agent.py` PASS.
- `make test` PASS, 37 tests, 2 skipped.
- `make test-db` PASS.
- `make smoke-local` PASS.
- Service-level check PASS: `archivex1, rewritex1`, `explorex1, interactx1` 패턴이 novelty notes에 포함됨.

남은 작업:

- archive memory 중복 저장 방지/요약 정책 설계.
- Streamlit 화면에서 world/shard memory 상태를 노출할지 결정.

## 2026-05-30 World Memory Score Increment

완료:

- archive된 `world_memories`의 최근 stability/tension을 기반으로 새 loop 초기 점수를 보정한다.
- 보정은 player별 archive memory만 사용해 다른 플레이어 기록이 섞이지 않게 했다.
- 보정 내역은 `loop.state.initial_world_memory_adjustment`에 delta, sample size, 평균값, reason으로 남긴다.
- high tension/low stability archive는 다음 loop를 더 불안정하게 시작하고, calm/stable archive는 약간 안정적으로 시작한다.

검증:

- `.venv/bin/python -m compileall src tests streamlit_app.py agent.py` PASS.
- `make test` PASS, 41 tests, 2 skipped.
- `make test-db` PASS.
- `make smoke-local` PASS.
- Service-level DB check PASS: stressed archive 후 다음 loop가 `stability=57`, `tension=35`, adjustment reason 포함.

후속 작업:

- archive memory 장기 요약 정책 설계.
- Streamlit 화면에서 world/shard memory 상태를 노출할지 결정.
- provider repair/fallback 비율을 추적할 QA 지표 설계.

## 2026-05-30 Archive Memory Dedup Increment

완료:

- archive 시 같은 `loop_id`와 `player_id`의 `loop_archive` world memory가 이미 있으면 추가 저장하지 않는다.
- archive 시 같은 `loop_id`의 narrative shard가 이미 있으면 추가 저장하지 않는다.
- 현재 store interface를 유지하고 런타임 레벨에서 idempotent하게 처리한다.

검증:

- `.venv/bin/python -m compileall src tests streamlit_app.py agent.py` PASS.
- `make test` PASS, 43 tests, 2 skipped.
- `make test-db` PASS.
- `make smoke-local` PASS.
- Service-level DB check PASS: 같은 loop를 재archive해도 world memory `1 -> 1`, narrative shard `1 -> 1`.

후속 작업:

- 오래된 archive memory를 요약/압축하는 정책 설계.
- Streamlit 화면에서 world/shard memory 상태를 노출할지 결정.
