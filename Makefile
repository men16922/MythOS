PYTHON ?= python3
VENV ?= .venv
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.local.yml
FRONTEND_DIR ?= src/mythos_ui

.PHONY: setup frontend-setup run doctor hf-login clean infra-up infra-down infra-logs infra-ps infra-reset db-migrate db-reset db-shell test test-db test-e2e test-e2e-full narrative-smoke narrative-smoke-fallback visual-smoke visual-smoke-minio-db visual-smoke-disabled visual-smoke-flux-tiny visual-worker visual-worker-bg visual-worker-stop visual-worker-logs redis-shell connect-demo smoke smoke-local streamlit streamlit-stop api api-stop lint python-lint frontend-lint format typecheck python-typecheck frontend-build check

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
