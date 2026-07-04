PYTHON ?= python3
VENV ?= .venv
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.local.yml
FRONTEND_DIR ?= src/mythos_ui

.PHONY: setup frontend-setup run doctor hf-login clean infra-up infra-down infra-logs infra-ps infra-reset db-migrate db-reset db-shell test test-db test-e2e test-e2e-full narrative-smoke narrative-smoke-fallback narrative-smoke-fallback-en visual-smoke visual-smoke-minio-db visual-smoke-disabled visual-smoke-flux-tiny connect-demo sim-boss smoke smoke-local streamlit streamlit-stop api api-stop api-cloud cloud-image cloud-run-local dev-up dev-down lint python-lint frontend-lint format typecheck python-typecheck frontend-build validate-content check check-skills sync-skills check-auto overnight overnight-watch overnight-once overnight-stop overnight-logs overnight-status overnight-dashboard overnight-clean overnight-codex overnight-codex-watch overnight-codex-once overnight-agy overnight-agy-watch overnight-agy-once overnight-worktrees overnight-worktrees-setup overnight-worktrees-status overnight-worktrees-down overnight-merge overnight-review image-regen

setup:
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/pip install -e ".[dev,web]"
	$(MAKE) frontend-setup

frontend-setup:
	cd $(FRONTEND_DIR) && npm ci

lint:
	$(MAKE) python-lint
	$(MAKE) frontend-lint

python-lint:
	$(VENV)/bin/ruff check .

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

format:
	$(VENV)/bin/ruff format .
	$(VENV)/bin/ruff check --select I --fix .

typecheck:
	$(MAKE) python-typecheck
	$(MAKE) frontend-build

python-typecheck:
	$(VENV)/bin/mypy src tests

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

validate-content:
	PYTHONPATH=src $(VENV)/bin/python -c 'from mythos_runtime.route_content import main; raise SystemExit(main())'

check:
	$(MAKE) check-skills
	$(MAKE) check-doc-budget
	$(MAKE) validate-content
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test

# Multi-engine skills SSOT: .claude/skills is canonical; .agents/.codex/.gemini are mirrors kept
# in sync (no symlinks) by harness/sync-skills.sh. This step fails the gate if they drift.
check-skills:
	@bash harness/sync-skills.sh --check
sync-skills:
	@bash harness/sync-skills.sh

# Entry-doc context-budget caps (AGENT_BRIEF <=60, STATUS/NEXT_PLAN/PROGRESS_LOG <=120).
# These docs load every session/overnight iteration; this fails the gate if they grow over budget.
check-doc-budget:
	@bash harness/check-doc-budget.sh

# Faster offline gate variant: same coverage as `check` MINUS python-typecheck (mypy).
# The overnight loop (scripts/overnight/) now defaults to full `make check` (mypy debt cleared
# 2026-06-14); keep this as a quicker option for runtime-flow-heavy iterations.
check-auto:
	$(MAKE) lint
	$(MAKE) frontend-build
	$(MAKE) smoke-local

# --- Overnight 무인 루프 (scripts/overnight/, 설계: docs/engineering/mythos/LOOP.md) ---
# 자는 동안 헤드리스 claude가 NEXT_PLAN의 [auto] 작업을 구현·검증(make check)·기록·로컬 커밋한다.
# 가동 전: 워킹트리 clean + [auto] 항목 seeding + (권장) brew install coreutils(회차 타임아웃).
# 환경변수로 조절: GATE_CMD(기본 make check), MAX_ITER, MAX_NO_PROGRESS, ITER_TIMEOUT 등.

# 백그라운드 가동(절전 방지 + 터미널 닫혀도 유지). 예: MAX_ITER=12 make overnight
overnight:
	@if pgrep -f "scripts/overnight/run.sh" >/dev/null 2>&1; then echo "이미 실행 중 (중단: make overnight-stop)"; exit 1; fi
	@command -v gtimeout >/dev/null 2>&1 || command -v timeout >/dev/null 2>&1 || echo "⚠ gtimeout/timeout 없음 — 회차 타임아웃 비활성(brew install coreutils 권장)"
	@if [ -n "$$(git status --porcelain)" ]; then echo "⚠ 워킹트리 dirty — 1회차가 잔여물 복구로 빠집니다(또는 red면 STOP). 먼저 커밋/정리 권장."; fi
	@mkdir -p scripts/overnight/logs
	@rm -f scripts/overnight/STOP scripts/overnight/DONE
	@nohup caffeinate -dimsu scripts/overnight/run.sh > scripts/overnight/logs/nohup.out 2>&1 & echo "▶ overnight 시작 (pid $$!, gate=$${GATE_CMD:-make check}, MAX_ITER=$${MAX_ITER:-20}). 관찰: make overnight-logs · 중단: make overnight-stop · 아침: /overnight-report"

