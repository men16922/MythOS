# Project MythOS Implementation Tracker

작성일: 2026-05-29

> Archive note: 이 문서는 M0-M10 상세 구현 추적 archive로 보존한다. 현재 상태는 `docs/STATUS.md`, 다음 계획은 `docs/NEXT_PLAN.md`, 날짜별 계획은 `docs/plans/`, 증분 작업 로그는 `docs/PROGRESS_LOG.md`, 완료 요약은 `docs/COMPLETED_SUMMARY.md`, 결정 기록은 `docs/DECISIONS.md`에서 관리한다.

이 문서는 `docs/DRAFT.md`(기획)와 `docs/DESIGN.md`(설계)를 실제 구현 작업으로 쪼개고, 로드맵과 진행 상황을 계속 기록하기 위한 작업 추적 문서다. (구 `PLAN.md`의 로드맵·설계 원칙·리스크 대응은 이 문서와 `DESIGN.md` §17–§18로 통합되었고, `DIAGRAMS.md`·`ROUGH.md`는 `DESIGN.md` §19–§20으로 통합되었다.)

## Status Legend

- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- `[!]` Blocked
- `[~]` Deferred

## Current Snapshot

현재 상태:
- `[x]` 로컬 이미지 생성 에이전트 구현
- `[x]` Ollama prompt expansion 검증
- `[x]` Hugging Face FLUX 접근 승인
- `[x]` FLUX.1-schnell MPS smoke 생성 검증
- `[x]` 기획/설계/다이어그램 문서 정리
- `[x]` Docker 기반 로컬 인프라 구성
- `[x]` Database schema/migration baseline 구현
- `[x]` MythOS core domain model 구현
- `[x]` PostgreSQL persistence/store layer 구현
- `[x]` Narrative Director baseline 구현
- `[x]` Validator and Loop Engine 구현
- `[x]` Visual Service integration 구현
- `[x]` CLI loop vertical slice 구현
- `[x]` Streamlit playable demo 구현/검증

현재 개발 원칙:
- Docker는 PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer 같은 로컬 인프라만 담당한다.
- Ollama와 FLUX worker는 Mac host에서 실행한다.
- LLM provider는 Ollama OpenAI-compatible API를 기본으로 둔다.
- 이미지 provider는 현재 `mythos_image_agent`의 FLUX MPS 경로를 재사용한다.

## Milestone Overview

| ID | Milestone | Status | Exit Criteria |
| --- | --- | --- | --- |
| M0 | Repo baseline cleanup | `[x]` | docs 이동, smoke 산출물 정리, current image agent 유지 |
| M1 | Local Docker infra | `[x]` | `make infra-up` 후 Postgres/MinIO/Redis/OTel 확인 |
| M2 | Database schema | `[x]` | 초기 migration 적용, 핵심 table 생성 |
| M3 | Core domain models | `[x]` | Player/Loop/Scene/Event/Memory 모델과 테스트 |
| M4 | Store layer | `[x]` | PostgreSQL CRUD와 transaction boundary |
| M5 | Narrative Director | `[x]` | Ollama JSON scene 생성과 repair/fallback |
| M6 | Loop Engine | `[x]` | 3턴 이상 루프 상태 전이 |
| M7 | Visual Service integration | `[x]` | Scene image + metadata 저장 |
| M8 | CLI vertical slice | `[x]` | player 생성부터 archive까지 로컬 플레이 |
| M9 | Observability and QA | `[x]` | trace/log skeleton, smoke command 정리 |
| M10 | Streamlit playable demo | `[x]` | 브라우저에서 player 생성부터 archive/next loop까지 플레이 |

## Phase 1. Local Docker Infra

목표: MythOS runtime이 사용할 로컬 인프라를 Docker Compose로 구성한다.

