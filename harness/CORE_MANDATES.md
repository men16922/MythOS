# Project MythOS: Core Engineering Mandates

이 문서는 모든 AI 에이전트(Gemini, Claude, Cursor 등)가 공유하는 최상위 설계 및 엔지니어링 표준이다. 에이전트별 문서보다 이 파일과 `docs/AGENT_BRIEF.md`를 우선한다.

## 1. Runtime Principles

- **Language**: Python 3.11+ with explicit type hints and small dataclass-first domain boundaries.
- **Local-first inference**: Ollama, mflux/FLUX, audio generation 등 모델 추론은 Apple Silicon host 로컬 실행을 기본값으로 둔다.
- **Shared orchestration**: CLI, Streamlit, FastAPI/React 경로의 비즈니스 로직은 `RuntimeSessionService`에 둔다. entrypoint나 UI 계층에 loop orchestration을 복제하지 않는다.
- **Frontend split**: React + TypeScript SPA is the recommended active play path. Streamlit remains a playable/demo path and compatibility surface.

## 2. Data, Media, And Infra

- **RDBMS**: PostgreSQL with JSONB state/memory records.
- **Object storage**: MinIO/S3-compatible storage for generated assets and large media.
- **Queue/cache**: Redis for visual job queue, worker heartbeat, and transient locks.
- **Observability**: structured logs and OpenTelemetry/Jaeger spans should stay wired for runtime flows.
- **Generated assets**: `outputs/`, `.docker/`, `.env`, Hugging Face tokens, and generated model outputs are not source artifacts.

## 3. Generation And Validation

- **Narrative validation**: LLM-generated scenes must pass the Myth Protocol parser/validator path before state mutation.
- **Fallback path**: narrative, visual, and summary generation failures need deterministic or user-visible fallback behavior.
- **Context selection**: do not inject full Story Bible, full scenario, or full narrative shard history into prompts. Use phase/location/flags snippets and rolled-up `causality_summary`.
- **Visual consistency**: character scenes should use the existing mflux Redux portrait reference route when available.

## 4. Code And Test Discipline

- Prefer composition and provider/service protocols over inheritance-heavy designs.
- Keep pure unit tests independent of Docker. Gate DB tests behind `MYTHOS_RUN_DB_TESTS=1`.
- For runtime flow changes, run at least `make test`; use `make smoke-local` for broader local runtime changes and `make smoke` for persistence/MinIO behavior.
- For React/API UI changes, run `make frontend-build` or `make test-e2e` when the change touches user flow.

## 5. Agent Operations Discipline

세션 회고(usage insights) 분석에서 반복 확인된 실패 패턴을 막기 위한 운영 규칙이다.

- **Measure before performance fixes**: 성능/지연(latency) 이슈는 추정 기반 config 수정 전에 병목을 먼저 계측한다 — model load, prompt prefill, RAM/swap pressure, I/O 중 어디서 시간이 가는지 수치로 확인한 뒤 그 병목만 고친다. (과거 Ollama 설정/필드 재배열로 오진 후 실제 원인은 swap·prefill이었던 사례 반복.)
- **Docs-first status**: 프로젝트 상태 질문에는 git working tree나 코드 탐색보다 current docs(`AGENT_BRIEF` → `STATUS` → `NEXT_PLAN`)를 먼저 읽고 답한다.
- **Confirm structural moves**: 디렉터리 이동/리네임/재분류(`scratch/`, `bin/` 등)와 대규모 리팩터링은 시작 전에 범위와 전략을 사용자에게 확인한다. 임의로 폴더를 옮기지 않는다.
- **Shell discipline**: 셸 명령은 절대 경로를 쓴다(특히 `.venv/bin/python`). 이전 `cd`가 남긴 cwd에 의존하지 않는다 — cwd 의존으로 silent failure가 발생한 사례가 있다.
- **Verify before claiming done**: 자율(무감독) 사이클에서는 산출물이 실제로 존재하는지 검증한 뒤에만 완료를 보고한다 — write/edit 후에는 해당 파일을 다시 읽어 변경이 실제로 반영됐는지 확인하고(read-back), 테스트는 출력을 확인한다. 과거 하네스가 write를 silently 버려도 "완료" 오보고한 사례가 있다. 긴 산출물(문서/계획/코드 덤프)은 채팅 출력 대신 파일로 쓰고 요약만 보고한다.
- **No auto-`ruff --fix`**: `make check`의 ruff는 `F`(pyflakes)+`I`(isort)를 select하므로(`pyproject.toml`), `ruff --fix`를 자동(예: PostToolUse hook)으로 돌리면 같은 편집에서 아직 미사용인 새 import를 제거해 버린다. `--fix`는 의도적 수동 실행으로만 쓴다.

## 6. Documentation And Handoff

- Start with `docs/AGENT_BRIEF.md`, then `docs/STATUS.md`, then `docs/NEXT_PLAN.md`. Do not bulk-read `docs/` unless the task explicitly requires an audit.
- Open `docs/DESIGN.md`, `docs/GAMEPLAY.md`, scenario docs, dated plans, and archive files only on demand.
- Work completion should update the smallest relevant current docs. Use `PROGRESS_LOG.md` for short Changed/Verified/Next notes, and archive long history instead of expanding current docs indefinitely.
- Update `harness/CONTEXT_BRIDGE.md` when the next agent's active context, risks, or next recommended task changes materially.
- New global rules belong here, not in an agent-specific file.
