#!/usr/bin/env bash
# Compare changed character/enemy art with an existing canonical pose.
# Identity can be automated; aesthetics and first-ever art stay human-owned.
set -euo pipefail

range="${1:-}"
[ -n "$range" ] || { echo "missing commit range"; exit 2; }
max_pairs="${IMAGE_JUDGE_MAX:-6}"
settings="${IMAGE_JUDGE_SETTINGS:-scripts/overnight/overnight-settings.json}"
log_dir="${OVERNIGHT_LOG_DIR:-scripts/overnight/logs}"

mapfile_compat() {
  while IFS= read -r line; do [ -n "$line" ] && printf '%s\0' "$line"; done
}

files="$(git diff --name-only --diff-filter=AM "$range" 2>/dev/null \
  | awk 'tolower($0) ~ /^resources\/[^\/]+\/(characters|enemies)\/.*\.(png|jpe?g|webp)$/')" || {
  echo "unable to inspect image diff"
  exit 2
}
[ -n "$files" ] || { echo "not applicable: no changed identity art"; exit 0; }

command -v claude >/dev/null 2>&1 || { echo "identity judge unavailable: claude CLI missing"; exit 3; }
[ -f "$settings" ] || { echo "identity judge unavailable: settings missing"; exit 3; }

pairs=""
count=0
missing=""
while IFS= read -r file; do
  [ -n "$file" ] || continue
  dir="$(dirname "$file")"
  stem="$(basename "$file")"; stem="${stem%.*}"; base="${stem%-*}"
  ref=""
  for candidate in "$dir/$base-idle.png" "$dir/$base-guard.png" "$(dirname "$dir")/$base.png"; do
    if [ "$candidate" != "$file" ] && [ -f "$candidate" ]; then ref="$candidate"; break; fi
  done
  if [ -z "$ref" ]; then missing="${missing}${missing:+, }$file"; continue; fi
  count=$((count + 1))
  [ "$count" -le "$max_pairs" ] || { echo "identity judge pair limit exceeded ($max_pairs)"; exit 3; }
  pairs="$pairs
- NEW: $file
  CANON: $ref"
done <<EOF
$files
EOF

[ -z "$missing" ] || { echo "identity reference missing: $missing"; exit 3; }
[ "$count" -gt 0 ] || { echo "identity comparison has no canonical pairs"; exit 3; }

mkdir -p "$log_dir"
head_sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
judge_log="$log_dir/image-identity-$head_sha.log"
prompt="You are MythOS's read-only image identity verifier. Read BOTH images in every pair.
FAIL only when an identity attribute differs: species, gender presentation, hair style/length,
signature face features, or signature palette. Pose, action, framing, and aesthetics are not failures.
Judge every pair. End with exactly one line: IMAGE_JUDGE_VERDICT: PASS - <reason> or
IMAGE_JUDGE_VERDICT: FAIL - <file>: <reason>.
$pairs"

set +e
claude -p "$prompt" --permission-mode plan --settings "$settings" --output-format json >"$judge_log" 2>&1
rc=$?
set -e
verdict="$(grep -oiE 'IMAGE_JUDGE_VERDICT:[[:space:]]*(PASS|FAIL)' "$judge_log" 2>/dev/null \
  | grep -oiE '(PASS|FAIL)' | tail -1 | tr '[:lower:]' '[:upper:]')"
case "$verdict" in
  PASS) echo "identity judge passed $count pair(s)"; exit 0 ;;
  FAIL) echo "identity judge found a character mismatch; see $judge_log"; exit 1 ;;
  *) echo "identity judge inconclusive (exit=$rc); see $judge_log"; exit 3 ;;
esac
