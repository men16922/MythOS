#!/usr/bin/env bash
#
# run.sh — Project MythOS 무인 overnight 루프 러너
# ----------------------------------------------------------------------------
# 헤드리스 Claude Code 를 회차 단위로 반복 호출한다. 매 회차는 작은 컨텍스트로
# 상태를 복원(/sync)하고 → NEXT_PLAN 의 [auto] 작업 1개를 구현·게이트 통과시키고
# → 기록(/checkpoint)하고 → 로컬 커밋한다. 회차마다 커밋되므로 언제 멈춰도 손실은
# 최대 1회차다. 설계 설명: docs/engineering/mythos/LOOP.md
#
# 사용:
#   caffeinate -dimsu scripts/overnight/run.sh &     # Mac 절전 방지 + 백그라운드
#   scripts/overnight/run.sh --once                  # 1회차만 (검증용)
#   touch scripts/overnight/STOP                      # graceful 중단 (현재 회차 마치고 종료)
#   tail -f scripts/overnight/logs/runner.log         # 관찰
#   # 아침에: claude 세션에서 /overnight-report
#
# 종료 조건: DONE(백로그 소진/전부 blocked) · STOP(수동) · MAX_ITER 도달 ·
#            연속 실패 MAX_CONSEC_FAIL 회 · 무진행 MAX_NO_PROGRESS 회.
#
# 안전: claude 회차는 scripts/overnight/overnight-settings.json 권한 경계로만 실행된다
#       (git push·네트워크·파괴 make·Web/MCP deny). interactive 설정은 건드리지 않는다.
# ----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# --- 엔진 선택 (claude | codex | agy | kiro) — 동일 LOOP, 호출 에이전트만 다름 ---
: "${ENGINE:=claude}"

# git 객체 저장소(common dir). worktree 에선 .git 이 파일이고 실제 저장소는 메인의 .git 이다 —
# codex 샌드박스가 commit(.git/objects/refs) 하려면 이 경로가 writable_roots 에 있어야 한다.
GIT_COMMON_DIR="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || echo "$REPO_ROOT/.git")"

# --- 경로 (REPO_ROOT 기준 상대 — overnight-settings.json allow 패턴과 일치) ---
case "$ENGINE" in
  codex) PROMPT_FILE="scripts/overnight/PROMPT.codex.md" ;;
  agy)   PROMPT_FILE="scripts/overnight/PROMPT.agy.md" ;;
  kiro)  PROMPT_FILE="scripts/overnight/PROMPT.md" ;;
  *)     PROMPT_FILE="scripts/overnight/PROMPT.md" ;;
esac
SETTINGS_FILE="scripts/overnight/overnight-settings.json"   # claude 전용 권한 경계
STOP_FILE="scripts/overnight/STOP"
DONE_FILE="scripts/overnight/DONE"
LOG_DIR="scripts/overnight/logs"
RUNNER_LOG="$LOG_DIR/runner.log"
STATUS_TSV="$LOG_DIR/status.tsv"   # 머신리더블 회차 원장(status.sh/대시보드 소비): ts engine branch iter outcome head dur

# --- 튜닝 가능한 환경변수 (MythOS 기본값) ---
: "${MAX_ITER:=20}"             # 총 회차 상한 (폭주 방지 백스톱; 얇은 백로그엔 20이면 충분)
: "${ITER_TIMEOUT:=1800}"       # 회차당 최대 실행 초 (make check ~30-60s, 여유 30분)
: "${LIMIT_WAIT:=1800}"         # usage/session limit 감지 시 대기 초
: "${PAUSE:=30}"                # 회차 간 간격 초
: "${MAX_CONSEC_FAIL:=3}"       # 연속 실패 N회 시 안전 중단
: "${MAX_NO_PROGRESS:=2}"       # success인데 새 커밋 없음 연속 N회 시 안전 중단 (얇은 백로그의 주 종료 사유)
: "${KEEP_ITER_LOGS:=30}"       # iter-*.log 최근 N개만 보존 (runner.log 는 항상 보존)
: "${ITER_LOG_MAX_KB:=768}"     # WS5: 회차 로그 캡(KB, 0=무제한). 분류·사용량 파싱 뒤 head+tail 만 보존
: "${OVERNIGHT_DIGEST:=1}"      # WS5: 종료 시 자동 다이제스트(logs/digest-*.md) 작성 + 메일(--once 는 파일만)
: "${GATE_CMD:=make check}"     # 커밋 게이트(green) = ruff + eslint + mypy + tsc/vite-build + unittest.
                                 # 더 빠른 변형: GATE_CMD="make check-auto"(mypy 제외) 또는 "make smoke-local".
export GATE_CMD                 # PROMPT.md 가 $GATE_CMD 로 참조

# --- /goal 통합 (2026-06-19, docs/plans/2026-06-19-goal-in-overnight-loop.md) ---
# WS-α: 커밋 회차마다 외부에서 $GATE_CMD 를 재실행해 phantom-success(커밋됐으나 게이트 RED)를 검출.
#   엔진 무관(claude/codex/agy 공통) → 신뢰가 대칭. 권위 검증은 invocation 내부가 아니라 여기(bash).
: "${OVERNIGHT_VERIFY_GATE:=1}"  # 1=활성(권장). 0=비활성(in-invocation 게이트만 신뢰 — 구버전 동작).
# WS-β: claude 레인 프롬프트 앞에 /goal 디렉티브를 주입해 "green+커밋까지 수렴"을 강제 + Haiku 2차평가.
#   claude 전용(codex/agy 엔 /goal 없음). soft 바운드라 ITER_TIMEOUT(하드 실링)는 그대로 유지.
: "${OVERNIGHT_GOAL:=0}"          # 1=활성(opt-in). 0=기존 산문 흐름(기본).
: "${GOAL_MAX_TURNS:=12}"         # /goal 자체 턴 바운드(soft). 하드 실링은 ITER_TIMEOUT.
GOAL_DIRECTIVE="/goal Either (a) the selected [auto]/[auto:claude] backlog item is implemented, '$GATE_CMD' has been run and exited 0 (fully green), and the change is committed (git HEAD advanced, Co-Authored-By trailer); OR (b) the item is recorded [blocked] with a phase+evidence Blocker and the working tree restored clean (git restore); OR (c) no consumable [auto]/[auto:claude] item remains (DONE). Stop after $GOAL_MAX_TURNS turns regardless."

# --- Critic 패스 (plugin 0.5.0 포팅, opt-in) ---
# 재게이트(GREEN)를 통과한 새 커밋에 대해, 두 번째 읽기 전용 에이전트가 그 커밋 diff 만 검토한다.
# 오프라인 게이트가 못 잡는 것 — 회귀, 스코프크립, 통과용으로 약화/삭제된 테스트, 실패를 가리는
# 데드코드 — 을 노린다. FAIL 이면 phantom 과 동일하게 revert. 다른 역할(+선택적 다른 모델)이
# 동일 모델 자기검토 편향을 상쇄한다. 엔진별 읽기 전용 모드: claude=--permission-mode plan ·
# codex=exec --sandbox read-only · agy=--print(권한 스킵 없음).
#   OVERNIGHT_CRITIC: auto=기본(위험 diff만) · 1=항상 · 0=끄기.
: "${OVERNIGHT_CRITIC:=auto}"          # auto(기본, 위험 게이트) | 1(항상) | 0(끄기)
: "${OVERNIGHT_CRITIC_MODEL:=}"        # 선택: actor 와 다른 모델로 critic 실행
: "${OVERNIGHT_CRITIC_MAX_FILES:=8}"   # auto: 변경 파일 수 초과 시 위험(스코프크립)
: "${OVERNIGHT_CRITIC_MAX_LINES:=400}" # auto: 변경 라인(add+del) 초과 시 위험
: "${OVERNIGHT_CRITIC_MAX_DIRS:=4}"    # auto: 변경된 top-level 디렉토리 수 초과 시 위험(확산)
# CRITIC_PROMPT.md: repo 로컬(없으면 build_critic_prompt 의 내장 기본 사용).
CRITIC_PROMPT_FILE="scripts/overnight/CRITIC_PROMPT.md"

