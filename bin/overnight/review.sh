#!/usr/bin/env bash
#
# review.sh [RANGE] — codex 를 Principal Reviewer 로 돌려 diff 를 읽기 전용 감사한다.
# ----------------------------------------------------------------------------
# 생성자(claude/agy)≠리뷰어(codex) 분리(AI_REARCH). codex 가 통합 diff 를 리뷰해
# 마크다운 1개(bin/overnight/logs/review-latest.md)만 쓰고, 제안 후속작업을 적는다.
# 코드/NEXT_PLAN 은 건드리지 않는다(오케스트레이터/사람이 반영).
#
# 사용: bin/overnight/review.sh [RANGE]   (RANGE 기본 main...loop/integration)
# ----------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

command -v codex >/dev/null 2>&1 || { echo "치명: 'codex' CLI 없음"; exit 1; }

RANGE="${1:-main...loop/integration}"
LOG_DIR="bin/overnight/logs"
OUT="$LOG_DIR/review-latest.md"
mkdir -p "$LOG_DIR"

# 범위 유효성(없으면 working tree diff 로 폴백)
if ! git rev-parse "${RANGE%%...*}" >/dev/null 2>&1; then
  echo "경고: 범위 '$RANGE' 해석 불가 — 'git diff HEAD' 로 폴백"
  RANGE="HEAD"
fi

PROMPT="$(cat bin/overnight/PROMPT.review.md)

[리뷰 대상] git diff 범위: $RANGE
[출력] 리뷰 마크다운을 정확히 이 경로에 써라: $OUT
[유의] 날짜/시각이 필요하면 'git log -1 --format=%cd $RANGE' 등에서 얻는다(임의 추정 금지)."

echo "=== codex 리뷰 시작 (범위=$RANGE) → $OUT ==="
# 읽기 전용 감사: workspace-write 지만 PROMPT.review.md §0 이 '리뷰 파일만 쓰기'를 강제.
# .git 쓰기 불요(커밋 안 함). 네트워크 차단.
codex exec \
  --cd "$REPO_ROOT" \
  --sandbox workspace-write \
  -c sandbox_workspace_write.network_access=false \
  -c approval_policy=never \
  --json \
  --output-last-message "$LOG_DIR/review-summary.txt" \
  "$PROMPT" > "$LOG_DIR/review-run.log" 2>&1 </dev/null
rc=$?

if [ -f "$OUT" ]; then
  echo "리뷰 완료(rc=$rc) → $OUT"
  echo "--- 요약 ---"; cat "$LOG_DIR/review-summary.txt" 2>/dev/null | head -20
else
  echo "경고: $OUT 미생성(rc=$rc). 실행 로그: $LOG_DIR/review-run.log"
fi
