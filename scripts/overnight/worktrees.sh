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
# skills 는 이제 git 추적이라(.claude/.agents/.codex/.gemini 의 skills/) 모든 worktree 가 checkout 시 자동 보유 —
# **더 이상 symlink 안 한다**(과거 symlink 추적이 checkout churn 으로 메인 skills 를 삭제한 사고 방지).
#
# ⚠️ .venv / node_modules 는 symlink 하지 않는다(실증서 확인된 실패):
#   - .venv symlink → editable install(.pth)이 **메인 src** 로 resolve → worktree 코드변경에 **false green**.
#   - node_modules symlink → tsc/vite 가 공유 `node_modules/.tmp` 에 쓰며 **EPERM** 으로 frontend-build 실패.
#   따라서 **코드 레인(claude/codex)의 per-회차 게이트를 worktree 에서 돌리려면 worktree 마다 자체 환경이 필요**
#   하다: `make overnight-worktrees-setup`(아래, 네트워크 필요·1회). 이미지/문서 레인은 자체 환경 없이도 가능.
#   대안: 코드 레인은 메인 체크아웃에서 순차(레인 태그+동시작성자 STOP)로 돌린다(docs/engineering/mythos/AGENTIC.md 권장 모델).
#
# 사용:
#   scripts/overnight/worktrees.sh up       # 생성/갱신(+.claude/.agents symlink)
#   scripts/overnight/worktrees.sh setup    # 코드 레인용 per-worktree venv+node_modules(네트워크 1회)
#   scripts/overnight/worktrees.sh status   # 현황
#   scripts/overnight/worktrees.sh down     # worktree 제거(브랜치는 보존)
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
LINK_DIRS=""   # skills 가 git 추적이라 symlink 불필요(빈 값 → up/down/status 의 링크 루프 no-op)

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
  setup)
    # 코드 레인 게이트를 worktree 에서 faithful 하게 돌리려면 자체 venv + node_modules 가 필요(네트워크 1회).
    # 사람이 루프 밖에서 실행한다(루프 샌드박스는 네트워크 차단). 자체 venv 의 editable install 은 그 worktree
    # 의 src 를 가리키므로 false green 이 없다.
    for eng in $ENGINES; do
      wt="$(wt_path "$eng")"
      [ -d "$wt" ] || { echo "$eng: worktree 없음 — 먼저 'up'"; continue; }
      echo "▶ $eng: per-worktree 환경 provision (python venv + pip -e .[dev,web])..."
      ( cd "$wt" && python3 -m venv .venv && .venv/bin/python -m pip install -q --upgrade pip \
          && .venv/bin/pip install -q -e ".[dev,web]" ) \
        && echo "  $eng: venv ok" || echo "  $eng: venv 실패(네트워크/파이썬 확인)"
      if [ -d "$wt/src/mythos_ui" ]; then
        echo "▶ $eng: frontend node_modules (npm install)..."
        ( cd "$wt/src/mythos_ui" && npm install --silent ) \
          && echo "  $eng: node_modules ok" || echo "  $eng: npm 실패"
      fi
    done
    echo "완료. 이제 각 worktree 에서 make check 가 자체 환경으로 faithful 하게 돈다."
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
    echo "사용법: worktrees.sh {up|setup|status|down}" >&2; exit 1 ;;
esac