작업:
- `[x]` `docker-compose.local.yml` 작성
- `[x]` PostgreSQL service 추가
- `[x]` MinIO service 추가
- `[x]` Redis service 추가
- `[x]` OpenTelemetry Collector service 추가
- `[x]` Jaeger service 추가
- `[x]` Adminer service 추가
- `[x]` Docker volume 경로 `.docker/` 기준으로 정리 (+ `.gitignore` 추가)
- `[x]` MinIO bucket init container 또는 bootstrap script 결정 → compose `minio-init` (mc) container
- `[x]` `.env.example`에 infra env 추가
- `[x]` `Makefile`에 `infra-up`, `infra-down`, `infra-logs`, `infra-ps`, `infra-reset` 추가

검증:
- `[x]` `docker compose -f docker-compose.local.yml up -d`
- `[x]` Postgres healthcheck 통과
- `[x]` Redis healthcheck 통과
- `[x]` MinIO console 접속 가능
- `[x]` Adminer 접속 가능
- `[x]` Jaeger UI 접속 가능

결정 필요:
- `[x]` MinIO bucket 자동 생성 방식을 compose 내 init container로 둘지, Python/bootstrap script로 둘지 결정 → compose 내 `minio-init` (mc) init container 채택 (스택 자체 완결성 우선)
- `[x]` OTel config 파일 위치 결정 → `docker/otel-collector-config.yaml`

## Phase 2. Database Schema and Migration

목표: `docs/DESIGN.md`의 PostgreSQL table 설계를 실제 migration으로 만든다.

작업:
- `[x]` `migrations/` 또는 `sql/` 디렉터리 생성
- `[x]` `001_init.sql` 작성
- `[x]` `players` table 생성
- `[x]` `loops` table 생성
- `[x]` `scenes` table 생성
- `[x]` `events` table 생성
- `[x]` `player_memories` table 생성
- `[x]` `world_memories` table 생성
- `[x]` `narrative_shards` table 생성
- `[x]` `assets` table 생성
- `[x]` 기본 index 생성
- `[x]` migration apply 명령 추가
- `[x]` migration reset 명령 추가

검증:
- `[x]` fresh DB에 migration 적용
- `[x]` 재적용 시 실패 방식 확인 → idempotent reapply
- `[x]` Adminer/psql에서 table 확인
- `[x]` sample insert/select smoke

결정 필요:
- `[x]` migration 도구를 raw SQL + Makefile로 시작할지, Alembic을 도입할지 결정 → raw SQL + Makefile

## Phase 3. Core Domain Models

목표: LLM과 DB 구현에 의존하지 않는 순수 domain model을 만든다.

작업:
- `[x]` `src/mythos_core/__init__.py` 추가
- `[x]` `src/mythos_core/models.py` 추가
- `[x]` `src/mythos_core/ids.py` 추가
- `[x]` `src/mythos_core/seed.py` 추가
- `[x]` `src/mythos_core/clock.py` 추가
- `[x]` `PlayerProfile` 모델
- `[x]` `LoopState` 모델
- `[x]` `Choice` 모델
- `[x]` `Scene` 모델
- `[x]` `WorldEvent` 모델
- `[x]` `Echo` 모델
- `[x]` `PlayerMemory` 모델
- `[x]` `WorldMemory` 모델
- `[x]` `NarrativeShard` 모델
- `[x]` `AssetRecord` 모델
- `[x]` JSON serialization helper

검증:
- `[x]` `tests/test_seed.py`
- `[x]` `tests/test_models.py`
- `[x]` 같은 입력으로 같은 loop seed 생성
- `[x]` 모든 model JSON round-trip 통과

결정 필요:
- `[x]` dataclass로 시작할지 pydantic을 도입할지 결정 → dataclass

## Phase 4. Store Layer

목표: PostgreSQL을 primary store로 사용하되 runtime은 interface에 의존하게 한다.

작업:
- `[x]` `src/mythos_memory/store.py` interface 작성
- `[x]` `src/mythos_memory/postgres_store.py` 구현
- `[x]` connection config 로드
- `[x]` player CRUD
- `[x]` loop save/load
- `[x]` event append
- `[x]` scene save/load
- `[x]` memory save/load
- `[x]` asset metadata save/load
- `[x]` transaction helper
- `[x]` DB error mapping

검증:
- `[x]` local Postgres integration test
- `[x]` event append 후 loop 조회
- `[x]` scene 저장 후 turn_index 기준 조회
- `[x]` transaction rollback smoke

