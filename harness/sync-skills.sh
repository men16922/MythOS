#!/usr/bin/env bash
#
# sync-skills.sh — keep the multi-engine skill copies in sync from ONE source.
# ----------------------------------------------------------------------------
# MythOS runs several engines: claude reads .claude/skills, and codex + agy (Antigravity) both
# read the shared .agents/skills (the official Codex repo-skills path). All copies stay
# git-tracked so every worktree checkout carries them (NO symlinks — a past symlink-tracked
# skills dir was deleted by checkout churn; see worktrees.sh).
#
# Single Source of Truth = .claude/skills/  (Claude is the primary engine; skills are authored
# in that format). This script projects it verbatim into .agents/skills. These skills are
# MythOS-customized (Korean, repo-aware) and intentionally DIFFER from the generic overnight-harness
# plugin's skills — the plugin is SSOT for *other* repos, this script is SSOT for MythOS's own copies.
#
# Usage:
#   harness/sync-skills.sh           # write: make the mirrors match .claude/skills
#   harness/sync-skills.sh --check   # verify only: exit 1 on any drift (wired into `make check`)
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SRC=".claude/skills"
MIRRORS=(".agents/skills")
[ -d "$SRC" ] || { echo "FATAL: canonical skills source '$SRC' missing" >&2; exit 1; }

CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1
rc=0; changed=0

# Projected files: SKILL.md bodies plus their references/ payloads (gameplay-qa
# was the first skill to ship one — SKILL.md-only projection let references
# drift silently). Engine-specific extras living only in a mirror (e.g.
# .agents/**/agents/openai.yaml, Codex UI metadata) are deliberately NOT
# scanned, so they are neither projected nor deleted as strays.
project_files() {
  find "$1" -type f \( -name 'SKILL.md' -o -path '*/references/*' \)
}

for m in "${MIRRORS[@]}"; do
  # 1) source → mirror: add/update every projected file
  while IFS= read -r f; do
    rel="${f#"$SRC"/}"; dst="$m/$rel"
    if [ ! -f "$dst" ] || ! cmp -s "$f" "$dst"; then
      if [ "$CHECK" -eq 1 ]; then echo "  out-of-sync: $dst"; rc=1
      else mkdir -p "$(dirname "$dst")"; cp "$f" "$dst"; echo "  + $dst"; changed=1; fi
    fi
  done < <(project_files "$SRC")

  # 2) mirror → source: drop strays (skill/reference files removed from the source)
  if [ -d "$m" ]; then
    while IFS= read -r f; do
      rel="${f#"$m"/}"
      if [ ! -f "$SRC/$rel" ]; then
        if [ "$CHECK" -eq 1 ]; then echo "  stray (not in source): $f"; rc=1
        else rm -f "$f"; echo "  - $f"; changed=1; fi
      fi
    done < <(project_files "$m")
  fi
done

if [ "$CHECK" -eq 1 ]; then
  [ "$rc" -eq 0 ] && echo "sync-skills --check: OK (all engine dirs match $SRC)" \
                  || echo "sync-skills --check: DRIFT — run 'bash harness/sync-skills.sh' to fix" >&2
  exit "$rc"
fi
[ "$changed" -eq 0 ] && echo "sync-skills: already in sync" \
                     || echo "sync-skills: engine dirs updated from $SRC"
