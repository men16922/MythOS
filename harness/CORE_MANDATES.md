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

## 5. Documentation And Handoff

- Start with `docs/AGENT_BRIEF.md`, then `docs/STATUS.md`, then `docs/NEXT_PLAN.md`. Do not bulk-read `docs/` unless the task explicitly requires an audit.
- Open `docs/DESIGN.md`, `docs/GAMEPLAY.md`, scenario docs, dated plans, and archive files only on demand.
- Work completion should update the smallest relevant current docs. Use `PROGRESS_LOG.md` for short Changed/Verified/Next notes, and archive long history instead of expanding current docs indefinitely.
- Update `harness/CONTEXT_BRIDGE.md` when the next agent's active context, risks, or next recommended task changes materially.
- New global rules belong here, not in an agent-specific file.