# 가동 + 즉시 로그 follow(한 방에). Ctrl+C로 빠져나와도 루프는 백그라운드에서 계속 돈다.
overnight-watch:
	@$(MAKE) overnight
	@sleep 1
	@$(MAKE) overnight-logs

# 1회차만(체인 검증). 포그라운드 실행. (`overnight`와 동일하게 stale STOP/DONE 자동 제거 —
# 안 그러면 이전 회차가 남긴 DONE이 회차를 막고 드레인 QA만 돌고 종료된다.)
overnight-once:
	@rm -f scripts/overnight/STOP scripts/overnight/DONE
	scripts/overnight/run.sh --once

# graceful 중단(현재 회차 마치고 다음 회차 진입 전 종료).
overnight-stop:
	@touch scripts/overnight/STOP && echo "STOP 생성 — 현재 회차 마치고 종료(완료 후 make overnight-clean 권장)."

# runner.log 실시간 관찰.
overnight-logs:
	@touch scripts/overnight/logs/runner.log && tail -f scripts/overnight/logs/runner.log

# 상태: 3엔진 lane 집계 트리(status.sh) + 프로세스 확인. 풍부한 검수는 claude 세션의 /overnight-report.
overnight-status:
	@bash scripts/overnight/status.sh
	@pgrep -f "scripts/overnight/run.sh" >/dev/null 2>&1 && echo "── 프로세스: ● 실행 중 (pid $$(pgrep -f 'scripts/overnight/run.sh' | tr '\n' ' '))" || echo "── 프로세스: ○ 미실행"

# tmux 멀티페인 대시보드: 상단 집계 트리(2s) + 하단 lane 별 runner.log tail. tmux 없으면 트리 1회 폴백.
overnight-dashboard:
	@bash scripts/overnight/dashboard.sh

# 종료 후 제어 파일 정리(STOP/DONE 제거). 다음 가동 전 클린업.
overnight-clean:
	@rm -f scripts/overnight/STOP scripts/overnight/DONE && echo "STOP/DONE 제거 — 다음 가동 준비 완료."

# --- Codex 엔진 변형 (ENGINE=codex) — 동일 run.sh/LOOP, 호출 에이전트만 codex exec ---
# 안전 경계는 전역 ~/.codex/config.toml(danger-full-access)이 아니라 run.sh 가 CLI 로 강제한다
# (workspace-write + network 차단 + approval never). 프롬프트는 scripts/overnight/PROMPT.codex.md.
# stop/logs/status/clean 은 같은 run.sh 프로세스라 엔진 구분 없이 위 타깃을 그대로 쓴다.
overnight-codex:
	@ENGINE=codex $(MAKE) overnight
overnight-codex-watch:
	@ENGINE=codex $(MAKE) overnight-watch
overnight-codex-once:
	@ENGINE=codex $(MAKE) overnight-once

# --- agy(Antigravity) 엔진 변형 (ENGINE=agy) — 이미지 초안/간단 검증 레인 ---
# ⚠️ agy 는 호스트 접근(FLUX/MPS/네트워크)이 필요해 샌드박스 없이 돈다. 경계는 PROMPT.agy.md 가드레일 +
# worktree/브랜치 격리(loop/agy)에 의존한다. 무인 가동 전 worktree 격리(make overnight-worktrees) 권장.
overnight-agy:
	@ENGINE=agy $(MAKE) overnight
overnight-agy-watch:
	@ENGINE=agy $(MAKE) overnight-watch
overnight-agy-once:
	@ENGINE=agy $(MAKE) overnight-once

# --- 3엔진 병렬: worktree 격리 + 통합 머지 (설계: docs/engineering/mythos/AGENTIC.md) ---
# 각 엔진을 자기 worktree+브랜치(loop/{claude,codex,agy})에서 돌려 commit 충돌 0.
overnight-worktrees:        # 생성/갱신(+.claude/.agents symlink)
	@scripts/overnight/worktrees.sh up
overnight-worktrees-setup:  # 코드 레인용 per-worktree venv+node_modules(네트워크 1회, 사람 실행)
	@scripts/overnight/worktrees.sh setup
