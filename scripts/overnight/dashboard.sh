#!/usr/bin/env bash
#
# dashboard.sh — tmux 멀티페인 overnight 대시보드
# ----------------------------------------------------------------------------
# 상단 페인: 2초마다 status.sh(집계 트리). 하단: 각 lane 의 runner.log tail -F.
# tmux 없으면 status.sh 1회 출력 + 안내(폴백). 읽기 전용.
# 설계: docs/engineering/mythos/AGENTIC.md.
# ----------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/../..")"
SESSION="mythos-overnight"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux 미설치 — 집계 트리만 출력합니다. 멀티페인 대시보드는 'brew install tmux' 후."
  echo
  exec bash "$SCRIPT_DIR/status.sh"
fi

# 이미 세션이 있으면 그대로 attach(중복 생성 방지).
if tmux has-session -t "$SESSION" 2>/dev/null; then
  exec tmux attach -t "$SESSION"
fi

# tail 대상 runner.log 목록: 메인 + loop/* worktree.
logs=("$MAIN_ROOT/scripts/overnight/logs/runner.log")
while IFS= read -r line; do
  wt="$(printf '%s' "$line" | awk '{print $1}')"
  case "$wt" in *"-loop-"*) [ -d "$wt" ] && logs+=("$wt/scripts/overnight/logs/runner.log") ;; esac
done < <(git -C "$MAIN_ROOT" worktree list 2>/dev/null)

# 상단 페인: status.sh 폴링 루프(macOS 엔 watch 가 없어 shell 루프로).
tmux new-session -d -s "$SESSION" -n overnight \
  "while :; do clear; bash '$SCRIPT_DIR/status.sh'; sleep 2; done"

# 하단: 각 runner.log tail -F(없는 파일도 생기면 따라감).
for lg in "${logs[@]}"; do
  label="$(basename "$(dirname "$(dirname "$(dirname "$lg")")")")"
  tmux split-window -t "$SESSION" "echo '── $label : $lg ──'; tail -F '$lg' 2>/dev/null"
done

# 상단(status) 을 큰 메인 페인으로, 아래에 tail 들 정렬.
tmux select-layout -t "$SESSION" main-horizontal >/dev/null 2>&1 || tmux select-layout -t "$SESSION" tiled >/dev/null 2>&1
tmux select-pane -t "$SESSION".0

echo "tmux 세션 '$SESSION' 시작 — 떼어내기 Ctrl-b d, 종료 'tmux kill-session -t $SESSION'."
exec tmux attach -t "$SESSION"