# --- 자동 브라우저 QA 패스 (WS-C/D, opt-in; 설계 bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md) ---
# 게이트+critic 통과한 새 커밋이 UI/런타임/시나리오를 건드리면(후보 필터) AGY 가 브라우저 QA(증거수집)를
# 한다. PASS/SKIP=유지+계속, FAIL/NEEDS=정지(revert 안 함)+알림. 사람 사인오프는 여전히 권위.
#   OVERNIGHT_BROWSER_QA: auto=후보필터+AGY 2단계 결정(기본) · 0=끄기(인시던트 킬스위치).
#   2026-06-21 실 통합 1회 통과(run 20260621-113313-drain, Chrome DevTools, PASS_CANDIDATE) 후 기본 0→auto.
: "${OVERNIGHT_BROWSER_QA:=auto}"
# 함수만 정의(maybe_browser_qa / maybe_drain_browser_qa) + QA_* 기본값 — 끈 상태에선 무영향.
# shellcheck source=scripts/overnight/browser-qa.sh
. "$SCRIPT_DIR/browser-qa.sh"

# --- A2A 러너 중개 릴레이 (2026-07-12, bin/docs/plans/2026-07-12-a2a-relays.md) ---
# 라이브 A2A(상시 에이전트 연결) 대신 기존 관용구(critic/browser-qa 형 one-shot 릴레이)로
# 엔진 간 협업 2종을 러너가 중개한다. one-shot 회차의 복구성(손실 최대 1회차)은 그대로 유지.
# Relay 1 — 이미지 정체성 판정 게이트: 커밋이 캐릭터/적 아트를 추가·변경하면 claude 시각 판정자가
#   신규 이미지를 같은 캐릭터의 정본(-idle/-guard 형제·초상)과 대조, FAIL 이면 critic-reject 처럼 revert.
#   (실증 동기: 2026-07-11 cover 스프라이트 배치의 정체성 뒤섞임이 커밋 후에야 사람에게 발견됨.)
: "${OVERNIGHT_IMAGE_JUDGE:=1}"   # 1=활성(기본) · 0=끄기
: "${IMAGE_JUDGE_MAX:=8}"         # 회차당 판정 신규 이미지 상한(초과분은 미판정 로그)
# Relay 2 — 당일 블로커 에스컬레이션: codex/agy 회차가 Blocker/[blocked] 를 기록하면 다음 1회차를
#   claude 가 그 항목만 크로스레인으로 처리(아침까지 대기 없음). claude→codex failover 의 역방향 일반화.
: "${OVERNIGHT_ESCALATE:=1}"      # 1=활성(기본) · 0=끄기 (--once 는 다음 회차가 없어 미발동)
: "${MAX_ESCALATE:=2}"            # 러너 1회 실행당 에스컬레이션 상한(루프 방지)

ONCE=0
[ "${1:-}" = "--once" ] && ONCE=1

mkdir -p "$LOG_DIR"

log() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$RUNNER_LOG"
}

# 머신리더블 회차 원장(탭 구분, status.sh/대시보드가 소비). human runner.log 와 병행.
# 컬럼: ts engine branch iter outcome head dur(s) gate_exit commit_verified critic_exit tokens cost fail_class
#   gate_exit/commit_verified = WS-α 외부 재게이트 결과(빈칸=미측정 회차).
#   critic_exit = critic 패스 결과(0=PASS/1=FAIL, critic off/미지원 시 빈칸).
#   tokens/cost = iter 로그에서 파싱한 엔진 사용량(미노출 시 빈칸).
#   fail_class  = 실패 서브태그(infra/logic), failure 회차에만.
#   status.sh 는 f4-f7 만 읽으므로 f8 이후 추가 컬럼은 하위호환(append-only).
emit_status() {
  local outcome="$1" head="${2:-}" dur="${3:-}" gate="${4:-}" verified="${5:-}" \
        critic="${6:-}" tokens="${7:-}" cost="${8:-}" fclass="${9:-}" branch
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  [ -f "$STATUS_TSV" ] || printf 'ts\tengine\tbranch\titer\toutcome\thead\tdur\tgate_exit\tcommit_verified\tcritic_exit\ttokens\tcost\tfail_class\n' > "$STATUS_TSV"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S')" "$ENGINE" "$branch" "$iter" "$outcome" "${head:0:9}" "$dur" "$gate" "$verified" "$critic" "$tokens" "$cost" "$fclass" >> "$STATUS_TSV"
}

# 실패 클래스 종료에서만 호스트 메일 알림(성공/정상 종료엔 안 부름 — 과다 발송 방지).
# 발송 수단/수신자는 scripts/overnight/notify.sh(SMTP 또는 macOS Mail). 알림 실패가 러너를 죽이지 않는다.
notify_failure() {
  local reason="$1"
  local branch recent body
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  recent="$(git log --oneline -5 2>/dev/null)"
  body="MythOS overnight 루프가 점검이 필요한 상태로 종료됐습니다.

엔진     : $ENGINE
브랜치   : $branch
종료사유 : $reason
총 회차  : $iter
시각     : $(date '+%Y-%m-%d %H:%M:%S')

최근 커밋:
$recent

마지막 회차 로그: ${ITER_LOG:-(없음)} (HEAD 잔여물/Blocker 확인). 아침 검수는 /overnight-report."
  bash scripts/overnight/notify.sh "[MythOS overnight] 점검 필요 — $ENGINE: $reason" "$body" \
    >> "$RUNNER_LOG" 2>&1 || true
}

# --- timeout 바이너리 탐지 (macOS 는 coreutils 의 gtimeout) ---
TIMEOUT_BIN=""
if command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_BIN="gtimeout"
elif command -v timeout >/dev/null 2>&1; then
  TIMEOUT_BIN="timeout"
fi

# --- 사전 점검 ---
case "$ENGINE" in
  codex) command -v codex >/dev/null 2>&1 || { log "치명: 'codex' CLI 를 PATH 에서 못 찾음 — 종료"; exit 1; } ;;
  agy)   command -v agy   >/dev/null 2>&1 || { log "치명: 'agy' CLI 를 PATH 에서 못 찾음 — 종료"; exit 1; } ;;
  kiro)  command -v kiro-cli >/dev/null 2>&1 || { log "치명: 'kiro-cli' 를 PATH 에서 못 찾음 — 종료"; exit 1; } ;;
  claude)
    command -v claude >/dev/null 2>&1 || { log "치명: 'claude' CLI 를 PATH 에서 못 찾음 — 종료"; exit 1; }
    [ -f "$SETTINGS_FILE" ] || { log "치명: $SETTINGS_FILE 없음 — 종료"; exit 1; } ;;
  *) log "치명: 알 수 없는 ENGINE='$ENGINE' (claude|codex|agy|kiro) — 종료"; exit 1 ;;
esac
[ -f "$PROMPT_FILE" ]   || { log "치명: $PROMPT_FILE 없음 — 종료"; exit 1; }
[ -n "$TIMEOUT_BIN" ] || log "경고: gtimeout/timeout 없음 — 회차 타임아웃 비활성 (brew install coreutils 권장)"

PROMPT_CONTENT="$(cat "$PROMPT_FILE")"

# critic 프롬프트는 지연 로드(critic 활성 회차에만) — 템플릿이 없어도 비-critic 회차는 안 깨진다.
# 빈 문자열 = "템플릿 없음" → build_critic_prompt 가 내장 기본으로 폴백.
CRITIC_PROMPT_CONTENT=""
if [ "$OVERNIGHT_CRITIC" != "0" ] && [ -f "$CRITIC_PROMPT_FILE" ]; then
  CRITIC_PROMPT_CONTENT="$(cat "$CRITIC_PROMPT_FILE")"