overnight-worktrees-status:
	@scripts/overnight/worktrees.sh status
overnight-worktrees-down:   # worktree 제거(브랜치 보존)
	@scripts/overnight/worktrees.sh down
overnight-merge:            # loop/* → loop/integration 통합 + 게이트 재실행(사람 검수용, push 안 함)
	@scripts/overnight/merge-loops.sh
overnight-review:           # codex 가 통합 diff 를 읽기전용 리뷰(생성자≠리뷰어) → logs/review-latest.md
	@scripts/overnight/review.sh $(RANGE)

# WS4 이미지 재생성 루프(opt-in, 사람 가동): agy 생성→claude 비전 판정→codex 프롬프트 정제→FLUX 폴백.
# 실제 생성 비용 발생(야간 드레인 비포함). 설계: docs/plans/2026-06-20-ws4-image-regen-loop.md
image-regen:
	@scripts/overnight/image-regen.sh

# Live-QA AGY hook is now invoked automatically by the overnight runner
# (OVERNIGHT_BROWSER_QA=auto, scripts/overnight/browser-qa.sh). For diagnosis run
# the script directly: `scripts/live-qa/run-agy.sh`. No standalone make target —
# the existing `make overnight*` commands stay the only operator flow.

doctor:
	$(VENV)/bin/python agent.py --doctor

hf-login:
	$(VENV)/bin/hf auth login

run:
	$(VENV)/bin/python agent.py "메인 서버룸 안에서 홀로그램 인프라 창을 띄워놓고 모니터링하는 사이버 요원. 보안팀 소속마크가 옷에 붙어있음."

