PYTHON ?= python3
VENV ?= .venv
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.local.yml
FRONTEND_DIR ?= src/mythos_ui

.PHONY: setup frontend-setup run doctor hf-login clean infra-up infra-down infra-logs infra-ps infra-reset db-migrate db-reset db-shell test test-db test-e2e test-e2e-full narrative-smoke narrative-smoke-fallback visual-smoke visual-smoke-minio-db visual-smoke-disabled visual-smoke-flux-tiny visual-worker visual-worker-bg visual-worker-stop visual-worker-logs redis-shell connect-demo smoke smoke-local streamlit streamlit-stop api api-stop dev-up dev-down lint python-lint frontend-lint format typecheck python-typecheck frontend-build check check-auto overnight overnight-watch overnight-once overnight-stop overnight-logs overnight-status overnight-clean overnight-codex overnight-codex-watch overnight-codex-once overnight-agy overnight-agy-watch overnight-agy-once overnight-worktrees overnight-worktrees-status overnight-worktrees-down overnight-merge overnight-review

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

check:
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test

# Faster offline gate variant: same coverage as `check` MINUS python-typecheck (mypy).
# The overnight loop (bin/overnight/) now defaults to full `make check` (mypy debt cleared
# 2026-06-14); keep this as a quicker option for runtime-flow-heavy iterations.
check-auto:
	$(MAKE) lint
	$(MAKE) frontend-build
	$(MAKE) smoke-local

# --- Overnight 무인 루프 (bin/overnight/, 설계: docs/LOOP_ENGINEERING.md) ---
# 자는 동안 헤드리스 claude가 NEXT_PLAN의 [auto] 작업을 구현·검증(make check)·기록·로컬 커밋한다.
# 가동 전: 워킹트리 clean + [auto] 항목 seeding + (권장) brew install coreutils(회차 타임아웃).
# 환경변수로 조절: GATE_CMD(기본 make check), MAX_ITER, MAX_NO_PROGRESS, ITER_TIMEOUT 등.

# 백그라운드 가동(절전 방지 + 터미널 닫혀도 유지). 예: MAX_ITER=12 make overnight
overnight:
	@if pgrep -f "bin/overnight/run.sh" >/dev/null 2>&1; then echo "이미 실행 중 (중단: make overnight-stop)"; exit 1; fi
	@command -v gtimeout >/dev/null 2>&1 || command -v timeout >/dev/null 2>&1 || echo "⚠ gtimeout/timeout 없음 — 회차 타임아웃 비활성(brew install coreutils 권장)"
	@if [ -n "$$(git status --porcelain)" ]; then echo "⚠ 워킹트리 dirty — 1회차가 잔여물 복구로 빠집니다(또는 red면 STOP). 먼저 커밋/정리 권장."; fi
	@mkdir -p bin/overnight/logs
	@rm -f bin/overnight/STOP bin/overnight/DONE
	@nohup caffeinate -dimsu bin/overnight/run.sh > bin/overnight/logs/nohup.out 2>&1 & echo "▶ overnight 시작 (pid $$!, gate=$${GATE_CMD:-make check}, MAX_ITER=$${MAX_ITER:-20}). 관찰: make overnight-logs · 중단: make overnight-stop · 아침: /overnight-report"

# 가동 + 즉시 로그 follow(한 방에). Ctrl+C로 빠져나와도 루프는 백그라운드에서 계속 돈다.
overnight-watch:
	@$(MAKE) overnight
	@sleep 1
	@$(MAKE) overnight-logs

# 1회차만(체인 검증). 포그라운드 실행.
overnight-once:
	bin/overnight/run.sh --once

# graceful 중단(현재 회차 마치고 다음 회차 진입 전 종료).
overnight-stop:
	@touch bin/overnight/STOP && echo "STOP 생성 — 현재 회차 마치고 종료(완료 후 make overnight-clean 권장)."

# runner.log 실시간 관찰.
overnight-logs:
	@touch bin/overnight/logs/runner.log && tail -f bin/overnight/logs/runner.log

# 빠른 상태(프로세스/STOP/DONE/최근 로그). 풍부한 검수는 claude 세션의 /overnight-report.
overnight-status:
	@pgrep -f "bin/overnight/run.sh" >/dev/null 2>&1 && echo "● 실행 중 (pid $$(pgrep -f 'bin/overnight/run.sh' | tr '\n' ' '))" || echo "○ 미실행"
	@test -f bin/overnight/STOP && echo "STOP: $$(head -1 bin/overnight/STOP)" || true
	@test -f bin/overnight/DONE && echo "DONE: $$(head -1 bin/overnight/DONE)" || true
	@echo "--- runner.log 마지막 6줄 ---"; tail -6 bin/overnight/logs/runner.log 2>/dev/null || echo "(로그 없음)"