fi

# WS5 회차 출력 캡: 폭주 스트림(토큰 스팸/에러 루프)이 iter 로그를 무한정 키우는 것을 막는다.
# 반드시 classify_outcome/parse_usage **이후** 호출 — 둘 다 파일 전체를 파싱하며, 결과 JSON 은
# 로그 끝에 있으므로 head+tail 보존이면 사후 재분류(수동 디버깅)도 안전하다. 회차 중 실시간
# 디스크 폭주는 ITER_TIMEOUT(하드 실링)이 지속시간을 바운드한다.
cap_iter_log() {
  local f="$1" max_bytes head_bytes tail_bytes size tmp
  [ "$ITER_LOG_MAX_KB" -gt 0 ] 2>/dev/null || return 0
  [ -f "$f" ] || return 0
  max_bytes=$((ITER_LOG_MAX_KB * 1024))
  size=$(wc -c < "$f" | tr -d ' ')
  [ "$size" -le "$max_bytes" ] && return 0
  head_bytes=$((max_bytes / 8))
  tail_bytes=$((max_bytes - head_bytes))
  tmp="$f.cap.$$"
  {
    head -c "$head_bytes" "$f"
    printf '\n\n[runner] iter log truncated: %s bytes total, kept head %sB + tail %sB (ITER_LOG_MAX_KB=%s)\n\n' \
      "$size" "$head_bytes" "$tail_bytes" "$ITER_LOG_MAX_KB"
    tail -c "$tail_bytes" "$f"
  } > "$tmp" && mv "$tmp" "$f"
  log "회차 로그 캡 적용: $(basename "$f") ${size}B → ~${max_bytes}B (head+tail 보존)"
}

# iter-*.log 를 최근 KEEP_ITER_LOGS 개만 남기고 정리
prune_logs() {
  local logs
  logs="$(ls -1t "$LOG_DIR"/iter-*.log 2>/dev/null)" || return 0
  [ -z "$logs" ] && return 0
  printf '%s\n' "$logs" | tail -n +"$((KEEP_ITER_LOGS + 1))" | while read -r f; do
    [ -n "$f" ] && rm -f "$f"
  done
}

# 회차 결과 분류: success / limit / failure
# 1) claude --output-format json 의 객체 is_error==false → success
# 2) codex JSONL 의 turn.completed (rc==0) → success (codex 이벤트엔 is_error 필드가 없다)
# 3) 성공이 아닐 때만 limit 텍스트 검사 — 에이전트의 **마지막 메시지**에서만.
#    전체 로그 검사는 저장소 문서/커밋 제목에 에코된 "quota"/"rate limit" 문자열로
#    성공 회차를 limit 으로 오탐했다 (2026-07-11 codex 회차 → 회차마다 30분 헛대기).
# 4) 그 외 rc≠0 → failure, 아니면 success
classify_outcome() {
  python3 - "$1" "$2" <<'PY'
import sys, json
rc = int(sys.argv[1])
try:
    with open(sys.argv[2], "r", errors="replace") as f:
        text = f.read()
except OSError:
    text = ""

obj = None
turn_completed = False
last_agent_msg = None
# claude -p --output-format json 은 단일 JSON 객체를 낸다; codex 는 JSONL 이벤트 스트림.
try:
    cand = json.loads(text)
    if isinstance(cand, dict):
        obj = cand
except Exception:
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            cand = json.loads(line)
        except Exception:
            continue
        if not isinstance(cand, dict):
            continue
        obj = cand
        typ = cand.get("type")
        if typ == "turn.completed":
            turn_completed = True
        elif typ == "item.completed":
            item = cand.get("item")
            if isinstance(item, dict) and item.get("type") == "agent_message":
                last_agent_msg = item.get("text") or ""

if isinstance(obj, dict) and obj.get("is_error") is False:
    print("success"); sys.exit(0)
if turn_completed and rc == 0:
    print("success"); sys.exit(0)

scan = last_agent_msg if last_agent_msg is not None else text
low = scan.lower()
markers = ["usage limit", "session limit", "rate limit", "overloaded",
           "hit your", "too many requests", "quota"]
if any(m in low for m in markers):
    print("limit"); sys.exit(0)

print("failure" if rc != 0 else "success")
PY
}

# critic 프롬프트 조립: 템플릿(repo CRITIC_PROMPT.md, 없으면 내장 기본) + 검토 대상 diff(컨텍스트 보호 캡).
build_critic_prompt() {
  local range="$1" diff body
  diff="$(git diff "$range" 2>/dev/null | head -c 60000)"
  if [ -n "$CRITIC_PROMPT_CONTENT" ]; then
    body="$CRITIC_PROMPT_CONTENT"
  else
    body="You are an independent reviewer for an unattended coding loop. The change below already
passed the offline gate ('$GATE_CMD'). Review ONLY for problems the gate cannot catch: regressions,
scope-creep beyond the task, tests deleted/weakened to pass, or dead code masking a failure. Do not
re-report style/lint. Be conservative — PASS unless there is clear evidence of harm.
End your reply with EXACTLY one line: 'CRITIC_VERDICT: PASS — <reason>' or 'CRITIC_VERDICT: FAIL — <reason>'."
  fi
  printf '%s\n\n## Diff under review (range %s)\n\n```diff\n%s\n```\n' "$body" "$range" "$diff"
}

# OVERNIGHT_CRITIC=auto 용 위험 분류. LLM 없이 git 메타데이터 + 내용 스캔으로 커밋 diff 를 판정한다.
# critic 패스가 필요하면 비어있지 않은 사유 문자열을, 건너뛰어도 되는 저위험 위생 커밋이면 "" 를 출력.
# 휴리스틱(하나라도 걸리면 RUN): test 파괴 · suppress 마커 추가 · 민감/시크릿/생성 파일 · 바이너리 ·
#   삭제 과다 · 스코프(파일/라인/디렉토리) 초과.
critic_risk_reason() {
  local range="$1" reason td sup
  reason="$(git diff --numstat "$range" 2>/dev/null | awk -F'\t' \
      -v maxf="$OVERNIGHT_CRITIC_MAX_FILES" -v maxl="$OVERNIGHT_CRITIC_MAX_LINES" -v maxd="$OVERNIGHT_CRITIC_MAX_DIRS" '
    {
      add=($1=="-"?0:$1); del=($2=="-"?0:$2); path=$3
      files++; tadd+=add; tdel+=del
      if ($1=="-" && $2=="-") binbad=1                      # 바이너리 파일(numstat 가 -/- 로 표기)
      d=path; sub(/\/.*/,"",d); if(d==path) d="."; if(!(d in seen)){seen[d]=1; dirs++}
      lp=tolower(path)
      istest = (lp ~ /(^|\/)(test|tests|spec|specs|__tests__)(\/|$)/ || lp ~ /(test|spec)[._-]/ || lp ~ /[._-](test|spec)\./)
      if (istest && del>add && del>0) reason = reason (reason?"; ":"") "test-shrunk:" path
      if (path ~ /(^|\/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|poetry\.lock|pyproject\.toml|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|Makefile|Dockerfile|docker-compose|\.github\/|\.gitlab-ci|\.circleci\/|Jenkinsfile|setup\.(py|cfg))/)
        reason = reason (reason?"; ":"") "sensitive:" path
      if (lp ~ /(^|\/)\.env($|\.)|\.pem$|\.key$|id_rsa|(^|\/)secrets?\.|credentials/)
        reason = reason (reason?"; ":"") "secret-file:" path
      if (path ~ /(^|\/)(migrations?|dist|build|vendor|node_modules)\/|\.min\.(js|css)$|\.generated\.|\.pb\.go$|_pb2\.py$/)
        reason = reason (reason?"; ":"") "generated:" path
    }
    END {
      if (files+0 > maxf+0) reason = reason (reason?"; ":"") "scope-files:" files
      if (tadd+tdel > maxl+0) reason = reason (reason?"; ":"") "scope-lines:" (tadd+tdel)
      if (dirs+0 > maxd+0) reason = reason (reason?"; ":"") "dir-spread:" dirs
      if (binbad) reason = reason (reason?"; ":"") "binary"
      if (tdel > 50 && tdel > 3*tadd) reason = reason (reason?"; ":"") "deletion-heavy:-" tdel "/+" tadd
      printf "%s", reason
    }')"
  # 완전 삭제된 test 파일(name-status D 가 권위 — numstat 만으로는 놓칠 수 있음)
  td="$(git diff --name-status "$range" 2>/dev/null | awk -F'\t' '$1 ~ /^D/ && tolower($2) ~ /(test|spec)/ { printf "test-deleted:%s;", $2 }')"
  [ -n "$td" ] && reason="${reason:+$reason; }${td%;}"
  # diff 에 추가된 skip/ignore/disable 디렉티브 — green 게이트가 절대 못 잡는다.
  sup="$(git diff "$range" 2>/dev/null | head -c 400000 | grep -E '^\+' | grep -vE '^\+\+\+' \
      | grep -iEo 'eslint-disable|ts-(ignore|nocheck)|noqa|type:[[:space:]]*ignore|pytest\.mark\.skip|unittest\.skip|skipif|xfail|pragma:[[:space:]]*no[[:space:]]*cover|istanbul ignore|pylint:[[:space:]]*disable|nosec|@Ignore|@Disabled|@SuppressWarnings|\.only\(|\.skip\(|fdescribe|fit\(|xdescribe|xit\(' \
      | head -1 || true)"
  [ -n "$sup" ] && reason="${reason:+$reason; }suppress-marker:$sup"
  printf '%s' "$reason"
}