결정 필요:
- `[x]` DB client를 `psycopg`로 할지 SQLAlchemy Core로 할지 결정 → `psycopg`

## Phase 5. Narrative Director

목표: Ollama가 MythOS scene payload를 구조화된 JSON으로 생성하게 한다.

작업:
- `[x]` `src/mythos_narrative/director.py`
- `[x]` `src/mythos_narrative/prompts.py`
- `[x]` `src/mythos_narrative/schemas.py`
- `[x]` `src/mythos_narrative/parser.py`
- `[x]` canonical world context 작성
- `[x]` first scene prompt 작성
- `[x]` next scene prompt 작성
- `[x]` JSON parse 구현
- `[x]` JSON repair prompt 구현
- `[x]` fallback scene 구현
- `[x]` visual_brief 길이 제한

검증:
- `[x]` Ollama 호출 없이 fallback scene 생성
- `[x]` `--dry-run` style sample context로 JSON 생성
- `[x]` malformed JSON repair test
- `[x]` visual_brief가 FLUX prompt 제한에 맞는지 확인

## Phase 6. Validator and Loop Engine

목표: LLM output을 검증한 뒤 loop state를 전이한다.

작업:
- `[x]` `src/mythos_loop/validator.py`
- `[x]` `src/mythos_loop/engine.py`
- `[x]` `src/mythos_loop/events.py`
- `[x]` phase transition rule
- `[x]` stability/tension clamp
- `[x]` choice count validation
- `[x]` state_delta allowed keys
- `[x]` ended loop mutation guard
- `[x]` Echo activation rule
- `[x]` archive trigger rule

검증:
- `[x]` invalid phase transition rejected
- `[x]` invalid state_delta rejected
- `[x]` 3-turn loop state transition test
- `[x]` archive trigger test

## Phase 7. Visual Service Integration

목표: 현재 `mythos_image_agent`를 runtime의 Visual Service로 감싼다.

작업:
- `[x]` `src/mythos_runtime/visual_service.py`
- `[x]` `VisualGenerationRequest`
- `[x]` `VisualGenerationResult`
- `[x]` local FLUX provider adapter
- `[x]` MinIO upload adapter
- `[x]` local filesystem fallback
- `[x]` asset metadata 저장 연결
- `[x]` image generation disabled mode
- `[x]` failed generation status 기록

검증:
- `[x]` tiny FLUX smoke
- `[x]` real FLUX manual smoke
- `[x]` generated image metadata 저장
- `[x]` image failure 시 loop 계속 진행

## Phase 8. CLI Vertical Slice

목표: Web UI 없이 플레이 가능한 로컬 MythOS loop를 완성한다.

작업:
- `[x]` `src/mythos_runtime/connect_cli.py`
- `[x]` `new-player` command
- `[x]` `connect` command
- `[x]` `choose` 또는 interactive prompt
- `[x]` `resume` command
- `[x]` `archive` command
- `[x]` scene render formatting
- `[x]` choices render formatting
- `[x]` asset path/URL 출력
- `[x]` `Makefile`에 `connect-demo` 추가

검증:
- `[x]` player 생성
- `[x]` loop 시작
- `[x]` 3턴 이상 진행
- `[x]` loop 종료
- `[x]` Echo 저장
- `[x]` 다음 loop에서 Echo 반영
- `[x]` 대표 이미지 생성

## Phase 9. Observability and Developer Experience

목표: 로컬 개발 중 문제를 빠르게 파악할 수 있게 한다.

작업:
- `[x]` structured logging helper
- `[x]` request/session/loop id logging
- `[x]` OTel span skeleton
- `[x]` visual generation latency 기록
- `[x]` LLM latency 기록
- `[x]` `make smoke`
- `[x]` `make test`
- `[x]` `make lint` 도입 여부 결정 → MVP에서는 deferred

검증:
- `[x]` Jaeger에서 trace 확인
- `[x]` failed LLM call 로그 확인
- `[x]` failed image generation 로그 확인

## Phase 10. Streamlit Playable Demo

