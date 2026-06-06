# Project MythOS Local Runtime

Project MythOS / 세계:접속은 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다. 현재 FastAPI-served React SPA, Streamlit demo, CLI가 모두 같은 `RuntimeSessionService`를 호출한다.

## Docs

에이전트/개발자는 아래 순서만 먼저 읽는다.

1. `docs/AGENT_BRIEF.md`
2. `docs/STATUS.md`
3. `docs/NEXT_PLAN.md`
4. 필요한 경우 `docs/DESIGN.md`, `docs/GAMEPLAY.md`, `docs/API.md`

문서 운영 원칙은 `docs/README.md`와 `docs/DOCS_POLICY.md`를 따른다. 장문 설계/로그는 `docs/archive/`에 보존한다.

## Requirements

- Apple Silicon Mac with MPS support
- Python 3.11+
- Ollama
- Docker Desktop
- Hugging Face access/token for `black-forest-labs/FLUX.1-schnell`
- 35GB+ free disk space

## Setup

```bash
cp .env.example .env
make setup
make infra-up
make db-migrate
```

Ollama:

```bash
ollama pull gemma4
ollama serve
```

FLUX is a gated Hugging Face model. Accept access terms and set `HF_TOKEN` in `.env` or run:

```bash
source .venv/bin/activate
hf auth login
```

## Play React App

Recommended local path:

```bash
ollama serve
make dev-up
```

Open `http://localhost:8000`.

`make dev-up` starts docker infra, waits for Postgres, migrates DB, starts the visual worker in the background, then runs the API/React server in foreground.

Stop:

```bash
make dev-down
```

Dev console links:

- Adminer: `http://localhost:8080`
- MinIO Console: `http://localhost:9001`
- Redis Commander: `http://localhost:8081`
- Jaeger: `http://localhost:16686`

## Play Streamlit Demo

```bash
make infra-up
make db-migrate
make streamlit
```

Open `http://localhost:8501`.

## CLI Demo

```bash
make connect-demo
```

Manual fallback flow:

```bash
python -m mythos_runtime.connect_cli new-player "첫 번째 접속자" --player-id player_001
python -m mythos_runtime.connect_cli connect --player-id player_001 --fallback
python -m mythos_runtime.connect_cli choose --loop-id <loop_id> --choice-id <choice_id> --fallback
python -m mythos_runtime.connect_cli resume --loop-id <loop_id>
```

## Checks

```bash
make test
make lint
make typecheck
make frontend-lint
make frontend-build
make test-e2e
make smoke-local
```

Use `make smoke` or `make test-db` when persistence/MinIO behavior changes.

## Image Backend

Default backend is `mflux` with FLUX.1-schnell on Apple Silicon. Character scenes can use mflux Redux for reference-image identity steering.

`.env`:

```bash
IMAGE_BACKEND=mflux
MFLUX_QUANTIZE=8   # use 4 for lower memory
```

Useful checks:

```bash
make doctor
make visual-smoke-flux-tiny
make visual-worker
make visual-worker-logs
```

Generated outputs belong in `outputs/` and are not source artifacts.