# critic 를 읽기 전용으로 실행하고 판정 출력: PASS | FAIL | SKIP.
# fail-open: 파싱 불가/빈 판정은 PASS 취급(게이트는 이미 통과 — 파싱 글리치로 멀쩡한 작업을 버리지 않는다).
# SKIP = 읽기 전용 모드 없는 엔진.
critic_verdict() {
  local range="$1" cprompt clog verdict mflag=""
  # 모델 id 는 공백이 없어 unquoted word-split 안전(bash 3.2 + set -u 의 빈 배열 확장 회피).
  [ -n "$OVERNIGHT_CRITIC_MODEL" ] && mflag="--model $OVERNIGHT_CRITIC_MODEL"
  cprompt="$(build_critic_prompt "$range")"
  clog="$LOG_DIR/critic-$iter.log"
  set +e
  case "$ENGINE" in
    claude)
      # plan 권한 모드 = 읽기 전용(편집/변경 명령 불가).
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} claude -p "$cprompt" \
        --permission-mode plan --settings "$SETTINGS_FILE" $mflag --output-format json > "$clog" 2>&1
      ;;
    codex)
      # --sandbox read-only = 파일시스템 읽기 전용. </dev/null: exec stdin freeze 방지.
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} codex exec --cd "$REPO_ROOT" \
        --sandbox read-only -c approval_policy=never --json $mflag "$cprompt" > "$clog" 2>&1 </dev/null
      ;;
    agy)
      # print 모드 + --dangerously-skip-permissions 없음: 읽기는 되고 쓰기는 적용 안 됨.
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} agy --print "$cprompt" \
        --print-timeout 30m --add-dir "$REPO_ROOT" </dev/null > "$clog" 2>&1
      ;;
    kiro)
      # critic 전용 프로필(allowedTools=read-only) + --trust-all-tools 로 무인 실행.
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} kiro-cli chat \
        --no-interactive --trust-all-tools --effort high \
        --agent overnight-harness-critic \
        "$cprompt" > "$clog" 2>&1
      ;;
    *)
      set -e; echo SKIP; return 0
      ;;
  esac
  set -e
  # 판정 줄은 평문 — JSON result 필드든 stdout 이든 grep 으로 잡힌다.
  verdict="$(grep -oiE 'CRITIC_VERDICT:[[:space:]]*(PASS|FAIL)' "$clog" 2>/dev/null \
    | grep -oiE '(PASS|FAIL)' | tail -1 | tr '[:lower:]' '[:upper:]')"
  if [ -z "$verdict" ]; then
    log "  critic: 판정 파싱 실패 — fail-open(PASS); 로그: $clog"
    echo PASS; return 0
  fi
  echo "$verdict"
}

# --- A2A Relay 1 헬퍼 -------------------------------------------------------
# 커밋 range 에서 정체성 판정 대상(추가/변경된 캐릭터·적 아트) 나열.
image_judge_targets() {
  git diff --name-status "$1" 2>/dev/null \
    | awk -F'\t' '$1 ~ /^(A|M)/ && $2 ~ /^resources\/[^\/]+\/(characters|enemies)(\/|$)/ \
        && tolower($2) ~ /\.(png|jpe?g|webp)$/ { print $2 }'
}

# 신규 이미지의 정본 레퍼런스 탐색: 같은 스템(-마지막 포즈 세그먼트 제거)의 -idle/-guard 형제 →
# 상위 디렉토리의 캐릭터 초상 순. 없으면 빈 출력(그 파일은 판정 스킵 — 최초 아트는 대조 기준이 없다).
image_judge_reference() {
  local f="$1" dir stem base cand
  dir="$(dirname "$f")"; stem="$(basename "$f")"; stem="${stem%.*}"; base="${stem%-*}"
  for cand in "$dir/$base-idle.png" "$dir/$base-guard.png" "$(dirname "$dir")/$base.png"; do
    [ "$cand" != "$f" ] && [ -f "$cand" ] && { printf '%s' "$cand"; return 0; }
  done
  return 0
}

# claude 시각 판정자(plan 모드=읽기 전용) 실행 → PASS|FAIL|SKIP.
# fail-open: claude CLI/설정 부재·레퍼런스 전무·판정 파싱 실패는 커밋을 버리지 않는다(게이트·critic 은 이미 통과).
image_judge_verdict() {
  local range="$1" files f ref pairs="" n=0 jlog jprompt verdict
  command -v claude >/dev/null 2>&1 || { echo SKIP; return 0; }
  [ -f "$SETTINGS_FILE" ] || { echo SKIP; return 0; }
  files="$(image_judge_targets "$range")"
  [ -n "$files" ] || { echo SKIP; return 0; }
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    ref="$(image_judge_reference "$f")"
    if [ -z "$ref" ]; then log "  image-judge: 정본 레퍼런스 없음 — 스킵: $f"; continue; fi
    n=$((n + 1))
    if [ "$n" -gt "$IMAGE_JUDGE_MAX" ]; then log "  image-judge: 상한 $IMAGE_JUDGE_MAX 초과 — 미판정: $f"; continue; fi
    pairs="$pairs
- NEW: $f
  CANON: $ref"
  done <<< "$files"
  [ "$n" -gt 0 ] || { echo SKIP; return 0; }
  jlog="$LOG_DIR/image-judge-$iter.log"
  jprompt="You are the image-identity judge for an unattended loop. For each pair below, Read BOTH image
files and compare the NEW art against the CANON art of the same character. FAIL when an identity
attribute differs: gender or species (human vs android/robot), hair style/length, signature features
(face mask, glasses, facial scar), signature palette (e.g. hologram-shield color), or when the NEW
image clearly depicts a different established character. Pose/action/framing differences are expected
and are NOT failures. Judge every pair; one bad pair fails the batch.
End with EXACTLY one line: 'IMAGE_JUDGE_VERDICT: PASS — <reason>' or 'IMAGE_JUDGE_VERDICT: FAIL — <file>: <reason>'.
$pairs"
  set +e
  $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} claude -p "$jprompt" \
    --permission-mode plan --settings "$SETTINGS_FILE" --output-format json > "$jlog" 2>&1
  set -e
  verdict="$(grep -oiE 'IMAGE_JUDGE_VERDICT:[[:space:]]*(PASS|FAIL)' "$jlog" 2>/dev/null \
    | grep -oiE '(PASS|FAIL)' | tail -1 | tr '[:lower:]' '[:upper:]')"
  if [ -z "$verdict" ]; then
    log "  image-judge: 판정 파싱 실패 — fail-open(PASS); 로그: $jlog"
    echo PASS; return 0
  fi
  echo "$verdict"
}