목표: CLI vertical slice를 Streamlit 기반 브라우저 데모로 노출해 실제 플레이 가능한 로컬 UI를 만든다.

원칙:
- 새 게임 로직을 Streamlit 안에 직접 구현하지 않는다.
- CLI에 흩어진 orchestration을 `RuntimeSessionService`로 분리하고, CLI와 Streamlit이 같은 service layer를 사용한다.
- authoritative state는 Postgres에 둔다. `st.session_state`는 현재 선택된 `player_id`, `loop_id`, UI 메시지 같은 얇은 view state만 관리한다.
- 기본 플레이는 이미지 생성 disabled로 빠르게 동작하게 한다.
- 이미지 생성은 sidebar toggle로 켠다. 초기에는 filesystem storage를 기본으로 두고, MinIO 저장은 옵션으로 둔다.

작업:
- `[x]` `src/mythos_runtime/session.py` 추가
- `[x]` `RuntimeSessionService` 구현
- `[x]` CLI orchestration을 `RuntimeSessionService`로 이동
- `[x]` `connect_cli.py`가 service layer를 사용하도록 리팩터링
- `[x]` `streamlit_app.py` 추가
- `[x]` `streamlit` 의존성 추가
- `[x]` `Makefile`에 `streamlit` target 추가
- `[x]` player 생성 UI
- `[x]` 기존 player id 입력/선택 UI
- `[x]` 새 loop 시작 UI
- `[x]` latest loop resume UI
- `[x]` scene render UI
- `[x]` phase/stability/tension status UI
- `[x]` choices button UI
- `[x]` free-form action 입력 UI
- `[x]` archive button UI
- `[x]` Echo 저장/다음 루프 반영 표시
- `[x]` image generation toggle
- `[x]` image storage mode 선택 (`filesystem` / `minio`)
- `[x]` generated image preview 또는 path/URI 표시
- `[x]` failed image generation 상태 표시
- `[x]` fallback narrative mode toggle
- `[x]` Ollama narrative mode smoke
- `[x]` sidebar infra links 표시 (Adminer, MinIO, Jaeger)

검증:
- `[x]` `make test`
- `[x]` `make test-db`
- `[x]` `make smoke-local`
- `[x]` `make streamlit` 실행
- `[x]` 브라우저에서 player 생성
- `[x]` 브라우저에서 loop 시작
- `[x]` 브라우저에서 3턴 이상 선택 진행
- `[x]` 브라우저에서 loop archive
- `[x]` archive 후 Echo memory 저장 확인
- `[x]` 다음 loop에서 Echo 반영 확인
- `[x]` image disabled 상태에서 텍스트 플레이 정상 진행
- `[x]` filesystem image 생성/preview 확인
- `[x]` MinIO image 저장/URI 확인
- `[x]` Ollama narrative mode로 scene 생성 확인

결정 필요:
- `[x]` Streamlit UI에서 player 목록을 DB에서 선택하게 할지, player id 직접 입력으로 시작할지 결정 → MVP는 player id 직접 입력
- `[x]` 이미지 기본 저장소를 filesystem으로 둘지 MinIO로 둘지 결정 → filesystem 기본, MinIO 옵션
- `[x]` Streamlit 화면에서 Jaeger/MinIO/Adminer 링크를 항상 노출할지 debug 섹션에 접을지 결정 → sidebar에 항상 노출

## Work Log

새로운 작업을 진행할 때 아래 형식으로 추가한다.

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

### 2026-05-29

- Status: `[x]` baseline docs and local image agent ready.
- Changed: docs moved under `docs/`; smoke output files cleaned; README paths updated.
- Verified: `python -m compileall agent.py src`; existing FLUX/Ollama smoke path was previously verified.
- Blockers: none for next infra step.
- Next: create Docker Compose local infra.

### 2026-05-30

