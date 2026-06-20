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

# --- 엔진 선택 (claude | codex | agy) — 동일 LOOP, 호출 에이전트만 다름 ---
: "${ENGINE:=claude}"

# git 객체 저장소(common dir). worktree 에선 .git 이 파일이고 실제 저장소는 메인의 .git 이다 —
# codex 샌드박스가 commit(.git/objects/refs) 하려면 이 경로가 writable_roots 에 있어야 한다.
GIT_COMMON_DIR="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || echo "$REPO_ROOT/.git")"

# --- 경로 (REPO_ROOT 기준 상대 — overnight-settings.json allow 패턴과 일치) ---
case "$ENGINE" in
  codex) PROMPT_FILE="scripts/overnight/PROMPT.codex.md" ;;
  agy)   PROMPT_FILE="scripts/overnight/PROMPT.agy.md" ;;
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

ONCE=0
[ "${1:-}" = "--once" ] && ONCE=1

mkdir -p "$LOG_DIR"

log() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$RUNNER_LOG"
}

# 머신리더블 회차 원장(탭 구분, status.sh/대시보드가 소비). human runner.log 와 병행.
# 컬럼: ts  engine  branch  iter  outcome  head  dur(s)  gate_exit  commit_verified
#   gate_exit/commit_verified 는 WS-α 외부 재게이트 결과(빈칸=미측정 회차). status.sh 는 f5/6/7 만 읽어 하위호환.
emit_status() {
  local outcome="$1" head="${2:-}" dur="${3:-}" gate="${4:-}" verified="${5:-}" branch
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  [ -f "$STATUS_TSV" ] || printf 'ts\tengine\tbranch\titer\toutcome\thead\tdur\tgate_exit\tcommit_verified\n' > "$STATUS_TSV"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S')" "$ENGINE" "$branch" "$iter" "$outcome" "${head:0:9}" "$dur" "$gate" "$verified" >> "$STATUS_TSV"
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
  claude)
    command -v claude >/dev/null 2>&1 || { log "치명: 'claude' CLI 를 PATH 에서 못 찾음 — 종료"; exit 1; }
    [ -f "$SETTINGS_FILE" ] || { log "치명: $SETTINGS_FILE 없음 — 종료"; exit 1; } ;;
  *) log "치명: 알 수 없는 ENGINE='$ENGINE' (claude|codex|agy) — 종료"; exit 1 ;;
esac
[ -f "$PROMPT_FILE" ]   || { log "치명: $PROMPT_FILE 없음 — 종료"; exit 1; }
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

log "=== overnight 루프 시작 (engine=$ENGINE, branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null), gate='$GATE_CMD', MAX_ITER=$MAX_ITER, once=$ONCE) ==="

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
  log "회차 $iter 결과: $outcome (rc=$rc)"
  emit_status "$outcome" "$HEAD_NOW" "$ITER_DUR"

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
        log "새 커밋: $(git log --oneline "$HEAD_BEFORE..$HEAD_AFTER" 2>/dev/null | tr '\n' ' ')"
        # WS-α: in-invocation 게이트는 신뢰 약함(is_error:false ≠ 게이트 green). 새 커밋을 외부에서 재검증한다.
        if [ "$OVERNIGHT_VERIFY_GATE" = "1" ]; then
          log "외부 게이트 재실행: $GATE_CMD @ ${HEAD_AFTER:0:9}"
          set +e
          $TIMEOUT_BIN ${TIMEOUT_BIN:+$ITER_TIMEOUT} bash -c "$GATE_CMD" > "$LOG_DIR/gate-$iter.log" 2>&1
          gate_exit=$?
          set -e
          if [ "$gate_exit" -ne 0 ]; then
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

# 실패 클래스에서만 메일(연속 실패 / 전부 blocked). drained·무진행·MAX_ITER·수동 STOP·--once 는 정상 → 안 보냄.
case "$exit_reason" in
  *"연속 실패"*|*"all-blocked"*) notify_failure "$exit_reason" ;;
esac
