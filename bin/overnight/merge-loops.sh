#!/usr/bin/env bash
#
# merge-loops.sh — 3엔진 루프 브랜치(loop/claude, loop/codex, loop/agy)를 통합 브랜치로 모아
# 게이트를 재실행하고 요약을 낸다. main 은 건드리지 않고 push 도 하지 않는다(사람 검수용).
#
# 도메인 분할(claude=src/tests, codex=docs/story_bible, agy=resources/images)로 충돌은 드물다.
# 충돌 시 해당 머지는 abort 하고 계속 진행, 마지막에 보고한다.
#
# 사용: bin/overnight/merge-loops.sh [BASE]   (BASE 기본 main)
# 결과: loop/integration 브랜치에 머지본 + make check 결과. 사람이 검수 후 main 머지/push.
# ----------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

BASE="${1:-main}"
INTEG="loop/integration"
ENGINES="claude codex agy"
: "${GATE_CMD:=make check}"

[ -z "$(git status --porcelain)" ] || { echo "치명: 워킹트리가 dirty 합니다. 커밋/정리 후 재시도."; exit 1; }
git show-ref --verify --quiet "refs/heads/$BASE" || { echo "치명: base 브랜치 '$BASE' 없음"; exit 1; }

echo "=== integration 브랜치를 $BASE 에서 재생성 ==="
git checkout -q "$BASE"
git branch -f "$INTEG" "$BASE"
git checkout -q "$INTEG"

merged=""; skipped=""; conflicted=""
for eng in $ENGINES; do
  br="loop/$eng"
  git show-ref --verify --quiet "refs/heads/$br" || { skipped="$skipped $eng(브랜치없음)"; continue; }
  ahead="$(git rev-list --count "$BASE..$br" 2>/dev/null || echo 0)"
  if [ "$ahead" = "0" ]; then skipped="$skipped $eng(0커밋)"; continue; fi
  echo "=== merge $br ($ahead 커밋) ==="
  if git merge --no-ff --no-edit "$br"; then
    merged="$merged $eng($ahead)"
  else
    git merge --abort
    conflicted="$conflicted $eng"
    echo "⚠ $eng: 충돌 — abort, 건너뜀(사람 수동 머지 필요)"
  fi
done

echo "=== 게이트 재실행: $GATE_CMD ==="
gate_rc=0
eval "$GATE_CMD" || gate_rc=$?

echo
echo "========== merge-loops 요약 =========="
echo "통합 브랜치 : $INTEG (base $BASE)"
echo "머지됨      :${merged:- 없음}"
echo "건너뜀      :${skipped:- 없음}"
echo "충돌(수동)  :${conflicted:- 없음}"
echo "게이트      : $([ "$gate_rc" = 0 ] && echo green || echo "RED(rc=$gate_rc)")"
echo "agy 이미지  : loop/agy 산출물은 미적 적합도를 사람이 검수해야 함(자동 게이트는 무결성만)."
echo "다음        : $INTEG 검수 → 이상 없으면 $BASE 로 머지/push. main 은 본 스크립트가 건드리지 않음."
echo "====================================="
[ "$gate_rc" = 0 ] && [ -z "$conflicted" ]