- Status: `[/]` M1 local Docker infra authored; runtime bring-up not yet verified.
- Changed: added `docker-compose.local.yml` (postgres, adminer, minio, minio-init,
  redis, otel-collector, jaeger) with healthchecks and `.docker/` bind-mount volumes;
  added `docker/otel-collector-config.yaml` (OTLP in -> Jaeger traces, debug for
  metrics/logs); extended `.env.example` with DB/Redis/MinIO/OTel env; added
  `infra-up/down/logs/ps/reset` to `Makefile`; ignored `.docker/` in `.gitignore`.
- Verified: `docker compose -f docker-compose.local.yml config` PASS; OTel YAML parses.
- Blockers: Docker daemon not running in this session, so `make infra-up` and the
  per-service healthcheck/UI checks are still pending.
- Next: start Docker Desktop and run `make infra-up`, confirm Postgres/Redis/MinIO
  healthchecks + Adminer/Jaeger/MinIO consoles, then begin M2 (database schema).

### 2026-05-30

- Status: `[x]` M1/M2/M3 complete; ready to start PostgreSQL store layer.
- Changed: added `migrations/001_init.sql`; mounted migrations into Postgres;
  added `db-migrate`, `db-reset`, `db-shell`, and `test` Make targets; added
  `src/mythos_core` ids/clock/seed/models; added standard-library unittest coverage
  for deterministic seeds and model JSON round-trip.
- Verified: `make infra-up` PASS; Postgres/Redis/MinIO healthy; MinIO buckets
  created; Adminer/Jaeger/MinIO console HTTP 200; `make db-migrate` PASS;
  idempotent migration reapply PASS; `make db-reset` PASS; 8 public tables present;
  sample player insert/select PASS; `make test` PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none for store layer.
- Next: implement `src/mythos_memory/store.py` and a PostgreSQL-backed store,
  likely using `psycopg`.

### 2026-05-30

- Status: `[x]` M4 store layer complete; ready to start Narrative Director.
- Changed: added `psycopg[binary]` dependency; added `src/mythos_memory`
  store interface and `PostgresMythOSStore`; added DB-backed player, loop, event,
  scene, player/world memory, and asset persistence; added transaction rollback
  handling and `StoreError`; added `make test-db`.
- Verified: `make test` PASS; `make test-db` PASS against local Docker Postgres;
  `python -m compileall agent.py src tests` PASS.
- Blockers: none for Narrative Director.
- Next: implement `src/mythos_narrative` JSON scene generation with no-Ollama
  fallback first, then wire Ollama.

### 2026-05-30

- Status: `[x]` M5 Narrative Director baseline complete; ready to start Validator/Loop Engine.
- Changed: added `src/mythos_narrative` schema, prompt, parser, director, and smoke
  modules; added Ollama OpenAI-compatible JSON provider; added one-shot repair
  path and deterministic fallback scene; added `narrative-smoke` and
  `narrative-smoke-fallback` Make targets.
- Verified: `make narrative-smoke-fallback` PASS; `make narrative-smoke` PASS
  with Ollama; malformed JSON repair flow covered by tests; visual brief clamp
  covered by tests; `make test` PASS; `make test-db` PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none for Validator/Loop Engine.
- Next: implement `src/mythos_loop/validator.py`, `engine.py`, and `events.py`,
  then wire Narrative Director output into state transitions.

### 2026-05-30

- Status: `[x]` M6 Validator and Loop Engine complete; ready to start Visual Service integration.
- Changed: added `src/mythos_loop` validator, engine, and event helpers; implemented
  phase transition validation, score/delta clamping, choice validation, state delta
  key validation, ended-loop mutation guard, archive trigger, and Echo creation.
- Verified: `make test` PASS; `make test-db` PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none for Visual Service.
- Next: wrap `mythos_image_agent` in `src/mythos_runtime/visual_service.py`,
  add disabled/local-filesystem modes first, then MinIO upload.

### 2026-05-30

- Status: `[x]` M7 Visual Service integration complete; ready to start CLI vertical slice.
- Changed: added `src/mythos_runtime` visual service, filesystem storage adapter,
  MinIO storage adapter, local FLUX provider adapter, visual smoke command, and
  fake-provider tests; added `boto3` dependency for MinIO/S3 upload; added Make
  targets `visual-smoke`, `visual-smoke-disabled`, `visual-smoke-minio-db`, and
  `visual-smoke-flux-tiny`.