# 텔레메트리: 엔진 JSON 출력에서 토큰/비용을 best-effort 파싱. "tokens\tcost"(탭 구분, 미노출 시 빈칸) 출력.
# 루프를 절대 죽이지 않는다. 엔진별 스키마가 달라(claude/codex/agy) 하드코딩 대신 모든 JSON 객체를
# 재귀 스캔(전체 또는 줄단위 JSONL)해 토큰/비용 키를 찾아 최댓값 채택(누적/스트림 총계 대응).
parse_usage() {
  python3 - "$1" <<'PY'
import sys, json, re
try:
    with open(sys.argv[1], "r", errors="replace") as f:
        text = f.read()
except OSError:
    print("\t"); sys.exit(0)

objs = []
try:
    objs.append(json.loads(text))
except Exception:
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            objs.append(json.loads(line))
        except Exception:
            pass

# claude/codex/agy(및 OpenAI/Anthropic 스타일 usage 블록) 공통 키 패턴.
# 두 층: 명시적 "*_tokens" 키 + tokens/usage dict 아래의 bare input/output/total 키(엉뚱한 input 오집계 방지).
TOTAL = re.compile(r'total_tokens?$', re.I)
INTOK = re.compile(r'(input|prompt)_tokens$|cache_(read|creation)\w*_tokens$', re.I)
OUTTOK = re.compile(r'(output|completion)_tokens$', re.I)
COST = re.compile(r'cost', re.I)
USAGE_CTX = re.compile(r'tokens?$|usage', re.I)
BARE_IN = re.compile(r'(input|prompt|read|write|cache\w*)$', re.I)
BARE_OUT = re.compile(r'(output|completion)$', re.I)
BARE_TOTAL = re.compile(r'total$', re.I)

# 한 dict 의 "직속" 숫자 자식만으로 그 usage 블록의 토큰 총계를 계산한다.
#   - 직속만 보므로 cache_creation 의 ephemeral_* 하위분해(중첩 dict)는 더해지지 않는다(이중계상 방지).
#   - total_tokens 가 있으면 그것을, 없으면 입력성(+cache)+출력성 직속 키의 합을 쓴다.
# ctx=True 면(부모 키가 tokens/usage) bare input/output/total 도 인정(opencode {"tokens":{"input":..}}).
def block_total(d, ctx):
    tin = tout = ttot = 0
    for k, v in d.items():
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            continue
        if TOTAL.search(k) or (ctx and BARE_TOTAL.match(k)):     ttot = max(ttot, v)
        elif INTOK.search(k) or (ctx and BARE_IN.match(k)):      tin += v
        elif OUTTOK.search(k) or (ctx and BARE_OUT.match(k)):    tout += v
    return ttot if ttot > 0 else (tin + tout)

# 트리를 순회하며 (a) 모든 usage 블록의 자체 총계 중 MAX 토큰, (b) 모든 cost 중 MAX 를 잡는다.
# 합산이 아니라 블록 간 MAX 이므로 iterations[]/modelUsage 같은 "같은 호출의 중복 뷰"가 부풀리지 않는다
# (스트림 JSONL 의 누적/부분 행도 최종(최대)만 채택). ephemeral 하위블록은 항상 총계 미만이라 자연 탈락.
def walk(o, ctxkey, acc):
    if isinstance(o, dict):
        bt = block_total(o, bool(USAGE_CTX.search(ctxkey)))
        if bt > acc['tok']:
            acc['tok'] = bt
        for k, v in o.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                if COST.search(k):
                    acc['cost'] = max(acc['cost'], float(v))
            else:
                walk(v, k, acc)
    elif isinstance(o, list):
        for v in o:
            walk(v, ctxkey, acc)

acc = {'tok': 0, 'cost': 0.0}
for o in objs:
    walk(o, "", acc)

t = "" if acc['tok'] <= 0 else str(int(acc['tok']))
k = "" if acc['cost'] <= 0 else ("%.4f" % acc['cost'])
print("%s\t%s" % (t, k))
PY
}

# 실패 서브분류(outcome==failure 일 때만 의미 있음). infra|logic|"" 출력.
#   infra = 환경/툴링(disk/oom/network/바이너리 누락/timeout-kill) · logic = assertion/test/compile.
# 로그 패턴 기반·부작용 없음(게이트 재실행 안 함) → 실패 경로는 보수적으로 유지.
classify_failclass() {
  python3 - "$1" <<'PY'
import sys
try:
    with open(sys.argv[1], "r", errors="replace") as f:
        low = f.read().lower()
except OSError:
    low = ""
infra = ["enospc", "no space left", "out of memory", "oom-kill", "killed",
         "command not found", "permission denied", "network", "etimedout",
         "connection refused", "could not resolve host", "timed out"]
if any(m in low for m in infra):
    print("infra"); sys.exit(0)
logic = ["assertionerror", "assert", "traceback", "test failed", "failed test",
         "compilation error", "type error", "typeerror", "syntaxerror",
         "expected", " failing"]
if any(m in low for m in logic):
    print("logic"); sys.exit(0)
print("")
PY
}

log "=== overnight 루프 시작 (engine=$ENGINE, branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null), gate='$GATE_CMD', MAX_ITER=$MAX_ITER, once=$ONCE) ==="

# WS5 다이제스트용 런 마커 (종료 시 이 지점 기준으로 커밋/회차 원장을 요약한다)
RUN_START_EPOCH="$(date +%s)"
RUN_START_STAMP="$(date '+%Y%m%d-%H%M%S')"
RUN_START_ISO="$(date '+%Y-%m-%dT%H:%M:%S')"
RUN_START_HEAD="$(git rev-parse HEAD 2>/dev/null || echo none)"

iter=0
consec_fail=0
no_progress=0
exit_reason="unknown"

while :; do
  if [ -f "$STOP_FILE" ]; then
    exit_reason="STOP ($(cat "$STOP_FILE" 2>/dev/null | head -1))"; log "STOP 감지 — graceful 종료"; break
  fi
  if [ -f "$DONE_FILE" ]; then
    done_reason="DONE ($(cat "$DONE_FILE" 2>/dev/null | head -1))"
    # WS-D: 코드 백로그 소진 시점에 체크리스트 기반 드레인 QA 1회(HEAD+체크리스트해시 dedup).
    # DONE 파일은 절대 건드리지 않는다. PASS/SKIP=원래 DONE 사유로 종료, FAIL/NEEDS=QA 사유+알림.
    if [ "$OVERNIGHT_BROWSER_QA" != "0" ]; then
      log "DONE 감지 — 종료 전 드레인 브라우저 QA 1회 (A/F bounded)"
      qa_rc=0
      maybe_drain_browser_qa "$(git rev-parse HEAD 2>/dev/null || echo none)" || qa_rc=$?
      if [ "$qa_rc" = "3" ]; then
        notify_failure "drain browser-qa ${QA_LAST_OUTCOME:-?}"
        exit_reason="$done_reason + browser-qa ${QA_LAST_OUTCOME:-?}"
        log "DONE 드레인 QA 정지 — ${QA_LAST_OUTCOME:-?} (DONE 유지, 증거: outputs/live-qa, 검수 필요)"; break
      fi
    fi
    exit_reason="$done_reason"; log "DONE — 종료"; break
  fi
  if [ "$iter" -ge "$MAX_ITER" ]; then
    exit_reason="MAX_ITER ($MAX_ITER)"; log "MAX_ITER 도달 — 종료"; break
  fi

  iter=$((iter + 1))
  prune_logs || true

  # A2A Relay 2: 직전 에스컬레이션 회차 종료 → 원래 엔진/프롬프트 복원.
  # 루프 상단에서 복원해야 limit/failure 의 continue 경로에서도 누락되지 않는다.
  if [ "${ESCALATE_ACTIVE:-0}" = "1" ]; then
    ENGINE="$SAVED_ENGINE"; PROMPT_CONTENT="$SAVED_PROMPT"; ESCALATE_ACTIVE=0
    log "escalate: 회차 종료 — 엔진 복원($ENGINE)"
  fi
  # A2A Relay 2: 예약된 에스컬레이션 — 이번 1회차만 claude 가 직전 Blocker 항목을 크로스레인 처리.
  if [ "${ESCALATE_NEXT:-0}" = "1" ]; then
    ESCALATE_NEXT=0; ESCALATE_ACTIVE=1
    ESCALATE_COUNT=$(( ${ESCALATE_COUNT:-0} + 1 ))
    SAVED_ENGINE="$ENGINE"; SAVED_PROMPT="$PROMPT_CONTENT"
    ENGINE="claude"
    PROMPT_CONTENT="$(cat scripts/overnight/PROMPT.md)

