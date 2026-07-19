# Project MythOS Local Runtime

Project MythOS / 세계:접속은 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다. 현재 FastAPI-served React SPA, Streamlit demo, CLI가 모두 같은 `RuntimeSessionService`를 호출한다.

## Docs

에이전트/개발자는 아래 순서만 먼저 읽는다.

1. `docs/AGENT_BRIEF.md`
2. `docs/STATUS.md`
3. `docs/NEXT_PLAN.md`
4. 필요한 경우 `docs/DESIGN.md`, `docs/GAMEPLAY.md`, `docs/API.md`

문서 운영 원칙은 `docs/README.md`와 `docs/DOCS_POLICY.md`를 따른다. 장문 설계/로그는 `bin/docs/archive/`에 보존한다.

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

## Overnight Loop (자율 무인 루프)

헤드리스 에이전트가 밤새 `NEXT_PLAN`의 `[auto]` 작업을 스스로 구현·검증·기록·커밋한다. 회차마다
로컬 커밋하므로 언제 멈춰도 손실은 1회차. 설계: `docs/engineering/mythos/LOOP.md`(루프) ·
`docs/engineering/mythos/AGENTIC.md`(3엔진 병렬). 개념 바이블: `docs/engineering/`.

> 핵심: `overnight`/`overnight-watch`가 **가동기**, `overnight-logs`/`overnight-dashboard`/`overnight-status`는
> 이미 도는 루프를 보는 **관찰자**(루프를 시작하지 않는다).

**1. 저녁 — 사전 준비**

```bash
# (a) NEXT_PLAN 에 [auto]/[auto:claude] 작업을 완료기준 1줄씩 seeding ← 없으면 즉시 DONE 으로 끝난다
# (b) 워킹트리 clean 확인 (dirty 면 1회차가 잔여물 복구로 빠짐)
git status
make check                    # (c) 현재 HEAD 에서 게이트 green 확인
brew install coreutils        # (d, 권장) gtimeout → 회차 타임아웃 활성
brew install tmux             # (e, 대시보드 쓸 때만) 없으면 dashboard 는 트리 1회 폴백
```

**2. 1회차 체인 테스트** — 첫 가동 전 항상 한 번 (포그라운드, 토큰 거의 안 씀)

```bash
make overnight-once           # plugin sync → 잔여물점검 → [auto] 1개 → 게이트 → plugin checkpoint → 커밋 → 종료
                              #   ([auto] 가 없으면 DONE 만 찍고 정상 종료 — 그게 맞는 동작)
```

**3. 실가동 + 관찰** — 보통 터미널 2개

```bash
make overnight-watch          # 터미널 1: 가동 + 로그 follow 한 방에 (Ctrl+C 로 빠져도 루프는 계속)
make overnight-dashboard      # 터미널 2: tmux 트리(2s) + lane 별 runner.log (tmux 없으면 트리 1회)
# 변형: MAX_ITER=12 make overnight-watch   ·   make overnight (백그라운드 fire-and-forget)
make overnight-status         # 빠른 lane 트리 1회
make overnight-stop           # graceful 중단(현재 회차 마치고 종료)
```

**4. 다음날 아침 — 검수**

```bash
# agent 세션에서: $overnight-harness:overnight-report  # 종료사유·커밋·게이트 재실측·잔여 [auto]
.venv/bin/python scripts/overnight/report-evidence.py  # MythOS objective evidence projection
# 그다음 사람 검수:  docs/test/bible/overnight-review-checklist.md
make overnight-clean          # STOP/DONE 제어 파일 정리(다음 가동 준비)
```

**3엔진 병렬(claude/codex/agy)**: 각자 worktree+브랜치에서 동시에 — `make overnight-worktrees` 준비 후
엔진별 가동, 아침에 `make overnight-merge` + `make overnight-review`. 상세 `docs/engineering/mythos/AGENTIC.md`.

```bash
make overnight-codex-once     # 코덱스 엔진 1회차 (codex 레인 [auto:codex] 소비)
make overnight-agy-once       # agy 엔진 1회차 (이미지 초안 레인 [auto:agy])
```

런타임 산출물(`scripts/overnight/logs/`·`STOP`·`DONE`·`status.tsv`)은 gitignore — 머신 로컬이다.

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