- Verified: `make visual-smoke` PASS; `make visual-smoke-disabled` PASS with DB
  asset row; `make visual-smoke-minio-db` PASS with MinIO upload + Postgres asset
  metadata; MinIO `head_object` PASS for uploaded PNG; `make visual-smoke-flux-tiny`
  PASS with FLUX.1-schnell MPS 128x128/1-step; `make test` PASS; `make test-db`
  PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none for CLI vertical slice.
- Next: implement `src/mythos_runtime/connect_cli.py` and wire player creation,
  loop start, Narrative Director, Loop Engine, Store, and optional Visual Service.

### 2026-05-30

- Status: `[x]` M8 CLI vertical slice complete; ready to start Observability and QA.
- Changed: added `src/mythos_runtime/connect_cli.py`; added `new-player`,
  `connect`, `choose`, `resume`, and `archive`; wired Postgres store, Narrative
  Director, Loop Engine, Echo memory persistence, and optional Visual Service;
  added latest loop/latest scene store queries; added `connect-demo` Make target;
  added image sizing options for tiny CLI image smoke.
- Verified: `make connect-demo` PASS; CLI `choose` + `resume` PASS; CLI `archive`
  PASS; next loop loads persisted Echo into `_active_echoes`; CLI `connect
  --with-image --filesystem-image --image-width 128 --image-height 128
  --image-steps 1` PASS with FLUX.1-schnell; `resume` prints asset path; Postgres
  asset row count PASS; `make test` PASS; `make test-db` PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none for Observability/QA.
- Next: add structured logging helper, smoke target aggregation, and minimal
  trace/log scaffolding.

### 2026-05-30

- Status: `[x]` M9 Observability and QA complete; local MVP implementation tracker is complete.
- Changed: added `src/mythos_runtime/observability.py` JSON logging, optional OTLP
  HTTP trace export, span context manager, and timed helper; instrumented
  Narrative Director, Visual Service, and CLI lifecycle events; added
  OpenTelemetry dependencies; added `smoke-local` and `smoke` Make targets; added
  observability tests.
- Verified: `make smoke` PASS; Jaeger API lists `mythos-local` service and MythOS
  spans; structured JSON logs include request ids and latency fields; failed
  narrative repair/fallback and failed visual generation logs covered by tests;
  `make test` PASS; `make test-db` PASS; `python -m compileall agent.py src tests` PASS.
- Blockers: none.
- Next: optional hardening/backlog: reduce test log noise, add lint/format gate,
  and decide whether Redis-backed async visual jobs are needed.

### 2026-05-30

- Status: `[x]` post-MVP documentation and test-noise cleanup complete.
- Changed: updated `README.md` from image-agent-only instructions to local MythOS
  runtime usage; documented infra, CLI, smoke commands, and image options; made
  `make test` and `make test-db` run with quiet log level by default.
- Verified: `make test` PASS with quiet output; `make smoke-local` PASS.
- Blockers: none.
- Next: optional product/runtime polish: add lint/format gate, add richer archive
  export, or start a lightweight Web UI.

### 2026-05-30

- Status: `[ ]` M10 Streamlit playable demo planned.
- Changed: added Phase 10 plan for extracting reusable runtime session service and
  building a Streamlit browser demo on top of the existing CLI/runtime stack.
- Verified: planning-only change.
- Blockers: none.
- Next: implement `RuntimeSessionService`, refactor CLI to use it, then add
  `streamlit_app.py`.

### 2026-05-30

- Status: `[x]` M10 Streamlit playable demo complete.
- Changed: added `RuntimeSessionService`; refactored CLI commands to share the
  service layer; added `streamlit_app.py`; added Streamlit dependency and
  `make streamlit`; fixed Streamlit widget state sync after browser testing.
- Verified: `make test` PASS; `make test-db` PASS; `make smoke-local` PASS;
  `make connect-demo` PASS; `make streamlit` running at `http://localhost:8501`;
  browser flow PASS for player creation, loop start, 3 turns, archive, Echo
  display, next loop Echo carry-over, free-form action, filesystem image preview,
  MinIO image URI, and Ollama narrative mode.
