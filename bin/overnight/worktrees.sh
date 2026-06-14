#!/usr/bin/env bash
#
# worktrees.sh — 3엔진 병렬 overnight 루프용 git worktree 격리 부트스트랩
# ----------------------------------------------------------------------------
# claude/codex/agy 가 각자 자기 worktree+브랜치에서 동시에 돌아 commit 충돌이 없게 한다.
# 레이아웃(메인 체크아웃의 형제 디렉터리):
#   ../<repo>-loop-claude   (branch loop/claude)
#   ../<repo>-loop-codex    (branch loop/codex)
#   ../<repo>-loop-agy      (branch loop/agy)
#
# gitignore 라 새 worktree 엔 없는 것들을 메인에서 symlink 한다:
#   .claude/.agents — 스킬/프롬프트, .venv — 파이썬 게이트(ruff/mypy/unittest),
#   src/mythos_ui/node_modules — 프론트 게이트(eslint/tsc/vite). (bin/overnight/* 는 git 추적이라 이미 존재.)
# ⚠️ .venv 의 editable install(.pth)은 **메인 src** 를 가리킨다. 따라서 worktree 의 per-회차 게이트는
#   add-only/test/docs/이미지 레인엔 정확하지만, 기존 src 를 *수정*하는 경우엔 메인 src 로 검사된다(근사).
#   src 수정의 권위 검증은 `make overnight-merge`(메인 체크아웃에서 통합본을 make check)다.
#
# 사용:
#   bin/overnight/worktrees.sh up       # 생성/갱신(+symlink)
#   bin/overnight/worktrees.sh status   # 현황
#   bin/overnight/worktrees.sh down     # worktree 제거(브랜치는 보존)
# ----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 메인 체크아웃에서만 실행(중첩 worktree 방지)
MAIN_ROOT="$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git$##')"
[ -n "$MAIN_ROOT" ] || MAIN_ROOT="$REPO_ROOT"

ENGINES="claude codex agy"
PARENT="$(dirname "$MAIN_ROOT")"
BASE="$(basename "$MAIN_ROOT")"
LINK_DIRS=".claude .agents .venv src/mythos_ui/node_modules"

wt_path() { printf '%s/%s-loop-%s' "$PARENT" "$BASE" "$1"; }

cmd="${1:-status}"

case "$cmd" in
  up)
    for eng in $ENGINES; do
      wt="$(wt_path "$eng")"
      branch="loop/$eng"
      if git -C "$MAIN_ROOT" worktree list --porcelain | grep -qx "worktree $wt"; then
        echo "● $eng: worktree 이미 존재 ($wt)"
      else
        if git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
          git -C "$MAIN_ROOT" worktree add "$wt" "$branch"
        else
          git -C "$MAIN_ROOT" worktree add "$wt" -b "$branch"
        fi
        echo "▶ $eng: worktree 생성 ($wt, branch $branch)"
      fi
      # gitignore 된 스킬/설정 디렉터리를 메인에서 symlink
      for d in $LINK_DIRS; do
        if [ -e "$MAIN_ROOT/$d" ]; then
          ln -sfn "$MAIN_ROOT/$d" "$wt/$d"
        fi
      done
    done
    echo "--- worktree 현황 ---"
    git -C "$MAIN_ROOT" worktree list
    echo "팁: 엔진 가동은 해당 worktree 에서. 예: (cd $(wt_path codex) && make overnight-codex-watch)"
    ;;
  status)
    git -C "$MAIN_ROOT" worktree list
    for eng in $ENGINES; do
      wt="$(wt_path "$eng")"
      if [ -d "$wt" ]; then
        links=""
        for d in $LINK_DIRS; do
          if [ -L "$wt/$d" ]; then links="$links ${d}=ok"; else links="$links ${d}=MISSING"; fi
        done
        echo "  $eng:$links"
      fi
    done
    ;;
  down)
    for eng in $ENGINES; do
      wt="$(wt_path "$eng")"
      if git -C "$MAIN_ROOT" worktree list --porcelain | grep -qx "worktree $wt"; then
        # symlink 먼저 제거(worktree remove 가 symlink 타깃을 건드리지 않게)
        for d in $LINK_DIRS; do [ -L "$wt/$d" ] && rm -f "$wt/$d"; done
        git -C "$MAIN_ROOT" worktree remove --force "$wt"
        echo "✗ $eng: worktree 제거 ($wt). 브랜치 loop/$eng 는 보존(필요시 git branch -D)."
      fi
    done
    git -C "$MAIN_ROOT" worktree prune
    ;;
  *)
    echo "사용법: worktrees.sh {up|status|down}" >&2; exit 1 ;;
esac