clean:
	rm -rf __pycache__ src/**/__pycache__ src/*.egg-info .pytest_cache .ruff_cache

test:
	MYTHOS_LOG_LEVEL=ERROR $(VENV)/bin/python -m unittest discover -s tests

test-db:
	MYTHOS_LOG_LEVEL=ERROR MYTHOS_RUN_DB_TESTS=1 $(VENV)/bin/python -m unittest discover -s tests -p 'test_postgres_store.py'

test-e2e:
	$(VENV)/bin/python scratch/run_playwright_test.py

test-e2e-full:
	$(VENV)/bin/python scratch/run_comprehensive_e2e_test.py

narrative-smoke:
	$(VENV)/bin/python -m mythos_narrative.smoke

narrative-smoke-fallback:
	$(VENV)/bin/python -m mythos_narrative.smoke --fallback-only

narrative-smoke-fallback-en:
	$(VENV)/bin/python -m mythos_narrative.smoke --fallback-only --language en

visual-smoke:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke

visual-smoke-minio-db:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --storage minio --db

visual-smoke-disabled:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --disabled --db

visual-smoke-flux-tiny:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --real-flux

connect-demo:
	$(VENV)/bin/python -m mythos_runtime.connect_cli new-player "Demo Connector" --player-id player_demo
	$(VENV)/bin/python -m mythos_runtime.connect_cli connect --player-id player_demo --fallback

# Headless combat sim — watch the IX boss fight (skills + phase) straight through the engine.
# `make sim-boss`            → 1 verbose IX boss playthrough
# `make sim-boss ARGS="--trials 60"`  → win-rate over 60 seeds
# `make sim-boss ARGS="--encounter mech_siege --party se_rin"`
sim-boss:
	$(VENV)/bin/python scripts/sim_boss.py $(ARGS)

smoke-local:
	$(VENV)/bin/python -m compileall agent.py src tests
	$(MAKE) test
	$(MAKE) narrative-smoke-fallback
	$(MAKE) visual-smoke

smoke:
	$(MAKE) smoke-local
	$(MAKE) test-db
	$(MAKE) visual-smoke-minio-db

streamlit:
	@pkill -f "streamlit run streamlit_app.py" 2>/dev/null && echo "stopped previous streamlit" || true
	@echo "logs: set MYTHOS_DEBUG=1 or MYTHOS_LOG_LEVEL=DEBUG; speed: MYTHOS_FAST_MODE=1"
	$(VENV)/bin/streamlit run streamlit_app.py --server.port=8501

streamlit-stop:
	@pkill -f "streamlit run streamlit_app.py" && echo "streamlit stopped" || echo "no streamlit running"

# FastAPI backend adapter (P3 Web UI). Serves REST + WebSocket at /api/v1 and
# the PoC client at /. Image generation is synchronous in-request (infra-up for MinIO).
api:
	@pkill -f "mythos_api" 2>/dev/null && echo "stopped previous api" || true
	@echo "API: http://$${MYTHOS_API_HOST:-127.0.0.1}:$${MYTHOS_API_PORT:-8000}  (PoC client at /, endpoints under /api/v1)"
	@echo "      구조화 JSON 로그가 콘솔에 출력됨(턴마다 최종 narration+latency, INFO). uvicorn은 INFO 고정(토큰 프레임 스팸 없음)."
	$(VENV)/bin/python -m mythos_api

api-stop:
	@pkill -f "mythos_api" && echo "api stopped" || echo "no api running"

# Like `api` but with the CLOUD providers: narrative=Vertex Gemini, image=Vertex Imagen.
# Needs ADC (`gcloud auth application-default login`) + the Google Cloud settings in .env.
# Storage stays local (minio); set MYTHOS_STORAGE_BACKEND=gcs + a bucket for full cloud.
# WARNING: this calls Vertex AI and is BILLED to your GCP project (~$0.003/narrative turn,
# ~$0.04/image). Plain `make api` stays fully local (Ollama, free).
api-cloud:
	@pkill -f "mythos_api" 2>/dev/null && echo "stopped previous api" || true
	@echo "API (CLOUD): http://$${MYTHOS_API_HOST:-127.0.0.1}:$${MYTHOS_API_PORT:-8000}"
	@echo "      서사=Vertex Gemini · 이미지=Vertex Imagen · ⚠️ Vertex 호출은 GCP 프로젝트에 과금됨."
	MYTHOS_NARRATIVE_PROVIDER=gemini MYTHOS_VISUAL_PROVIDER=vertex $(VENV)/bin/python -m mythos_api

# --- GCP Cloud Run container (lean: narrative=Gemini, image=Imagen are API calls) ---
CLOUD_IMAGE ?= mythos-api:local
cloud-image:
	docker build -t $(CLOUD_IMAGE) .
	@echo "built $(CLOUD_IMAGE)  ($$(docker image inspect $(CLOUD_IMAGE) --format '{{.Size}}' | awk '{printf \"%.0f MB\", $$1/1048576}'))"

# Run the container locally as Cloud Run would (PORT injected, host 0.0.0.0). Pass
# cloud env via a file: make cloud-run-local ENVFILE=.env  (DB/creds optional to boot).
ENVFILE ?= .env
cloud-run-local:
	docker run --rm -p 8080:8080 -e PORT=8080 $$( [ -f $(ENVFILE) ] && echo --env-file $(ENVFILE) ) $(CLOUD_IMAGE)

# One-command dev stack: docker infra + db migrate + API(foreground).
# Ollama is host-side (not docker); start it separately with `ollama serve`.
# Ctrl+C stops the API; infra keeps running. Tear everything down: make dev-down.
dev-up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "Waiting for Postgres to be ready..."
	@for i in $$(seq 1 30); do \
		$(COMPOSE) -f $(COMPOSE_FILE) exec -T postgres pg_isready -U mythos >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	@$(MAKE) db-migrate || echo "db-migrate skipped/failed (이미 적용됐을 수 있음)"
	@(curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1 && echo "Ollama: 실행 중") || echo "⚠ Ollama 미실행 — 별도 터미널에서 'ollama serve' (또는 온보딩에서 fallback 사용)"
	@echo "------------------------------------------------------------"
	@echo "▶ API 기동. Ctrl+C로 API만 종료(인프라/워커 유지). 전체 정리: make dev-down"
	@echo "------------------------------------------------------------"
	@$(MAKE) api

dev-down:
	-@$(MAKE) api-stop
	$(COMPOSE) -f $(COMPOSE_FILE) down

infra-up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

infra-down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

infra-logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

infra-ps:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

# Stops the stack and wipes volume data under .docker/. Destructive.
infra-reset:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	rm -rf .docker

db-migrate:
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T postgres sh -c 'for file in /migrations/*.sql; do echo "Applying $$file"; psql -v ON_ERROR_STOP=1 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -f "$$file"; done'

# Drops and recreates the public schema, then reapplies migrations. Destructive.
db-reset:
	$(COMPOSE) -f $(COMPOSE_FILE) exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
	$(MAKE) db-migrate

db-shell:
	$(COMPOSE) -f $(COMPOSE_FILE) exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'