- Blockers: in-app browser `iab` session was unavailable, so browser verification
  used Playwright MCP instead.
- Next: product polish: add player list selection, richer scene styling, and a
  Streamlit-specific smoke script if repeated UI regression checks are needed.

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-05-29 | Keep PostgreSQL + MinIO + Redis local infra design | Current plan is adequate; no switch to DynamoDB for MVP |
| 2026-05-29 | Serve Ollama on Mac host, not Docker | Apple Silicon Metal acceleration and existing local setup |
| 2026-05-29 | Run FLUX worker on Mac host, not Docker | PyTorch MPS access is host-native |
| 2026-05-29 | Keep smoke PNGs out of repo | Generated artifacts are reproducible and noisy |
| 2026-05-30 | MinIO buckets via compose `minio-init` (mc) container | Self-contained stack; no separate host bootstrap script to remember |
| 2026-05-30 | OTel config at `docker/otel-collector-config.yaml` | Keeps infra config next to compose; mounted read-only into collector |
| 2026-05-30 | otel-collector owns host OTLP ports; Jaeger OTLP stays internal | Avoids 4317/4318 host conflict; collector forwards to `jaeger:4317` |
| 2026-05-30 | Start migrations with raw SQL + Makefile | Keeps MVP dependency-light; Alembic can be introduced when schema churn increases |
| 2026-05-30 | Start core models with dataclasses | Pure domain model has no runtime validation dependency yet; validator layer will enforce behavior |
| 2026-05-30 | Use `psycopg` for PostgreSQL store layer | Direct SQL keeps behavior explicit and matches current raw SQL migration approach |

