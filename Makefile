PYTHON ?= python3
VENV ?= .venv
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.local.yml
FRONTEND_DIR ?= src/mythos_ui

.PHONY: setup frontend-setup run doctor hf-login clean infra-up infra-down infra-logs infra-ps infra-reset db-migrate db-reset db-shell test test-db test-e2e test-e2e-full narrative-smoke narrative-smoke-fallback narrative-smoke-fallback-en visual-smoke visual-smoke-minio-db visual-smoke-disabled visual-smoke-flux-tiny connect-demo sim-boss smoke smoke-local streamlit streamlit-stop api api-stop api-cloud cloud-image cloud-run-local dev-up dev-down lint python-lint frontend-lint format typecheck python-typecheck frontend-build validate-content check check-skills sync-skills check-auto _harness-guard _overnight-clean-tree overnight-env-doctor overnight-where overnight overnight-watch overnight-once overnight-stop overnight-logs overnight-status overnight-dashboard overnight-ledger-check overnight-ledger-state overnight-trajectory overnight-resume overnight-provenance-compare overnight-graph-smoke overnight-graph-measure overnight-clean overnight-claude overnight-claude-watch overnight-claude-once overnight-codex overnight-codex-watch overnight-codex-once overnight-opencode overnight-opencode-watch overnight-opencode-once overnight-agy overnight-agy-watch overnight-agy-once overnight-kiro overnight-kiro-watch overnight-kiro-once overnight-worktrees overnight-worktrees-setup overnight-worktrees-status overnight-worktrees-down overnight-merge overnight-review image-regen eval-narrative eval-narrative-promotion experiment

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
	$(VENV)/bin/ruff format --check .

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
	$(VENV)/bin/mypy --strict src/mythos_core
	$(VENV)/bin/mypy --strict src/mythos_loop
	$(VENV)/bin/mypy --strict src/mythos_narrative
	$(VENV)/bin/mypy --strict src/mythos_image_agent
	$(VENV)/bin/mypy --strict src/mythos_memory
	$(VENV)/bin/mypy --strict src/mythos_combat
	$(VENV)/bin/mypy --strict src/mythos_api

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

# MythOS-only skills SSOT: .claude/skills is canonical; .agents/skills (codex + agy) is the
# mirror. Plugin-owned harness skills stay external and duplicate local copies fail this gate.
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

# --- Overnight V2: plugin = controller SoT, this repo = policy/state/verifiers ---
ENGINE ?= claude

# Model routing (1.4.0, Claude engine). The actor does bounded implementation; the critic is a
# read-only reviewer whose judgment is what you pay for. Blank = the CLI's own default. Per-repo
# policy, so pinned here rather than left to the plugin.
CLAUDE_MODEL ?= claude-sonnet-5
CLAUDE_EFFORT ?=
OVERNIGHT_CRITIC_MODEL ?= claude-fable-5-1
CLAUDE_CRITIC_EFFORT ?=
export CLAUDE_MODEL CLAUDE_EFFORT OVERNIGHT_CRITIC_MODEL CLAUDE_CRITIC_EFFORT