# 종료 후 제어 파일 정리(STOP/DONE 제거). 다음 가동 전 클린업.
overnight-clean:
	@rm -f bin/overnight/STOP bin/overnight/DONE && echo "STOP/DONE 제거 — 다음 가동 준비 완료."

# --- Codex 엔진 변형 (ENGINE=codex) — 동일 run.sh/LOOP, 호출 에이전트만 codex exec ---
# 안전 경계는 전역 ~/.codex/config.toml(danger-full-access)이 아니라 run.sh 가 CLI 로 강제한다
# (workspace-write + network 차단 + approval never). 프롬프트는 bin/overnight/PROMPT.codex.md.
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

# --- 3엔진 병렬: worktree 격리 + 통합 머지 (설계: docs/MULTI_AGENT.md) ---
# 각 엔진을 자기 worktree+브랜치(loop/{claude,codex,agy})에서 돌려 commit 충돌 0.
overnight-worktrees:        # 생성/갱신(+.claude/.agents symlink)
	@bin/overnight/worktrees.sh up
overnight-worktrees-status:
	@bin/overnight/worktrees.sh status
overnight-worktrees-down:   # worktree 제거(브랜치 보존)
	@bin/overnight/worktrees.sh down
overnight-merge:            # loop/* → loop/integration 통합 + 게이트 재실행(사람 검수용, push 안 함)
	@bin/overnight/merge-loops.sh
overnight-review:           # codex 가 통합 diff 를 읽기전용 리뷰(생성자≠리뷰어) → logs/review-latest.md
	@bin/overnight/review.sh $(RANGE)

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

visual-smoke:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke

visual-smoke-minio-db:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --storage minio --db

visual-smoke-disabled:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --disabled --db

visual-smoke-flux-tiny:
	$(VENV)/bin/python -m mythos_runtime.visual_smoke --real-flux

visual-worker:
	$(VENV)/bin/python -m mythos_runtime.visual_worker

visual-worker-bg:
	@mkdir -p outputs
	@nohup $(VENV)/bin/python -u -m mythos_runtime.visual_worker > outputs/visual-worker.log 2>&1 & echo "visual worker started (pid $$!), logs: outputs/visual-worker.log"

visual-worker-stop:
	@pkill -f mythos_runtime.visual_worker && echo "visual worker stopped" || echo "no visual worker running"

visual-worker-logs:
	@touch outputs/visual-worker.log && tail -f outputs/visual-worker.log

redis-shell:
	docker compose -f docker-compose.local.yml exec redis redis-cli

connect-demo:
	$(VENV)/bin/python -m mythos_runtime.connect_cli new-player "Demo Connector" --player-id player_demo
	$(VENV)/bin/python -m mythos_runtime.connect_cli connect --player-id player_demo --fallback

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
	@echo "logs: set MYTHOS_DEBUG=1 or MYTHOS_LOG_LEVEL=DEBUG; speed: MYTHOS_FAST_MODE=1; image logs -> make visual-worker-logs"
	$(VENV)/bin/streamlit run streamlit_app.py --server.port=8501

streamlit-stop:
	@pkill -f "streamlit run streamlit_app.py" && echo "streamlit stopped" || echo "no streamlit running"

# FastAPI backend adapter (P3 Web UI). Serves REST + WebSocket at /api/v1 and
# the PoC client at /. Image generation needs infra-up + visual-worker.
api:
	@pkill -f "mythos_api" 2>/dev/null && echo "stopped previous api" || true
	@echo "API: http://$${MYTHOS_API_HOST:-127.0.0.1}:$${MYTHOS_API_PORT:-8000}  (PoC client at /, endpoints under /api/v1)"
	$(VENV)/bin/python -m mythos_api

api-stop:
	@pkill -f "mythos_api" && echo "api stopped" || echo "no api running"

# One-command dev stack: docker infra + db migrate + visual worker(bg) + API(foreground).
# Ollama is host-side (not docker); start it separately with `ollama serve`.
# Ctrl+C stops the API; infra/worker keep running. Tear everything down: make dev-down.
dev-up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "Waiting for Postgres to be ready..."
	@for i in $$(seq 1 30); do \
		$(COMPOSE) -f $(COMPOSE_FILE) exec -T postgres pg_isready -U mythos >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	@$(MAKE) db-migrate || echo "db-migrate skipped/failed (이미 적용됐을 수 있음)"
	@$(MAKE) visual-worker-bg
	@(curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1 && echo "Ollama: 실행 중") || echo "⚠ Ollama 미실행 — 별도 터미널에서 'ollama serve' (또는 온보딩에서 fallback 사용)"
	@echo "------------------------------------------------------------"
	@echo "▶ API 기동. Ctrl+C로 API만 종료(인프라/워커 유지). 전체 정리: make dev-down"
	@echo "------------------------------------------------------------"
	@$(MAKE) api

dev-down:
	-@$(MAKE) api-stop
	-@$(MAKE) visual-worker-stop
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