[러너 알림] ESCALATION 모드($ESCALATE_COUNT/$MAX_ESCALATE): 직전 $SAVED_ENGINE 회차가 Blocker 를 기록했다.
이번 회차는 NEXT_PLAN/PROGRESS_LOG 의 가장 최근 Blocker 항목 1개만 처리하라 — 이 1회차에 한해 그
항목의 레인 태그를 무시하고 소비해도 된다([blocked] 이면 해결 후 태그를 제거). 완전 해결이 불가하면
원인 진단을 Blocker 에 보강 기록하고 정리 후 끝내라. 다른 백로그 항목은 시작하지 말 것."
    log "escalate: 이번 회차 claude 크로스레인 수행 (직전 $SAVED_ENGINE Blocker, $ESCALATE_COUNT/$MAX_ESCALATE)"
  fi

  HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo none)"
  ITER_LOG="$LOG_DIR/iter-$iter.log"
  ITER_START="$(date +%s)"
  log "회차 $iter 시작 (HEAD=${HEAD_BEFORE:0:9})"
  emit_status "running" "$HEAD_BEFORE" ""

  set +e
  case "$ENGINE" in
    codex)
      # 무인 안전 경계: 전역 config(danger-full-access)를 CLI 로 덮어쓴다 —
      # workspace-write + network 차단(=git push·curl·Ollama·FLUX·Docker-online 봉쇄) + 비대화(never).
      # </dev/null 필수: codex exec 는 stdin 이 열려 있으면 추가 입력을 기다리며 멈춘다(무인 회차 freeze 방지).
      # writable_roots 에 .git 포함 필수: workspace-write 는 .git 쓰기를 막아 git commit(.git/index.lock)이
      # 실패한다 — 회차당 커밋이 LOOP 의 핵심이라 .git 을 명시적으로 쓰기 허용한다(네트워크는 여전히 차단).
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} codex exec \
        --cd "$REPO_ROOT" \
        --sandbox workspace-write \
        -c sandbox_workspace_write.network_access=false \
        -c "sandbox_workspace_write.writable_roots=[\"$GIT_COMMON_DIR\"]" \
        -c approval_policy=never \
        --json \
        --output-last-message "$LOG_DIR/last-message.txt" \
        "$PROMPT_CONTENT" > "$ITER_LOG" 2>&1 </dev/null
      ;;
    agy)
      # agy(Antigravity)는 이미지 생성을 위해 호스트 접근(FLUX/MPS/네트워크)이 필요해 샌드박스 없이 돈다.
      # 따라서 경계는 PROMPT.agy.md 가드레일 + worktree/브랜치 격리(loop/agy 리뷰 브랜치)에 의존한다.
      # </dev/null: print 모드 stdin freeze 방지. --print-timeout 기본 5m 은 한 회차엔 짧아 30m 로.
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} agy --print "$PROMPT_CONTENT" \
        --dangerously-skip-permissions \
        --print-timeout 30m \
        --add-dir "$REPO_ROOT" > "$ITER_LOG" 2>&1 </dev/null
      ;;
    kiro)
      # kiro-cli chat --no-interactive --trust-all-tools = 헤드리스 무인 실행.
      # --agent 로 .kiro/agents/ 에서 overnight-harness 프로필 로드.
      : "${KIRO_AGENT:=overnight-harness}"
      : "${KIRO_EFFORT:=high}"
      KIRO_FLAGS="--no-interactive --trust-all-tools --effort $KIRO_EFFORT"
      [ -n "${KIRO_MODEL:-}" ] && KIRO_FLAGS="$KIRO_FLAGS --model $KIRO_MODEL"
      [ -n "$KIRO_AGENT" ] && KIRO_FLAGS="$KIRO_FLAGS --agent $KIRO_AGENT"
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} kiro-cli chat \
        $KIRO_FLAGS \
        "$PROMPT_CONTENT" > "$ITER_LOG" 2>&1
      ;;
    *)
      # WS-β: OVERNIGHT_GOAL=1 이면 /goal 디렉티브를 프롬프트 앞에 주입(claude 레인 전용).
      CLAUDE_PROMPT="$PROMPT_CONTENT"
      if [ "$OVERNIGHT_GOAL" = "1" ]; then
        CLAUDE_PROMPT="$GOAL_DIRECTIVE

$PROMPT_CONTENT"
        log "  (/goal 주입: green+커밋까지 수렴, 최대 ${GOAL_MAX_TURNS}턴)"
      fi
      $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} claude -p "$CLAUDE_PROMPT" \
        --permission-mode acceptEdits \
        --settings "$SETTINGS_FILE" \
        --output-format json > "$ITER_LOG" 2>&1
      ;;
  esac
  rc=$?
  set -e

  outcome="$(classify_outcome "$rc" "$ITER_LOG" || echo failure)"
  ITER_DUR=$(( $(date +%s) - ITER_START ))
  HEAD_NOW="$(git rev-parse HEAD 2>/dev/null || echo none)"
  # 텔레메트리(best-effort, 루프를 죽이지 않음) + 실패 서브클래스(failure 회차만).
  ITER_USAGE="$(parse_usage "$ITER_LOG" 2>/dev/null || printf '\t')"
  ITER_TOKENS="$(printf '%s' "$ITER_USAGE" | cut -f1)"
  ITER_COST="$(printf '%s' "$ITER_USAGE" | cut -f2)"
  FAIL_CLASS=""
  [ "$outcome" = "failure" ] && FAIL_CLASS="$(classify_failclass "$ITER_LOG" 2>/dev/null || echo '')"
  log "회차 $iter 결과: $outcome (rc=$rc)${FAIL_CLASS:+ [$FAIL_CLASS]}${ITER_TOKENS:+ tok=$ITER_TOKENS}${ITER_COST:+ \$$ITER_COST}"
  emit_status "$outcome" "$HEAD_NOW" "$ITER_DUR" "" "" "" "$ITER_TOKENS" "$ITER_COST" "$FAIL_CLASS"
  cap_iter_log "$ITER_LOG"   # WS5: 분류·사용량 파싱이 끝난 뒤에만 캡(결과 JSON 은 tail 에 보존됨)

  case "$outcome" in
    limit)
      consec_fail=0
      # claude 한도 소진 → codex 로 failover(이후 회차 codex 가 claude 레인을 대신 소비). 1회만.
      if [ "$ENGINE" = "claude" ] && [ "${FAILOVER_DONE:-0}" = "0" ] && command -v codex >/dev/null 2>&1; then
        log "claude 한도 감지 — codex 로 failover(이후 codex 가 claude 레인 소비)"
        ENGINE="codex"
        PROMPT_FILE="scripts/overnight/PROMPT.codex.md"
        PROMPT_CONTENT="$(cat "$PROMPT_FILE")

