#!/usr/bin/env bash
#
# status.sh — 3엔진 overnight 루프 집계 트리 (읽기 전용)
# ----------------------------------------------------------------------------
# 메인 + 각 loop/* worktree 의 status.tsv(머신리더블 회차 원장)·STOP/DONE·git HEAD/branch 를
# 읽어 한눈에 보는 트리로 출력한다. 아무것도 수정하지 않는다.
# 설계: docs/engineering/mythos/AGENTIC.md · 원장 생성: scripts/overnight/run.sh(emit_status).
# ----------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/../..")"
NOW="$(date +%s)"
RECENT=2400   # status.tsv 가 이 시간(초) 안에 갱신됐으면 가동 중으로 간주(회차 사이 PAUSE 포함 40분)

if [ -t 1 ]; then
  C_RUN=$'\033[1;32m'; C_OK=$'\033[36m'; C_FAIL=$'\033[1;31m'; C_STOP=$'\033[33m'; C_IDLE=$'\033[90m'; C0=$'\033[0m'
else
  C_RUN=; C_OK=; C_FAIL=; C_STOP=; C_IDLE=; C0=
fi

# 파일 mtime(초) — macOS(stat -f)/GNU(stat -c) 양쪽.
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

# 한 lane(worktree) 한 줄 출력. $1=root  $2=label  $3=연결선(├─/└─)
print_lane() {
  local root="$1" label="$2" tee="$3"
  local branch head tsv stopf donef last outcome ltime head9 iter dur color state detail age
  branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  head="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo '?')"
  tsv="$root/scripts/overnight/logs/status.tsv"
  stopf="$root/scripts/overnight/STOP"; donef="$root/scripts/overnight/DONE"

  iter='-'; dur=''; detail=''
  if [ -f "$tsv" ]; then
    last="$(tail -1 "$tsv" 2>/dev/null)"
    outcome="$(printf '%s' "$last" | cut -f5)"
    iter="$(printf '%s' "$last" | cut -f4)"
    head9="$(printf '%s' "$last" | cut -f6)"
    dur="$(printf '%s' "$last" | cut -f7)"
    ltime="$(mtime "$tsv")"; age=$(( NOW - ltime ))
  else
    outcome=''; age=999999
  fi

  if [ -f "$donef" ]; then
    state='done'; color="$C_OK"; detail="DONE: $(head -1 "$donef" 2>/dev/null)"
  elif [ -f "$stopf" ]; then
    state='stopped'; color="$C_STOP"; detail="STOP: $(head -1 "$stopf" 2>/dev/null)"
  elif [ -z "$outcome" ]; then
    state='idle'; color="$C_IDLE"; detail='(원장 없음 — 가동 이력 없음)'
  elif printf '%s' "$outcome" | grep -q '^exit:'; then
    state='finished'; color="$C_IDLE"; detail="${outcome#exit:}"
  elif [ "$outcome" = 'failure' ]; then
    state='failed'; color="$C_FAIL"
  elif [ "$age" -lt "$RECENT" ]; then
    state='running'; color="$C_RUN"
  else
    state='idle'; color="$C_IDLE"; detail="마지막: $outcome (${age}s 전)"
  fi

  printf '%s %s%-8s%s [%s%-8s%s] %-13s iter%-3s %-9s %s%s%s\n' \
    "$tee" "$C0" "$label" "$C0" "$color" "$state" "$C0" "$branch" "$iter" "${head9:-$head}" \
    "$C_IDLE" "${dur:+${dur}s }$detail" "$C0"
}

echo "Overnight lanes  (오케스트레이터 main: $(git -C "$MAIN_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null))"

# worktree 발견: git worktree list 에서 loop/* 브랜치 트리. 없으면 메인만.
lanes=()
while IFS= read -r line; do
  wt="$(printf '%s' "$line" | awk '{print $1}')"
  [ -d "$wt" ] || continue
  case "$wt" in *"-loop-"*) lanes+=("$wt") ;; esac
done < <(git -C "$MAIN_ROOT" worktree list 2>/dev/null)

n=${#lanes[@]}
if [ "$n" -eq 0 ]; then
  print_lane "$MAIN_ROOT" "main" "└─"
  echo "  (loop/* worktree 없음 — 메인 단독. 병렬은 make overnight-worktrees 후.)"
else
  i=0
  for wt in "${lanes[@]}"; do
    i=$((i+1))
    label="$(basename "$wt" | sed 's/.*-loop-//')"
    [ "$i" -eq "$n" ] && tee="└─" || tee="├─"
    print_lane "$wt" "$label" "$tee"
  done
fi

printf '%sLegend:%s %srunning%s / %sdone%s / %sfailed%s / %sstopped%s / %sidle%s\n' \
  "$C_IDLE" "$C0" "$C_RUN" "$C0" "$C_OK" "$C0" "$C_FAIL" "$C0" "$C_STOP" "$C0" "$C_IDLE" "$C0"