## Verification Log

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-05-29 | `make doctor` | PASS | MPS, packages, Ollama, Hugging Face FLUX access checked |
| 2026-05-29 | `python agent.py ... --steps 1 --width 512 --height 512` | PASS | FLUX.1-schnell MPS smoke generation |
| 2026-05-29 | `.venv/bin/python -m compileall agent.py src` | PASS | Syntax check after cleanup |
| 2026-05-30 | `docker compose -f docker-compose.local.yml config` | PASS | Compose schema + env interpolation valid; daemon not running so no `up` |
| 2026-05-30 | `make infra-up` | PASS | Postgres/Redis/MinIO healthy; Adminer, Jaeger, MinIO console reachable |
| 2026-05-30 | `make db-migrate` | PASS | Created players, loops, scenes, events, memory, shard, asset tables |
| 2026-05-30 | `make db-migrate` reapply | PASS | SQL uses `IF NOT EXISTS`; reapply is idempotent |
| 2026-05-30 | `make db-reset` | PASS | Drops/recreates public schema and reapplies migration |
| 2026-05-30 | sample player insert/select | PASS | `player_smoke` insert/select verified before reset |
| 2026-05-30 | `make test` | PASS | 5 unittest tests |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M2/M3 |
| 2026-05-30 | `make test-db` | PASS | Postgres store CRUD and transaction rollback smoke |
| 2026-05-30 | `make test` | PASS | 7 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M4 |
| 2026-05-30 | `make narrative-smoke-fallback` | PASS | Deterministic fallback scene JSON emitted |
| 2026-05-30 | `make narrative-smoke` | PASS | Ollama generated parseable scene JSON |
| 2026-05-30 | `make test` | PASS | 15 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M5 |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M5 |
| 2026-05-30 | `make test` | PASS | 24 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M6 |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M6 |
| 2026-05-30 | `make visual-smoke` | PASS | Fake provider writes PNG through filesystem adapter |
| 2026-05-30 | `make visual-smoke-disabled` | PASS | Disabled generation records asset metadata in Postgres |
| 2026-05-30 | `make visual-smoke-minio-db` | PASS | Fake PNG uploaded to MinIO and asset metadata saved |
| 2026-05-30 | MinIO `head_object` for smoke PNG | PASS | Object exists with `image/png` content type |
| 2026-05-30 | `make visual-smoke-flux-tiny` | PASS | FLUX.1-schnell MPS 128x128/1-step through Visual Service |
| 2026-05-30 | `make test` | PASS | 27 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M7 |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M7 |
| 2026-05-30 | `make connect-demo` | PASS | Creates demo player and fallback first loop scene |
| 2026-05-30 | CLI `choose` + `resume` | PASS | Choice advances loop and renders latest scene |
| 2026-05-30 | CLI `archive` | PASS | Ends loop and saves Echo memory |
| 2026-05-30 | next CLI `connect` after archive | PASS | New loop state includes persisted Echo |
| 2026-05-30 | CLI tiny image connect | PASS | FLUX.1-schnell 128x128/1-step, filesystem asset path rendered |
| 2026-05-30 | `make test` | PASS | 27 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M8 |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M8 |
| 2026-05-30 | `make smoke` | PASS | compileall, unit tests, fallback narrative smoke, visual smoke, DB tests, MinIO smoke |
| 2026-05-30 | Jaeger `/api/services` | PASS | `mythos-local` service visible |
| 2026-05-30 | Jaeger `/api/traces?service=mythos-local` | PASS | MythOS spans visible |
| 2026-05-30 | `make test` | PASS | 30 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M9 |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py src tests` | PASS | Syntax check after M9 |
| 2026-05-30 | M10 planning update | PASS | Streamlit playable demo work items added to tracker |
| 2026-05-30 | `.venv/bin/python -m compileall agent.py streamlit_app.py src tests` | PASS | Syntax check after Streamlit service/UI work |
| 2026-05-30 | `make test` | PASS | 30 unittest tests; DB tests skipped unless `MYTHOS_RUN_DB_TESTS=1` |
| 2026-05-30 | `make test-db` | PASS | Postgres store integration still passing after M10 |
| 2026-05-30 | `make connect-demo` | PASS | CLI still works through `RuntimeSessionService` |
| 2026-05-30 | `make streamlit` | PASS | Streamlit server running on `http://localhost:8501` |
| 2026-05-30 | Browser Streamlit text play flow | PASS | player create, loop start, 3 turns, archive, Echo display, next loop Echo carry-over, free action |
| 2026-05-30 | `make smoke-local` | PASS | compileall, unit tests, fallback narrative smoke, visual smoke |
| 2026-05-30 | Browser Streamlit filesystem image flow | PASS | 128x128/1-step image generated and previewed from local path |
| 2026-05-30 | Browser Streamlit MinIO image flow | PASS | 128x128/1-step image generated and `s3://mythos-assets/...png` URI displayed |
| 2026-05-30 | Browser Streamlit Ollama narrative flow | PASS | Fallback off generated `The Glitching Threshold` scene through Ollama |

## Backlog

로컬 MVP(M0–M10)는 완료. 아래는 비전(`DRAFT.md`)과 설계(`DESIGN.md`)에 있으나 아직 구현되지 않은 후속 작업이다.

런타임/서사 기능:
- `[ ]` Variation Engine / Novelty Controller (루프 간 변주·반복 최소화) 구현.
- `[ ]` `world_memories` / `narrative_shards` 테이블을 런타임에서 실제로 채우고 다음 루프에 반영.
- `[ ]` Echo 외 World Memory 통계 기반 세계 재조정 로직.
- `[ ]` Redis 기반 비동기 visual job (현재는 동기 생성). MVP에서 Redis 필요 여부 재평가.

확장(장기 비전):
- `[ ]` Prototype Web UI (Next.js Connect Interface) — Streamlit 데모 다음 단계.
- `[ ]` Cloud-ready: Store/Visual/LLM provider 경계 뒤에서 Bedrock/DynamoDB/S3 등으로 교체 가능하게 정리.
- `[ ]` 모델/provider 추상화로 non-Ollama LLM 지원.

개발 경험:
- `[ ]` lint/format gate (현재 deferred).
- `[ ]` Mermaid render/export workflow (정적 PNG 다이어그램이 필요해질 경우).
- `[ ]` Decision Log가 비대해지면 `docs/ARCHITECTURE_DECISIONS.md` 분리.
