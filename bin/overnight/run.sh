#!/usr/bin/env bash
#
# run.sh — Project MythOS 무인 overnight 루프 러너
# ----------------------------------------------------------------------------
# 헤드리스 Claude Code 를 회차 단위로 반복 호출한다. 매 회차는 작은 컨텍스트로
# 상태를 복원(/sync)하고 → NEXT_PLAN 의 [auto] 작업 1개를 구현·게이트 통과시키고
# → 기록(/checkpoint)하고 → 로컬 커밋한다. 회차마다 커밋되므로 언제 멈춰도 손실은
# 최대 1회차다. 설계 설명: docs/LOOP_ENGINEERING.md
#
# 사용:
#   caffeinate -dimsu bin/overnight/run.sh &     # Mac 절전 방지 + 백그라운드
#   bin/overnight/run.sh --once                  # 1회차만 (검증용)
#   touch bin/overnight/STOP                      # graceful 중단 (현재 회차 마치고 종료)
#   tail -f bin/overnight/logs/runner.log         # 관찰
#   # 아침에: claude 세션에서 /overnight-report
#
# 종료 조건: DONE(백로그 소진/전부 blocked) · STOP(수동) · MAX_ITER 도달 ·
#            연속 실패 MAX_CONSEC_FAIL 회 · 무진행 MAX_NO_PROGRESS 회.
#
# 안전: claude 회차는 bin/overnight/overnight-settings.json 권한 경계로만 실행된다
#       (git push·네트워크·파괴 make·Web/MCP deny). interactive 설정은 건드리지 않는다.
# ----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# --- 경로 (REPO_ROOT 기준 상대 — overnight-settings.json allow 패턴과 일치) ---
PROMPT_FILE="bin/overnight/PROMPT.md"
SETTINGS_FILE="bin/overnight/overnight-settings.json"
STOP_FILE="bin/overnight/STOP"
DONE_FILE="bin/overnight/DONE"
LOG_DIR="bin/overnight/logs"
RUNNER_LOG="$LOG_DIR/runner.log"

# --- 튜닝 가능한 환경변수 (MythOS 기본값) ---
: "${MAX_ITER:=20}"             # 총 회차 상한 (폭주 방지 백스톱; 얇은 백로그엔 20이면 충분)
: "${ITER_TIMEOUT:=1800}"       # 회차당 최대 실행 초 (make check ~30-60s, 여유 30분)
: "${LIMIT_WAIT:=1800}"         # usage/session limit 감지 시 대기 초
: "${PAUSE:=30}"                # 회차 간 간격 초
: "${MAX_CONSEC_FAIL:=3}"       # 연속 실패 N회 시 안전 중단
: "${MAX_NO_PROGRESS:=2}"       # success인데 새 커밋 없음 연속 N회 시 안전 중단 (얇은 백로그의 주 종료 사유)
: "${KEEP_ITER_LOGS:=30}"       # iter-*.log 최근 N개만 보존 (runner.log 는 항상 보존)
: "${GATE_CMD:=make check-auto}" # 커밋 게이트(green 검증). check-auto = lint+frontend-build+smoke-local
                                 # (mypy 제외 — 선행 부채). mypy 부채 정리 후 GATE_CMD="make check"로 승격.
export GATE_CMD                 # PROMPT.md 가 $GATE_CMD 로 참조

ONCE=0
[ "${1:-}" = "--once" ] && ONCE=1

mkdir -p "$LOG_DIR"

log() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$RUNNER_LOG"
}

# --- timeout 바이너리 탐지 (macOS 는 coreutils 의 gtimeout) ---
TIMEOUT_BIN=""
if command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_BIN="gtimeout"
elif command -v timeout >/dev/null 2>&1; then
  TIMEOUT_BIN="timeout"
fi

# --- 사전 점검 ---
command -v claude >/dev/null 2>&1 || { log "치명: 'claude' CLI 를 PATH 에서 못 찾음 — 종료"; exit 1; }
[ -f "$PROMPT_FILE" ]   || { log "치명: $PROMPT_FILE 없음 — 종료"; exit 1; }
[ -f "$SETTINGS_FILE" ] || { log "치명: $SETTINGS_FILE 없음 — 종료"; exit 1; }
[ -n "$TIMEOUT_BIN" ] || log "경고: gtimeout/timeout 없음 — 회차 타임아웃 비활성 (brew install coreutils 권장)"

PROMPT_CONTENT="$(cat "$PROMPT_FILE")"

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
# 1) --output-format json 의 객체 is_error==false → success (성공 회차 텍스트의 "rate limit" 언급 무시)
# 2) 성공이 아닐 때만 limit 텍스트 검사 → limit
# 3) 그 외 rc≠0 → failure, 아니면 success
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
# claude -p --output-format json 은 단일 JSON 객체를 낸다; 스트림 대비 줄단위도 시도.
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
            if isinstance(cand, dict):
                obj = cand
        except Exception:
            pass

if isinstance(obj, dict) and obj.get("is_error") is False:
    print("success"); sys.exit(0)

low = text.lower()
markers = ["usage limit", "session limit", "rate limit", "overloaded",
           "hit your", "too many requests", "quota"]
if any(m in low for m in markers):
    print("limit"); sys.exit(0)

print("failure" if rc != 0 else "success")
PY
}

log "=== overnight 루프 시작 (branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null), gate='$GATE_CMD', MAX_ITER=$MAX_ITER, once=$ONCE) ==="

iter=0
consec_fail=0
no_progress=0
exit_reason="unknown"

while :; do
  if [ -f "$STOP_FILE" ]; then
    exit_reason="STOP ($(cat "$STOP_FILE" 2>/dev/null | head -1))"; log "STOP 감지 — graceful 종료"; break
  fi
  if [ -f "$DONE_FILE" ]; then
    exit_reason="DONE ($(cat "$DONE_FILE" 2>/dev/null | head -1))"; log "DONE 감지 — 종료"; break
  fi
  if [ "$iter" -ge "$MAX_ITER" ]; then
    exit_reason="MAX_ITER ($MAX_ITER)"; log "MAX_ITER 도달 — 종료"; break
  fi

  iter=$((iter + 1))
  prune_logs || true

  HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo none)"
  ITER_LOG="$LOG_DIR/iter-$iter.log"
  log "회차 $iter 시작 (HEAD=${HEAD_BEFORE:0:9})"

  set +e
  $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} claude -p "$PROMPT_CONTENT" \
    --permission-mode acceptEdits \
    --settings "$SETTINGS_FILE" \
    --output-format json > "$ITER_LOG" 2>&1
  rc=$?
  set -e

  outcome="$(classify_outcome "$rc" "$ITER_LOG" || echo failure)"
  log "회차 $iter 결과: $outcome (rc=$rc)"

  case "$outcome" in
    limit)
      consec_fail=0
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
        log "새 커밋: $(git log --oneline "$HEAD_BEFORE..$HEAD_AFTER" 2>/dev/null | tr '\n' ' ')"
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
