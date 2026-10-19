# Mythos 2.0 (세계:접속 — Signal Run). The game runs in the browser (src/mythos_ui/src/v2); the Python side is the
# web server (src/mythos_api: SPA + /resources) and /api/v2 (src/mythos_v2: saves + AI GM). The 1.x runtime is
# archived on branch `1.0`.
PYTHON ?= python3
VENV ?= .venv
COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.local.yml
FRONTEND_DIR ?= src/mythos_ui

.PHONY: vertex-cap-deploy setup frontend-setup clean lint python-lint frontend-lint format typecheck python-typecheck frontend-build \
	test test-v2 test-db test-e2e-v2 gm-eval trailer trailer-cut cinematic cinematic-assets cinematic-prompts playthrough playthrough-quick verify-preview check check-auto check-skills sync-skills check-doc-budget \
	api api-stop api-cloud cloud-image cloud-run-local deploy deploy-preview \
	android-web android-apk android-aab android-firebase android-emulator android-distribute android-icons \
	firebase-web firebase-sha firebase-auth-domains push-schedule push-test \
	dev-up dev-down infra-up infra-down infra-logs infra-ps infra-reset db-migrate db-reset db-shell \
	_harness-guard _overnight-clean-tree overnight-env-doctor overnight-where overnight overnight-watch overnight-once overnight-stop overnight-logs overnight-status overnight-dashboard overnight-ledger-check overnight-ledger-state overnight-trajectory overnight-resume overnight-provenance-compare overnight-graph-smoke overnight-graph-measure overnight-clean overnight-claude overnight-claude-watch overnight-claude-once overnight-codex overnight-codex-watch overnight-codex-once overnight-opencode overnight-opencode-watch overnight-opencode-once overnight-agy overnight-agy-watch overnight-agy-once overnight-kiro overnight-kiro-watch overnight-kiro-once overnight-worktrees overnight-worktrees-setup overnight-worktrees-status overnight-worktrees-down overnight-merge overnight-review

setup:
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/pip install -e ".[dev]"
	$(MAKE) frontend-setup

frontend-setup:
	cd $(FRONTEND_DIR) && npm ci