[러너 알림] FAILOVER 모드: claude 토큰 한도 소진으로 codex 가 대신 수행한다.
이번 회차부터 codex 레인(\`[auto:codex]\`)이 없으면 claude 레인(\`[auto]\`/\`[auto:claude]\`)도 소비하라."
        FAILOVER_DONE=1
        continue   # 대기 없이 즉시 codex 로 재시도
      fi
      log "한도 감지 — ${LIMIT_WAIT}s 대기 후 재시도"
      sleep "$LIMIT_WAIT"
      continue
      ;;
    failure)
      consec_fail=$((consec_fail + 1))
      log "실패 누적 $consec_fail/$MAX_CONSEC_FAIL"
      if [ "$consec_fail" -ge "$MAX_CONSEC_FAIL" ]; then
        exit_reason="연속 실패 $MAX_CONSEC_FAIL회"; log "연속 실패 한계 — 안전 중단"; break
      fi
      ;;
    success)
      consec_fail=0
      HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null || echo none)"
      if [ "$HEAD_AFTER" != "$HEAD_BEFORE" ]; then
        no_progress=0
        commit_live=1   # 아래에서 커밋이 revert(phantom/critic-reject)되면 0 으로 해제
        log "새 커밋: $(git log --oneline "$HEAD_BEFORE..$HEAD_AFTER" 2>/dev/null | tr '\n' ' ')"
        # WS-α: in-invocation 게이트는 신뢰 약함(is_error:false ≠ 게이트 green). 새 커밋을 외부에서 재검증한다.
        if [ "$OVERNIGHT_VERIFY_GATE" = "1" ]; then
          log "외부 게이트 재실행: $GATE_CMD @ ${HEAD_AFTER:0:9}"
          set +e
          $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} bash -c "$GATE_CMD" > "$LOG_DIR/gate-$iter.log" 2>&1
          gate_exit=$?
          set -e
          if [ "$gate_exit" -ne 0 ]; then
            commit_live=0
            log "⚠ PHANTOM-SUCCESS: 커밋 ${HEAD_AFTER:0:9} 외부 게이트 RED(exit=$gate_exit) — revert + 알림 (로그: $LOG_DIR/gate-$iter.log)"
            emit_status "phantom" "$HEAD_AFTER" "$ITER_DUR" "$gate_exit" "0"
            if git revert --no-edit HEAD >> "$RUNNER_LOG" 2>&1; then
              log "phantom 커밋 revert 완료 — 브랜치 green 복구"
            else
              git revert --abort >/dev/null 2>&1 || true
              git reset --hard "$HEAD_BEFORE" >> "$RUNNER_LOG" 2>&1 || true
              log "revert 충돌 → HEAD_BEFORE 로 reset"
            fi
            notify_failure "phantom-success @ ${HEAD_AFTER:0:9} (gate exit=$gate_exit)"
            consec_fail=$((consec_fail + 1))
            if [ "$consec_fail" -ge "$MAX_CONSEC_FAIL" ]; then
              exit_reason="phantom-success 누적 $MAX_CONSEC_FAIL회"; log "phantom 한계 — 안전 중단"; break
            fi
          else
            log "외부 게이트 GREEN — 커밋 검증됨"
            emit_status "verified" "$HEAD_AFTER" "$ITER_DUR" "0" "1"
          fi
        fi
        # WS-β: opt-in critic 패스. 재게이트를 통과한(commit_live=1) 커밋에만 실행.
        # 오프라인 게이트가 못 잡는 회귀/스코프크립을 잡고, FAIL 이면 phantom 과 동일하게 revert.
        # 모드: 1=항상 · auto=diff 가 위험 휴리스틱을 건드릴 때만 · 0=안 함.
        if [ "$OVERNIGHT_CRITIC" != "0" ] && [ "${commit_live:-0}" = "1" ]; then
          critic_run=1
          if [ "$OVERNIGHT_CRITIC" = "auto" ]; then
            risk="$(critic_risk_reason "$HEAD_BEFORE..$HEAD_AFTER")"
            if [ -z "$risk" ]; then
              critic_run=0
              log "critic: auto-skip — 저위험 diff (test/scope/sensitive 신호 없음)"
            else
              log "critic: auto-run — 위험: $risk"
            fi
          fi
          if [ "$critic_run" = "1" ]; then
            log "critic: ${HEAD_BEFORE:0:9}..${HEAD_AFTER:0:9} 읽기 전용 리뷰 (engine=$ENGINE${OVERNIGHT_CRITIC_MODEL:+, model=$OVERNIGHT_CRITIC_MODEL})"
            critic="$(critic_verdict "$HEAD_BEFORE..$HEAD_AFTER")"
            if [ "$critic" = "FAIL" ]; then
              commit_live=0
              log "⚠ CRITIC-REJECT: 커밋 ${HEAD_AFTER:0:9} 플래그됨(회귀/스코프) — revert + 알림 (로그: $LOG_DIR/critic-$iter.log)"
              emit_status "critic-reject" "$HEAD_AFTER" "$ITER_DUR" "" "" "1"
              if git revert --no-edit HEAD >> "$RUNNER_LOG" 2>&1; then
                log "critic-reject 커밋 revert 완료 — 브랜치 복구"
              else
                git revert --abort >/dev/null 2>&1 || true
                git reset --hard "$HEAD_BEFORE" >> "$RUNNER_LOG" 2>&1 || true
                log "revert 충돌 → HEAD_BEFORE 로 reset"
              fi
              notify_failure "critic-reject @ ${HEAD_AFTER:0:9}"
              consec_fail=$((consec_fail + 1))
              if [ "$consec_fail" -ge "$MAX_CONSEC_FAIL" ]; then
                exit_reason="critic-reject 누적 $MAX_CONSEC_FAIL회"; log "critic 한계 — 안전 중단"; break
              fi
            elif [ "$critic" = "SKIP" ]; then
              log "critic: 건너뜀 (엔진 '$ENGINE' 읽기 전용 모드 없음)"
            else
              log "critic: PASS — 커밋 유지"
              emit_status "critic-pass" "$HEAD_AFTER" "$ITER_DUR" "" "" "0"
            fi
          fi
        fi
        # A2A Relay 1: 이미지 정체성 판정 — 게이트+critic 통과 커밋이 캐릭터/적 아트를 바꾸면
        # claude 시각 판정자가 정본과 대조. 무결성 게이트(존재/치수)가 못 보는 "다른 인물" 오류를
        # 커밋이 밤새 살아남기 전에 잡는다. FAIL 이면 critic-reject 와 동일하게 revert.
        if [ "$OVERNIGHT_IMAGE_JUDGE" != "0" ] && [ "${commit_live:-0}" = "1" ]; then
          ij_targets="$(image_judge_targets "$HEAD_BEFORE..$HEAD_AFTER")"
          if [ -n "$ij_targets" ]; then
            log "image-judge: 캐릭터 아트 변경 감지($(printf '%s\n' "$ij_targets" | grep -c . )건) — 정체성 판정 (engine=claude)"
            ij="$(image_judge_verdict "$HEAD_BEFORE..$HEAD_AFTER")"
            if [ "$ij" = "FAIL" ]; then
              commit_live=0
              log "⚠ IMAGE-JUDGE-REJECT: 커밋 ${HEAD_AFTER:0:9} 정체성 불일치 — revert + 알림 (로그: $LOG_DIR/image-judge-$iter.log)"
              emit_status "image-judge-reject" "$HEAD_AFTER" "$ITER_DUR"
              if git revert --no-edit HEAD >> "$RUNNER_LOG" 2>&1; then
                log "image-judge-reject 커밋 revert 완료 — 브랜치 복구"
              else
                git revert --abort >/dev/null 2>&1 || true
                git reset --hard "$HEAD_BEFORE" >> "$RUNNER_LOG" 2>&1 || true
                log "revert 충돌 → HEAD_BEFORE 로 reset"
              fi
              notify_failure "image-judge-reject @ ${HEAD_AFTER:0:9}"
              consec_fail=$((consec_fail + 1))
              if [ "$consec_fail" -ge "$MAX_CONSEC_FAIL" ]; then
                exit_reason="image-judge-reject 누적 $MAX_CONSEC_FAIL회"; log "image-judge 한계 — 안전 중단"; break
              fi
            elif [ "$ij" = "SKIP" ]; then
              log "image-judge: 건너뜀 (claude CLI/설정 부재 또는 대조 가능한 정본 없음)"
            else
              log "image-judge: PASS — 커밋 유지"
              emit_status "image-judge-pass" "$HEAD_AFTER" "$ITER_DUR"
            fi
          fi
        fi
        # WS-C: 자동 브라우저 QA — 게이트+critic 통과(commit_live=1) 커밋에만. 후보 필터가 UI/런타임/
        # 시나리오 변경으로 판정하면 AGY 가 브라우저 QA. revert 절대 안 함(주관적 QA로 커밋 폐기 금지).
        # 무진행/연속실패 카운터엔 영향 없음 — 성공 회차의 서브페이즈일 뿐.
        if [ "$OVERNIGHT_BROWSER_QA" != "0" ] && [ "${commit_live:-0}" = "1" ]; then
          qa_rc=0
          maybe_browser_qa "post-commit" "$HEAD_BEFORE..$HEAD_AFTER" "$HEAD_AFTER" || qa_rc=$?
          if [ "$qa_rc" = "3" ]; then
            printf 'browser-qa %s @ %s\n' "${QA_LAST_OUTCOME:-?}" "${HEAD_AFTER:0:9}" > "$STOP_FILE"
            notify_failure "browser-qa ${QA_LAST_OUTCOME:-?} @ ${HEAD_AFTER:0:9}"
            exit_reason="browser-qa ${QA_LAST_OUTCOME:-?} @ ${HEAD_AFTER:0:9}"
            log "browser-qa 정지 — ${QA_LAST_OUTCOME:-?} (커밋 유지, 증거: outputs/live-qa, 검수 필요)"; break
          fi
        fi
        # A2A Relay 2: codex/agy 회차가 방금 커밋에서 Blocker/[blocked] 를 기록했으면 다음 1회차를
        # claude 크로스레인으로 예약(아침 human review 대기 없이 당일 재시도). 에스컬레이션 회차
        # 자신은 예약하지 않는다(ESCALATE_ACTIVE 중엔 ENGINE=claude 라 조건이 걸러짐).
        if [ "$OVERNIGHT_ESCALATE" != "0" ] && [ "$ENGINE" != "claude" ] && [ "$ONCE" -eq 0 ] \
           && [ "${commit_live:-0}" = "1" ] && [ "${ESCALATE_COUNT:-0}" -lt "$MAX_ESCALATE" ] \
           && command -v claude >/dev/null 2>&1 && [ -f "$SETTINGS_FILE" ] \
           && git diff "$HEAD_BEFORE..$HEAD_AFTER" -- docs/NEXT_PLAN.md docs/PROGRESS_LOG.md 2>/dev/null \
              | grep '^+' | grep -qiE 'blocker|\[blocked\]'; then
          ESCALATE_NEXT=1
          log "escalate: $ENGINE 회차가 Blocker 기록 — 다음 회차 claude 에스컬레이션 예약"
        fi
      else
        no_progress=$((no_progress + 1))
        log "무진행 $no_progress/$MAX_NO_PROGRESS (새 커밋 없음)"
        if [ "$no_progress" -ge "$MAX_NO_PROGRESS" ]; then
          exit_reason="무진행 $MAX_NO_PROGRESS회"; log "무진행 한계 — 안전 중단"; break
        fi
      fi
      ;;
  esac

  if [ "$ONCE" -eq 1 ]; then
    exit_reason="--once 1회 완료"; log "--once — 1회차 후 종료"; break
  fi

  sleep "$PAUSE"
done

log "=== overnight 루프 종료: $exit_reason (총 $iter 회차) ==="
emit_status "exit:$exit_reason" "$(git rev-parse HEAD 2>/dev/null || echo none)" ""

# WS5 자동 셧다운 다이제스트: 종료 사유와 무관하게 그 자리에서 요약 md 를 남기고(기본) 메일로도
# 보낸다. 아침 /overnight-report(검수·재게이트)의 대체가 아니라 즉시 스냅샷 — 원장(status.tsv)과
# 커밋 범위를 사람이 아침에 바로 훑을 수 있는 형태로 접어 둔다. 실패 알림(notify_failure)과 별개.
write_shutdown_digest() {
  local digest="$LOG_DIR/digest-$RUN_START_STAMP.md"
  local head_now dur_min commits tally open_auto open_blocked findings
  head_now="$(git rev-parse HEAD 2>/dev/null || echo none)"
  dur_min=$(( ( $(date +%s) - RUN_START_EPOCH ) / 60 ))
  commits="$(git log --oneline "$RUN_START_HEAD..$head_now" 2>/dev/null)"
  [ -n "$commits" ] || commits="(no new commits)"
  # 이 런의 회차 원장 요약(outcome 별 카운트). ts 는 ISO 라 문자열 비교로 시간 필터가 성립한다.
  tally="$(awk -F'\t' -v s="$RUN_START_ISO" \
    'NR > 1 && $1 >= s && $5 != "running" { c[$5]++ } END { for (k in c) printf "- %s: %d\n", k, c[k] }' \
    "$STATUS_TSV" 2>/dev/null)"
  [ -n "$tally" ] || tally="(no ledger rows)"
  open_auto="$(grep '\[ \]' docs/NEXT_PLAN.md 2>/dev/null | grep -c '\[auto' || true)"
  open_blocked="$(grep -c '\[blocked\]' docs/NEXT_PLAN.md 2>/dev/null || true)"
  findings="none"
  [ -s "$LOG_DIR/qa-findings.md" ] && findings="$LOG_DIR/qa-findings.md (triage via /overnight-report)"
  cat > "$digest" <<EOF
# Overnight shutdown digest — $RUN_START_STAMP

- Exit: $exit_reason (after $iter iteration(s), ${dur_min}m)
- Engine (final): $ENGINE · branch $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
- HEAD: ${RUN_START_HEAD:0:9} → ${head_now:0:9}

## Iteration outcomes (this run)
$tally

## Commits since run start
$commits

## Backlog after run
- open [auto*] items: $open_auto · [blocked] tags: $open_blocked
- QA findings: $findings

Logs: $RUNNER_LOG · $STATUS_TSV · iter logs $LOG_DIR/iter-*.log (capped ${ITER_LOG_MAX_KB}KB)
Morning review: /overnight-report (independent re-gate + checklist) remains the authority.
EOF
  log "셧다운 다이제스트: $digest"
  if [ "$ONCE" -eq 0 ]; then
    bash scripts/overnight/notify.sh "[MythOS overnight] digest — $exit_reason ($iter iter)" \
      "$(cat "$digest")" >> "$RUNNER_LOG" 2>&1 || true
  fi
}
if [ "$OVERNIGHT_DIGEST" != "0" ]; then
  write_shutdown_digest || log "경고: 다이제스트 작성 실패(루프 종료엔 영향 없음)"
fi

# 실패 클래스에서만 메일(연속 실패 / 전부 blocked). drained·무진행·MAX_ITER·수동 STOP·--once 는 정상 → 안 보냄.
case "$exit_reason" in
  *"연속 실패"*|*"all-blocked"*) notify_failure "$exit_reason" ;;
esac
