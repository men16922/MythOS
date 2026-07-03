#!/bin/bash
# Generate Lin-yue's 5 combat sprites via codex in-session image_gen (transparent bg),
# collect from ~/.codex/generated_images (newest-after-marker), resize to 512x768.
set -u
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$REPO_ROOT/resources/neo-seoul/characters/combat"
CODEX_IMG_ROOT="${CODEX_IMG_ROOT:-$HOME/.codex/generated_images}"
LOG="$REPO_ROOT/scratch/gen_linyue_combat.log"
: > "$LOG"

IDENTITY="Lin-yue (린위에), an elegant East-Asian woman information broker in cyberpunk Neo-Seoul: black hair in a refined updo with ornate gold hairpins, long gold tassel earrings, deep red lips, gold necklace and rings, wearing a floor-length high-collared black robe-coat embroidered with glowing gold circuit patterns. Identity reference image: $REPO_ROOT/resources/neo-seoul/characters/lin-yue.png"
STYLE="Painterly-realistic cyberpunk game combat sprite, FULL BODY head-to-toe visible, single character, TRANSPARENT background (alpha), subtle neon rim light (gold + cyan), matches the framing/scale of the peer sprite $REPO_ROOT/resources/neo-seoul/characters/combat/su-ah-idle.png. Vertical 512x768."

declare -a POSES=(
  "idle|calm standing pose, weight on one hip, one hand loosely holding a compact gold-accented EMP blaster lowered at her side, composed appraising expression"
  "attack|firing her compact gold-accented EMP blaster forward with one extended arm, robe sleeves swept by motion, focused sharp expression, small gold energy arcs at the muzzle"
  "guard|defensive stance, one arm raised across her body with a shimmering gold hexagonal energy ward projected from a bracelet, robe flaring"
  "skill|casting pose, one hand raised conducting floating golden data-glyphs and coin-like discs orbiting her palm, eyes glowing faint gold"
  "hit|recoiling from an impact, torso twisted back, hair ornaments swinging, gritting teeth, sparks glancing off her robe"
)

ok=0; fail=0
for entry in "${POSES[@]}"; do
  pose="${entry%%|*}"; desc="${entry#*|}"
  out="$OUT_DIR/lin-yue-$pose.png"
  echo "=== [$pose] $(date +%T) ===" >> "$LOG"
  marker="$(mktemp)"
  codex exec --cd "$REPO_ROOT" --sandbox workspace-write -c approval_policy=never --json \
    "Use your image_gen skill to generate ONE image, then STOP. A 512x768 vertical full-body game combat sprite with a TRANSPARENT background: $IDENTITY. Pose for this sprite: $desc. Style: $STYLE. Do NOT save/find/copy/move files and do NOT run filesystem searches — generate exactly once; the orchestrator collects the output." \
    >> "$LOG" 2>&1 </dev/null || true
  newest="$(find "$CODEX_IMG_ROOT" -type f -name '*.png' -newer "$marker" 2>/dev/null -exec ls -t {} + 2>/dev/null | head -1)"
  rm -f "$marker"
  if [ -n "$newest" ] && [ -f "$newest" ]; then
    cp "$newest" "$out" && sips -z 768 512 "$out" >/dev/null 2>&1
    echo "[$pose] OK <- $newest" >> "$LOG"; ok=$((ok+1))
  else
    echo "[$pose] FAILED (no new png)" >> "$LOG"; fail=$((fail+1))
  fi
done
echo "DONE ok=$ok fail=$fail" >> "$LOG"
echo "DONE ok=$ok fail=$fail"