HARNESS_ROOT ?= $(shell \
	if [ -n "$$OVERNIGHT_HARNESS_ROOT" ] && [ -d "$$OVERNIGHT_HARNESS_ROOT/templates/scripts/overnight" ]; then echo "$$OVERNIGHT_HARNESS_ROOT"; \
	elif [ -n "$$OVERNIGHT_HARNESS_ROOT" ] && [ -d "$$OVERNIGHT_HARNESS_ROOT/plugins/overnight-harness/templates/scripts/overnight" ]; then echo "$$OVERNIGHT_HARNESS_ROOT/plugins/overnight-harness"; \
	elif [ -f .claude/harness-config.json ] && grep -q '"harness_root"' .claude/harness-config.json; then \
		pin="$$(sed -n 's/.*"harness_root"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' .claude/harness-config.json | head -1)"; \
		if [ -d "$$pin/templates/scripts/overnight" ]; then echo "$$pin"; elif [ -d "$$pin/plugins/overnight-harness/templates/scripts/overnight" ]; then echo "$$pin/plugins/overnight-harness"; fi; \
	else \
		{ ls -d $$HOME/.claude/plugins/cache/overnight-harness/overnight-harness/*/ 2>/dev/null; \
		  find $$HOME/.codex/plugins/cache -path '*/overnight-harness/*' -type d 2>/dev/null; \
		  [ -d $$HOME/.gemini/antigravity-cli/plugins/overnight-harness ] && echo $$HOME/.gemini/antigravity-cli/plugins/overnight-harness; \
		  [ -d $$HOME/.cache/opencode/node_modules/opencode-overnight-harness ] && echo $$HOME/.cache/opencode/node_modules/opencode-overnight-harness; } \
		| while read d; do [ -d "$$d/templates/scripts/overnight" ] && echo "$$d"; done | sort -V | tail -1; \
	fi)
OVN_SRC := $(HARNESS_ROOT:%/=%)/templates/scripts/overnight
OVN := scripts/overnight
OVERNIGHT_CRITIC_MODE ?= auto
OVERNIGHT_OVERSIGHT_MODE ?= graduated
# 1.2.0 repair edge — keep 0 until the held-out task bank exists (NEXT_PLAN WS5); cap 3.
OVERNIGHT_REPAIR_MODE ?= 0
# 1.2.0 cross-engine critic — e.g. `make overnight OVERNIGHT_CRITIC_ENGINE=codex`; blank = same engine.
OVERNIGHT_CRITIC_ENGINE ?=
OVERNIGHT_V2_ENV = OVERNIGHT_ENGINE=$(ENGINE) OVERNIGHT_LANE=$(ENGINE) \
	OVERNIGHT_CONTRACT=1 OVERNIGHT_CONTRACT_REQUIRED=1 \
	OVERNIGHT_CONTRACT_COMPILER=$(abspath $(OVN)/compile-contract.sh) \
	OVERNIGHT_VERIFY=1 OVERNIGHT_CRITIC=$(OVERNIGHT_CRITIC_MODE) OVERNIGHT_OVERSIGHT=$(OVERNIGHT_OVERSIGHT_MODE) \
	OVERNIGHT_REPAIR=$(OVERNIGHT_REPAIR_MODE) \
	$(if $(OVERNIGHT_CRITIC_ENGINE),OVERNIGHT_CRITIC_ENGINE=$(OVERNIGHT_CRITIC_ENGINE)) \
	OVERNIGHT_SUBAGENTS=0 OVERNIGHT_REPO_WRITE_PROBE=auto \
	OVERNIGHT_REPO_WRITE_REQUIRED=$(if $(filter codex,$(ENGINE)),1,0) \
	AGY_SKIP_PERMISSIONS=$(if $(filter agy,$(ENGINE)),1,0)

_harness-guard:
	@test -x "$(OVN_SRC)/run.sh" || { echo "overnight-harness plugin not found (HARNESS_ROOT='$(HARNESS_ROOT)')"; exit 1; }
	@test -x "$(OVN)/compile-contract.sh" || { echo "MythOS contract compiler missing"; exit 1; }

_overnight-clean-tree:
	@test -z "$$(git status --porcelain)" || { echo "FATAL: unattended dispatch requires a clean worktree; checkpoint or recover changes first."; exit 1; }

overnight-env-doctor:
	@$(OVN)/env-doctor.sh

overnight-where:
	@echo "HARNESS_ROOT = $(HARNESS_ROOT)"; echo "runner       = $(OVN_SRC)/run.sh"; echo "compiler     = $(abspath $(OVN)/compile-contract.sh)"

overnight: _harness-guard _overnight-clean-tree overnight-env-doctor
	@if pgrep -f "$(OVN_SRC)/run.sh" >/dev/null 2>&1; then echo "이미 실행 중 (중단: make overnight-stop)"; exit 1; fi
	@mkdir -p $(OVN)/logs; rm -f $(OVN)/STOP $(OVN)/DONE
	@nohup env $(OVERNIGHT_V2_ENV) caffeinate -dimsu $(OVN_SRC)/run.sh >$(OVN)/logs/nohup.out 2>&1 & echo "▶ overnight V2 시작 (pid $$!, engine=$(ENGINE), gate=$${GATE_CMD:-make check})"

overnight-watch:
	@$(MAKE) ENGINE=$(ENGINE) overnight
	@sleep 1
	@$(MAKE) overnight-logs

overnight-once: _harness-guard _overnight-clean-tree overnight-env-doctor
	@rm -f $(OVN)/STOP $(OVN)/DONE
	env $(OVERNIGHT_V2_ENV) $(OVN_SRC)/run.sh --once

overnight-stop:
	@touch $(OVN)/STOP && echo "STOP 생성 — 현재 회차 마치고 종료."

overnight-logs:
	@mkdir -p $(OVN)/logs; touch $(OVN)/logs/runner.log; tail -f $(OVN)/logs/runner.log

overnight-status: _harness-guard
	@bash $(OVN_SRC)/status.sh
	@pgrep -f "$(OVN_SRC)/run.sh" >/dev/null 2>&1 && echo "── 프로세스: ● 실행 중" || echo "── 프로세스: ○ 미실행"

overnight-dashboard: _harness-guard
	@bash $(OVN_SRC)/dashboard.sh

overnight-ledger-check: _harness-guard
	@python3 $(OVN_SRC)/lib/ledger.py check $(OVN)/logs/events.jsonl

overnight-ledger-state: _harness-guard
	@python3 $(OVN_SRC)/lib/ledger.py project $(OVN)/logs/events.jsonl

overnight-trajectory: _harness-guard
	@python3 $(OVN_SRC)/lib/trajectory.py $(OVN)/logs/events.jsonl \
	  $(if $(MISSION),--mission "$(MISSION)",) --format "$(or $(FORMAT),text)"

overnight-resume: _harness-guard
	@test -x "$(OVN_SRC)/resume.sh" || { echo "설치된 overnight-harness에 resume.sh가 없습니다."; exit 1; }
	@test -n "$(MISSION)" || { echo "MISSION=<mission-id>가 필요합니다."; exit 2; }
	@test "$(DECISION)" = "approve" -o "$(DECISION)" = "reject" || { echo "DECISION=approve|reject가 필요합니다."; exit 2; }
	@HARNESS_REPO_ROOT="$(CURDIR)" bash $(OVN_SRC)/resume.sh "$(MISSION)" --"$(DECISION)"

overnight-provenance-compare: _harness-guard
	@test -n "$(LEFT)" -a -n "$(RIGHT)" || { echo "LEFT=<manifest>와 RIGHT=<manifest>가 필요합니다."; exit 2; }
	@python3 $(OVN_SRC)/lib/provenance.py compare --left "$(LEFT)" --right "$(RIGHT)" \
	  --left-result "$(LEFT_RESULT)" --right-result "$(RIGHT_RESULT)"

overnight-graph-smoke: _harness-guard
	@bash $(OVN)/graph-smoke.sh "$(HARNESS_ROOT)"

GRAPH_MEASURE_REPEATS ?= 5
GRAPH_MEASURE_OUTPUT ?= outputs/overnight/dev-graph-empirical-baseline/deterministic
overnight-graph-measure: _harness-guard
	@test -n "$(HARNESS_SOURCE_ROOT)" || { echo "HARNESS_SOURCE_ROOT=<released source checkout> is required"; exit 2; }
	@$(PYTHON) $(OVN)/measure-graph.py --harness-source "$(HARNESS_SOURCE_ROOT)" \
	  --repetitions "$(GRAPH_MEASURE_REPEATS)" --output "$(GRAPH_MEASURE_OUTPUT)"

overnight-clean:
	@rm -f $(OVN)/STOP $(OVN)/DONE && echo "STOP/DONE 제거 — 다음 가동 준비 완료."

overnight-claude:
	@ENGINE=claude $(MAKE) overnight
overnight-claude-watch:
	@ENGINE=claude $(MAKE) overnight-watch
overnight-claude-once:
	@ENGINE=claude $(MAKE) overnight-once

overnight-codex:
	@ENGINE=codex $(MAKE) overnight
overnight-codex-watch:
	@ENGINE=codex $(MAKE) overnight-watch
overnight-codex-once:
	@ENGINE=codex $(MAKE) overnight-once

overnight-opencode:
	@ENGINE=opencode $(MAKE) overnight
overnight-opencode-watch:
	@ENGINE=opencode $(MAKE) overnight-watch
overnight-opencode-once:
	@ENGINE=opencode $(MAKE) overnight-once

overnight-agy:
	@ENGINE=agy $(MAKE) overnight
overnight-agy-watch:
	@ENGINE=agy $(MAKE) overnight-watch
overnight-agy-once:
	@ENGINE=agy $(MAKE) overnight-once

overnight-kiro:
	@ENGINE=kiro $(MAKE) overnight
overnight-kiro-watch:
	@ENGINE=kiro $(MAKE) overnight-watch
overnight-kiro-once:
	@ENGINE=kiro $(MAKE) overnight-once

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
# 실제 생성 비용 발생(야간 드레인 비포함). 설계: bin/docs/plans/2026-06-20-ws4-image-regen-loop.md
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

# PYTHONPATH carries the repo root too, so tests can import experiments/ (a
# root-level package, not part of the installed src layout).
test:
	PYTHONPATH=src:. MYTHOS_LOG_LEVEL=ERROR $(VENV)/bin/python -m unittest discover -s tests

test-db:
	MYTHOS_LOG_LEVEL=ERROR MYTHOS_RUN_DB_TESTS=1 $(VENV)/bin/python -m unittest discover -s tests -p 'test_postgres_store.py'

test-e2e:
	$(VENV)/bin/python scratch/run_playwright_test.py

test-e2e-full:
	$(VENV)/bin/python scratch/run_comprehensive_e2e_test.py

narrative-smoke:
	$(VENV)/bin/python -m mythos_narrative.smoke

# LLM-judge rubric eval over banked golden loop transcripts (scripts/eval/).
# Judge = claude CLI (override EVAL_JUDGE_CMD). Bank loops via scripts/eval/bank_loop.py.
eval-narrative:
	$(VENV)/bin/python scripts/eval/narrative_judge.py

# Serving-research experiments. NOT part of `make check` — these call live
# engines, take minutes, and are non-deterministic. Each run writes a stamped
# report under experiments/results/. `make experiment` with no ARGS lists them.
experiment:
	PYTHONPATH=src:. $(VENV)/bin/python -m experiments.run $(ARGS)

eval-narrative-promotion:
	@test -n "$(EVAL_PROMOTION_METRICS)" || (echo "EVAL_PROMOTION_METRICS is required" && exit 2)
	$(VENV)/bin/python scripts/eval/narrative_judge.py --promotion --metrics "$(EVAL_PROMOTION_METRICS)"

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
	DEFAULT_BGM_ON=false $(VENV)/bin/python -m mythos_api

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
	@echo "      🔴 DB=PRODUCTION Neon (MYTHOS_DEPLOY_DATABASE_URL) — DEV 콘솔이 실서비스 데이터에 붙음. 쓰기 주의!"
	@DB=$$(grep -E '^MYTHOS_DEPLOY_DATABASE_URL=' .env | cut -d= -f2-); \
	MYTHOS_NARRATIVE_PROVIDER=gemini MYTHOS_VISUAL_PROVIDER=vertex DATABASE_URL="$$DB" DEFAULT_BGM_ON=false $(VENV)/bin/python -m mythos_api

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

# Deploy to Cloud Run, ALWAYS targeting .env's PROJECT_ID via --project (never
# the ambient `gcloud config` project — that once drifted to the wrong project
# and a deploy landed a stray service elsewhere). Env-preserving `--source .`:
# no --set-env-vars, so the existing revision's env (MODEL, DATABASE_URL, invite
# keys, …) is kept — EXCEPT the image model/location pair, pinned via
# --update-env-vars because Gemini 3 image is global-only and stale revision
# values would override the code defaults.
# Overridable: make deploy REGION=us-central1 IMAGEN_MODEL=<id> IMAGEN_LOCATION=<location>.
REGION ?= us-central1
IMAGEN_MODEL ?= gemini-3.1-flash-image
IMAGEN_LOCATION ?= global
CLOUD_RUN_TIMEOUT ?= 3600
.PHONY: deploy
deploy:
	@test -f .env || { echo "ERROR: .env not found"; exit 1; }
	@PROJECT_ID=$$(grep -E '^PROJECT_ID=' .env | cut -d= -f2- | tr -d '"'); \
	test -n "$$PROJECT_ID" || { echo "ERROR: PROJECT_ID not set in .env"; exit 1; }; \
	echo "Deploying mythos-api to project [$$PROJECT_ID] region [$(REGION)] (env-preserving; timeout=$(CLOUD_RUN_TIMEOUT)s; IMAGEN_MODEL=$(IMAGEN_MODEL), IMAGEN_LOCATION=$(IMAGEN_LOCATION))…"; \
	gcloud run deploy mythos-api --source . --region $(REGION) --project "$$PROJECT_ID" --timeout $(CLOUD_RUN_TIMEOUT) --update-env-vars IMAGEN_MODEL=$(IMAGEN_MODEL),IMAGEN_LOCATION=$(IMAGEN_LOCATION) --quiet

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