clean:
	rm -rf __pycache__ src/**/__pycache__ src/*.egg-info .pytest_cache .ruff_cache .mypy_cache

# --- gates ---------------------------------------------------------------------------------------------------

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
	$(VENV)/bin/mypy --strict src/mythos_api src/mythos_v2

# Builds the SPA into src/mythos_api/static (committed: Cloud Run serves it without a Node build).
frontend-build:  # SPA + the daily replay verifier (src/mythos_v2/replay_verify.mjs, same engine + content)
	cd $(FRONTEND_DIR) && npm run build

# Engine/content tests (pure TS, Node native type stripping — no bundler, no browser).
test-v2:
	cd $(FRONTEND_DIR) && node --test src/v2/

# Python: /api/v2 (saves, GM, talk) + the overnight-harness scripts.
test:
	PYTHONPATH=src:. MYTHOS_LOG_LEVEL=ERROR $(VENV)/bin/python -m unittest discover -s tests

test-db:
	MYTHOS_LOG_LEVEL=ERROR MYTHOS_RUN_DB_TESTS=1 $(VENV)/bin/python -m unittest discover -s tests -p 'test_v2_store.py'

# Browser smoke (headless, always muted): title → setup → act intro → event → map → first fight. Needs a built SPA.
test-e2e-v2:
	$(VENV)/bin/python scripts/e2e_v2.py

check:
	$(MAKE) check-skills
	$(MAKE) check-doc-budget
	$(MAKE) lint
	$(MAKE) typecheck
	$(MAKE) test-v2
	$(MAKE) test

# Faster gate without mypy.
check-auto:
	$(MAKE) lint
	$(MAKE) frontend-build
	$(MAKE) test-v2
	$(MAKE) test

# MythOS-only skills SSOT: .claude/skills is canonical; .agents/skills (codex + agy) is the
# mirror. Plugin-owned harness skills stay external and duplicate local copies fail this gate.
check-skills:
	@bash harness/sync-skills.sh --check
sync-skills:
	@bash harness/sync-skills.sh

# Entry-doc context-budget caps (AGENT_BRIEF <=60, STATUS/NEXT_PLAN/PROGRESS_LOG <=120).
check-doc-budget:
	@bash harness/check-doc-budget.sh

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

# --- local server ----------------------------------------------------------------------------------------------

# Plain `make api` stays local and free: GM = Ollama (falls back to authored text when Ollama is down), saves = the
# local Postgres or memory, sign-in mode open (X-Player-Id; a Google token is still verified when the client sends
# one, and /api/v2/config serves .firebase/web-config.json when present). Port busy? MYTHOS_API_PORT=8010 make api.
api:
	@pkill -f "mythos_api" 2>/dev/null && echo "stopped previous api" || true
	@echo "Mythos 2.0: http://$${MYTHOS_API_HOST:-127.0.0.1}:$${MYTHOS_API_PORT:-8000}  (SPA at /, API under /api/v2)"
	$(VENV)/bin/python -m mythos_api

api-stop:
	@pkill -f "mythos_api" && echo "api stopped" || echo "no api running"

# Like `api` but the GM runs on Vertex Gemini (BILLED to the GCP project) and saves go to the PRODUCTION DB.
api-cloud:
	@pkill -f "mythos_api" 2>/dev/null && echo "stopped previous api" || true
	@echo "Mythos 2.0 (CLOUD GM): http://$${MYTHOS_API_HOST:-127.0.0.1}:$${MYTHOS_API_PORT:-8000}"
	@echo "      GM=Vertex Gemini (과금) · 🔴 DB=PRODUCTION (MYTHOS_DEPLOY_DATABASE_URL) — 쓰기 주의!"
	@DB=$$(grep -E '^MYTHOS_DEPLOY_DATABASE_URL=' .env | cut -d= -f2-); \
	MYTHOS_NARRATIVE_PROVIDER=vertex DATABASE_URL="$$DB" $(VENV)/bin/python -m mythos_api

# --- Cloud Run -------------------------------------------------------------------------------------------------

CLOUD_IMAGE ?= mythos-api:local
cloud-image:
	docker build -t $(CLOUD_IMAGE) .
	@echo "built $(CLOUD_IMAGE)  ($$(docker image inspect $(CLOUD_IMAGE) --format '{{.Size}}' | awk '{printf \"%.0f MB\", $$1/1048576}'))"

# Run the container locally as Cloud Run would (PORT injected, host 0.0.0.0): make cloud-run-local ENVFILE=.env
ENVFILE ?= .env
cloud-run-local:
	docker run --rm -p 8080:8080 -e PORT=8080 $$( [ -f $(ENVFILE) ] && echo --env-file $(ENVFILE) ) $(CLOUD_IMAGE)

# Deploy to Cloud Run, ALWAYS targeting .env's PROJECT_ID via --project (never the ambient gcloud project).
# Env-preserving `--source .`: the existing revision's env (GM provider, DATABASE_URL, …) is kept; sign-in is set on
# every deploy: MYTHOS_AUTH=google, MYTHOS_FIREBASE_PROJECT and MYTHOS_FIREBASE_WEB_CONFIG (compacted from the
# gitignored .firebase/web-config.json — `make firebase-web` — inside a subshell, never echoed). `.env`'s
# MYTHOS_ADMIN_EMAILS (comma-separated Google accounts allowed into /admin), MYTHOS_CONTACT_EMAIL, MYTHOS_DEVELOPER_NAME
# and MODEL (the Vertex GM model, e.g. gemini-3.8-flash) are passed along when set, as are the AI budget / Signal+
# keys below (mythos_v2.budget, mythos_v2.billing).
BUDGET_ENV_KEYS := MYTHOS_GM_PRICE_IN_PER_M MYTHOS_GM_PRICE_OUT_PER_M MYTHOS_V2_BUDGET_FREE_USD MYTHOS_V2_BUDGET_PLUS_USD MYTHOS_V2_GM_DAILY_USD MYTHOS_V2_FREE_SHARE MYTHOS_PLUS_SKUS MYTHOS_PLUS_GRANT
REGION ?= us-central1
CLOUD_RUN_TIMEOUT ?= 3600
FIREBASE_WEB_CONFIG ?= .firebase/web-config.json
# Prints the gcloud --update-env-vars value (custom ^@@^ delimiter: the JSON holds commas) for the sign-in env.
define AUTH_ENV_VARS
python3 -c 'import json, sys; c = json.load(open(sys.argv[1])); k = ("apiKey", "authDomain", "projectId", "appId", "messagingSenderId"); assert all(isinstance(c.get(x), str) and c[x] for x in k), "web config incomplete"; v = json.dumps({x: c[x] for x in k}, separators=(",", ":")); assert "@@" not in v; print("^@@^MYTHOS_AUTH=google@@MYTHOS_FIREBASE_PROJECT=" + sys.argv[2] + "@@MYTHOS_FIREBASE_WEB_CONFIG=" + v)' $(FIREBASE_WEB_CONFIG)
endef
deploy:
	@test -f .env || { echo "ERROR: .env not found"; exit 1; }
	@test -f $(FIREBASE_WEB_CONFIG) || { echo "ERROR: $(FIREBASE_WEB_CONFIG) missing — run make firebase-web first"; exit 1; }
	@PROJECT_ID=$$(grep -E '^PROJECT_ID=' .env | cut -d= -f2- | tr -d '"'); \
	test -n "$$PROJECT_ID" || { echo "ERROR: PROJECT_ID not set in .env"; exit 1; }; \
	AUTH_ENV=$$($(AUTH_ENV_VARS) "$$PROJECT_ID" 2>/dev/null) || { echo "ERROR: $(FIREBASE_WEB_CONFIG) is not a complete Firebase web config — re-run make firebase-web"; exit 1; }; \
	ADMIN_EMAILS=$$(grep -E '^MYTHOS_ADMIN_EMAILS=' .env | cut -d= -f2- | tr -d '"'); \
	test -z "$$ADMIN_EMAILS" || AUTH_ENV="$$AUTH_ENV@@MYTHOS_ADMIN_EMAILS=$$ADMIN_EMAILS"; \
	for KEY in MYTHOS_CONTACT_EMAIL MYTHOS_DEVELOPER_NAME MODEL MYTHOS_DEMO_CODES $(BUDGET_ENV_KEYS); do \
		VAL=$$(grep -E "^$$KEY=" .env | cut -d= -f2- | tr -d '"'); \
		test -z "$$VAL" || AUTH_ENV="$$AUTH_ENV@@$$KEY=$$VAL"; \
	done; \
	echo "Deploying mythos-api (2.0) to project [$$PROJECT_ID] region [$(REGION)] (env-preserving, MYTHOS_AUTH=google)…"; \
	gcloud run deploy mythos-api --source . --region $(REGION) --project "$$PROJECT_ID" --timeout $(CLOUD_RUN_TIMEOUT) --update-env-vars "$$AUTH_ENV" --update-labels "git-sha=$$(git rev-parse --short HEAD)$$(git diff --quiet HEAD -- || echo -dirty)" --quiet

# A NEW revision with ZERO traffic, reachable only at its tag URL (https://v2-preview---<service-url>; tags need ≥ 3 characters). Promote later with
# `gcloud run services update-traffic mythos-api --to-tags v2-preview=100` (owner call).
deploy-preview:
	@test -f .env || { echo "ERROR: .env not found"; exit 1; }
	@test -f $(FIREBASE_WEB_CONFIG) || { echo "ERROR: $(FIREBASE_WEB_CONFIG) missing — run make firebase-web first"; exit 1; }
	@PROJECT_ID=$$(grep -E '^PROJECT_ID=' .env | cut -d= -f2- | tr -d '"'); \
	test -n "$$PROJECT_ID" || { echo "ERROR: PROJECT_ID not set in .env"; exit 1; }; \
	AUTH_ENV=$$($(AUTH_ENV_VARS) "$$PROJECT_ID" 2>/dev/null) || { echo "ERROR: $(FIREBASE_WEB_CONFIG) is not a complete Firebase web config — re-run make firebase-web"; exit 1; }; \
	ADMIN_EMAILS=$$(grep -E '^MYTHOS_ADMIN_EMAILS=' .env | cut -d= -f2- | tr -d '"'); \
	test -z "$$ADMIN_EMAILS" || AUTH_ENV="$$AUTH_ENV@@MYTHOS_ADMIN_EMAILS=$$ADMIN_EMAILS"; \
	for KEY in MYTHOS_CONTACT_EMAIL MYTHOS_DEVELOPER_NAME MODEL MYTHOS_DEMO_CODES $(BUDGET_ENV_KEYS); do \
		VAL=$$(grep -E "^$$KEY=" .env | cut -d= -f2- | tr -d '"'); \
		test -z "$$VAL" || AUTH_ENV="$$AUTH_ENV@@$$KEY=$$VAL"; \
	done; \
	echo "Deploying a NO-TRAFFIC preview revision (tag v2-preview) of mythos-api to [$$PROJECT_ID] [$(REGION)] (MYTHOS_AUTH=google)…"; \
	gcloud run deploy mythos-api --source . --region $(REGION) --project "$$PROJECT_ID" --timeout $(CLOUD_RUN_TIMEOUT) --update-env-vars "$$AUTH_ENV" --update-labels "git-sha=$$(git rev-parse --short HEAD)$$(git diff --quiet HEAD -- || echo -dirty)" --no-traffic --tag v2-preview --quiet

# Whole-run UI bot: plays map -> events -> fights -> rewards through the real buttons (headless, muted, private ports),
# then tours shop / safehouse / treasure / final choice -> ending. Fails on a stuck screen or any console error. ~20 min.
playthrough:
	$(VENV)/bin/python scripts/dev/ui_playthrough.py --runs 1 --max-minutes 45

# ~3 min version for before a deploy: 5 map nodes through the real UI, then the shop/safehouse/treasure/final-choice tour.
# GM line eval set (scripts/dev/gm_eval.py): the frozen prompts through the configured model, deterministic metrics,
# writes outputs/gm-eval/. Local Ollama by default; Vertex (billed) with MYTHOS_NARRATIVE_PROVIDER=vertex MODEL=….
# Compare a prompt/model change with GM_EVAL_ARGS="--baseline outputs/gm-eval/<before>.json" (exit 1 on regression).
gm-eval:
	MYTHOS_LOG_LEVEL=ERROR $(VENV)/bin/python scripts/dev/gm_eval.py $(GM_EVAL_ARGS)

# Vertex spend cap (scripts/ops/vertex_cap): redeploy the function that disables aiplatform.googleapis.com when the
# "mythos-vertex-cap-30000" budget (₩30,000/month after credits, from 2026-11) is reached, and re-enables it next month.
vertex-cap-deploy:
	@P=$$(grep -E '^PROJECT_ID=' .env | cut -d= -f2- | tr -d '"'); cd scripts/ops/vertex_cap && gcloud functions deploy vertex-cap --gen2 --runtime python312 --region $(REGION) --project "$$P" --source . --entry-point on_budget --trigger-topic billing-vertex-cap --service-account "vertex-cap@$$P.iam.gserviceaccount.com" --trigger-service-account "vertex-cap@$$P.iam.gserviceaccount.com" --set-env-vars "PROJECT_ID=$$P,CAP_START=2026-11" --memory 256Mi --max-instances 1 --quiet

playthrough-quick:
	$(VENV)/bin/python scripts/dev/ui_playthrough.py --runs 1 --max-minutes 8 --max-nodes 5

# After `make deploy-preview`: the no-traffic revision must be built from HEAD, healthy, in google sign-in mode and serve
# the committed bundle. Read-only; prints the promote command only when everything passes.
verify-preview:
	$(VENV)/bin/python scripts/dev/verify_preview.py

# Store trailer: records the real game (headless, muted, private ports) and cuts it with ffmpeg → outputs/trailer/mythos2_trailer.mp4.
# `make trailer-cut` re-cuts the kept recordings only (captions, timing) without re-recording.
trailer:
	$(VENV)/bin/python scripts/trailer/record_trailer.py --keep-raw

trailer-cut:
	$(VENV)/bin/python scripts/trailer/record_trailer.py --cut-only --keep-raw

# Cinematic trailer (scripts/trailer/cinematic.py) → outputs/trailer/cinematic/:
#   mythos2_cinematic_photo.mp4 (YouTube/SNS: photoreal shots) and mythos2_cinematic_store.mp4 (Play Store: painted
#   hook + expert-bot gameplay). Vertex Veo API calls are disabled (Owner directive 2026-10-18); use `make cinematic-prompts`
#   and `docs/test/veo_gemini_owner_guide.md` to generate clips manually in the Gemini web app.
cinematic-prompts:
	$(VENV)/bin/python scripts/trailer/gen_veo.py --print-prompts
	$(VENV)/bin/python scripts/trailer/gen_veo.py --print-prompts --style photo

cinematic-assets:
	$(VENV)/bin/python scripts/trailer/gen_stills.py --shot all --engine codex
	$(VENV)/bin/python scripts/trailer/record_trailer.py --out outputs/trailer/hq --scale 1.5 --record-only
	$(VENV)/bin/python scripts/trailer/record_trailer.py --out outputs/trailer/hq --scale 1.5 --record-only --scenes store
	$(VENV)/bin/python scripts/trailer/cinematic.py audio

cinematic:
	$(VENV)/bin/python scripts/trailer/cinematic.py build --style photo
	$(VENV)/bin/python scripts/trailer/cinematic.py build --cut store

# --- Android app (Capacitor; docs/android.md) ---------------------------------------------------------------------

android-web:         # web bundle for the app (dist-app/) + copy resources/neo-seoul into the Android web assets
	@scripts/android/build-web.sh
android-apk:         # debug APK (needs the Android SDK; see docs/android.md)
	@scripts/android/build-apk.sh
android-aab:         # OWNER: signed release bundle for Play (needs android/keystore.properties; VERSION_CODE=<n> required)
	@scripts/android/build-aab.sh
android-firebase:    # fetch google-services.json for the registered Firebase Android app (not committed)
	@scripts/android/fetch-firebase-config.sh
android-emulator:    # boot the headless, silent emulator profile used for smoke tests
	@scripts/android/emulator.sh
android-distribute:  # upload the debug APK to Firebase App Distribution (no testers unless given)
	@scripts/android/distribute.sh
android-icons:       # regenerate launcher icons and splash from the logo
	$(VENV)/bin/python scripts/android/make_icons.py

# --- Firebase sign-in + daily push (docs/online.md) ---------------------------------------------------------------

firebase-web:            # register the Firebase web app (once) + write .firebase/web-config.json (gitignored, not printed)
	@scripts/firebase/web-app.sh
firebase-sha:            # register the debug keystore SHA-1 on the Firebase Android app (Google sign-in on Android)
	@scripts/firebase/android-sha.sh
firebase-auth-domains:   # OWNER: add the Cloud Run hosts to Firebase Auth authorized domains (after enabling Google)
	@scripts/firebase/auth-domains.sh
push-schedule:           # OWNER: create/update the daily FCM topic jobs in Cloud Scheduler (DRY_RUN=1 to preview)
	@scripts/firebase/push-schedule.sh
PUSH_TOPIC ?= daily-ko
PUSH_LANG ?=
push-test:               # send one daily notification to a topic: make push-test PUSH_TOPIC=<topic> [PUSH_LANG=ko|en]
	@scripts/firebase/push-test.sh "$(PUSH_TOPIC)" $(PUSH_LANG)

# --- local infra (Postgres for /api/v2 saves; the API also runs without it on an in-memory store) ----------------

dev-up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "Waiting for Postgres to be ready..."
	@for i in $$(seq 1 30); do \
		$(COMPOSE) -f $(COMPOSE_FILE) exec -T postgres pg_isready -U mythos >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	@$(MAKE) db-migrate || echo "db-migrate skipped/failed (이미 적용됐을 수 있음)"
	@(curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1 && echo "Ollama: 실행 중") || echo "⚠ Ollama 미실행 — GM은 미리 쓴 문장으로 대신한다('ollama serve'로 켜기)"
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
