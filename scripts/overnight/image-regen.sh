#!/usr/bin/env bash
#
# image-regen.sh — WS4 image regenerate-on-reject loop (opt-in, human-launched).
# ----------------------------------------------------------------------------
# Closes the loop the overnight [auto:agy] lane can't: aesthetic/frame fitness needs a
# VISION judge, and frame consistency needs ITERATION. Pipeline (design:
# docs/plans/2026-06-20-ws4-image-regen-loop.md):
#
#   agy (Imagen) generate  →  claude --print vision-judge vs frame bible
#     →  pass: cp to resources/  |  fail: codex --print refine the instruction → regenerate
#     →  after MAX_TRIES still failing: FLUX-local fallback (python agent.py) → re-judge
#     →  integrity gate (test_image_assets) ; aesthetic adopt stays human unless AUTO_ADOPT=1
#
# WHY these engines: codex has no vision and is network-blocked → it CANNOT see or generate
# images; its role is text prompt-refinement only. Vision = claude/agy; generation = agy/FLUX.
#
# Burns real agy/FLUX generation + claude/codex calls — NOT part of the nightly drain.
#
# Usage:  make image-regen   (or)   scripts/overnight/image-regen.sh
#   env:  TARGETS="a b c"  MAX_TRIES=3  AUTO_ADOPT=0  SCENARIO=neo-seoul
# ----------------------------------------------------------------------------
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT" || { echo "FATAL: cannot cd to repo root '$REPO_ROOT'"; exit 1; }

# --- config ---
SCENARIO="${SCENARIO:-neo-seoul}"
TARGETS="${TARGETS:-emp_pulse glitch_blink memory_resonance nanoshield_projector signal_overdrive system_intrusion}"
MAX_TRIES="${MAX_TRIES:-3}"
AUTO_ADOPT="${AUTO_ADOPT:-0}"
GEN_ENGINE="${GEN_ENGINE:-agy}"       # agy|codex — both generate via their own in-session Imagen 3/Gemini Image
FLUX_FALLBACK="${FLUX_FALLBACK:-1}"   # 0 to skip FLUX (weak at text-heavy cards → prefer more agy/codex tries)
SKILLS_DIR="resources/$SCENARIO/skills"
STAGING="outputs/agy/skills"
BIBLE_PEERS="patch_protocol packet_shot covering_noise"   # the existing frame-consistent set = the bar
W=768; H=1376                                              # card aspect (9:16-ish), matches peers
LOG_DIR="$SCRIPT_DIR/logs"; mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/image-regen.log"
PY="${PY:-.venv/bin/python}"

log() { printf '%s  %s\n' "$(date '+%H:%M:%S')" "$1" | tee -a "$LOG"; }

# --- preflight ---
for bin in agy claude codex; do command -v "$bin" >/dev/null 2>&1 || { log "FATAL: '$bin' CLI not on PATH"; exit 1; }; done
[ -x "$PY" ] || log "WARN: $PY missing — FLUX fallback (stage 4) will be skipped"
for p in $BIBLE_PEERS; do [ -f "$SKILLS_DIR/$p.png" ] || { log "FATAL: frame-bible peer $SKILLS_DIR/$p.png missing"; exit 1; }; done

PEER_PATHS=""; for p in $BIBLE_PEERS; do PEER_PATHS="$PEER_PATHS $SKILLS_DIR/$p.png"; done

# Per-skill central-illustration briefs (frame is fixed by the bible; only this subject varies).
brief() { case "$1" in
  emp_pulse)            echo "cyan electromagnetic shockwave radiating outward, a figure mid-discharge in a rain-slick alley" ;;
  glitch_blink)         echo "a cyber-runner dashing, leaving cyan/magenta glitch double-exposure residue" ;;
  memory_resonance)     echo "a head-and-shoulders figure overlaid with amber neural-network lines and floating holographic memory shards" ;;
  nanoshield_projector) echo "a glowing blue hexagonal plasma barrier deflecting pink/purple laser fire, defender stance" ;;
  signal_overdrive)     echo "an overloaded circuit/figure crackling with orange-red lightning, speed-overdrive surge" ;;
  system_intrusion)     echo "a hacker at a green terminal breaching a database, intrusion HUD" ;;
  *)                    echo "a Neo-Seoul cyberpunk skill action" ;;
esac; }

# Generate via $1 (agy|codex) using the shared frame-bible instruction $2. Both engines draft with their
# own in-session Imagen 3 / Gemini Image (per PROMPT.{agy,codex}.md), NOT FLUX, and save PNGs themselves.
gen_engine() {
  local eng="$1" instr="$2"
  case "$eng" in
    agy)
      agy --print "$instr" --dangerously-skip-permissions --print-timeout 30m --add-dir "$REPO_ROOT" \
        >> "$LOG" 2>&1 </dev/null ;;
    codex)
      # network allowed (default) so codex's image API is reachable; workspace-write for the PNG writes.
      codex exec --cd "$REPO_ROOT" --sandbox workspace-write -c approval_policy=never --json "$instr" \
        >> "$LOG" 2>&1 </dev/null ;;
    *) log "FATAL: unknown engine '$eng'"; return 1 ;;
  esac
}

log "=== WS4 image-regen start (scenario=$SCENARIO, targets=[$TARGETS], GEN_ENGINE=$GEN_ENGINE, MAX_TRIES=$MAX_TRIES, AUTO_ADOPT=$AUTO_ADOPT) ==="

unresolved="$TARGETS"
critique_note=""   # accumulates vision critique → fed into the next agy/codex instruction

for ((attempt=1; attempt<=MAX_TRIES; attempt++)); do
  [ -n "$unresolved" ] || break
  dir="$STAGING/attempt-$attempt"; mkdir -p "$dir"
  log "--- attempt $attempt/$MAX_TRIES · unresolved: [$unresolved] ---"

  # Build per-skill brief block for the prompt.
  briefs=""; for t in $unresolved; do briefs="$briefs
  - $t.png : $(brief "$t")"; done

  # STAGE 3 (refine, attempt>1): codex turns the prior vision critique into a tightened generation instruction.
  refine=""
  if [ "$attempt" -gt 1 ] && [ -n "$critique_note" ]; then
    log "stage refine: codex authoring a stricter instruction from the vision critique"
    codex exec --cd "$REPO_ROOT" --sandbox workspace-write \
      -c sandbox_workspace_write.network_access=false -c approval_policy=never --json \
      --output-last-message "$REPO_ROOT/$dir/refined.txt" \
      "You are refining an image-generation instruction. The frame bible is the card style of $BIBLE_PEERS in $SKILLS_DIR (read their look from any nearby review notes; you cannot see images, reason structurally). A vision reviewer rejected the previous batch with this critique:
$critique_note
Write a single tightened English instruction (<=120 words) that forces frame/typography/footer UNIFORMITY with the peer cards for the skills [$unresolved]. Output ONLY the instruction text." </dev/null >> "$LOG" 2>&1 || true
    [ -f "$dir/refined.txt" ] && refine="$(cat "$dir/refined.txt")"
  fi

  # STAGE 1: GEN_ENGINE drafts each unresolved icon into the attempt dir, matching the peer frame.
  log "stage generate: $GEN_ENGINE drafting [$unresolved] → $dir/"
  gen_instr="Generate skill-card icons matching EXACTLY the existing frame of the peer cards $PEER_PATHS (same neon border, footer band, side strip, role band, name banner, vertical ${W}x${H} TCG layout). ONLY the central illustration + the skill name/role text change per card. Use your own in-session Imagen 3/Gemini Image (NOT FLUX). Save each as $dir/<id>.png (${W}x${H} PNG). Cards to make:$briefs
${refine:+STRICT REFINEMENT FROM REVIEW: $refine}
Then write a one-paragraph $dir/notes.md describing what you produced. Do not touch resources/."
  gen_engine "$GEN_ENGINE" "$gen_instr" || log "WARN: $GEN_ENGINE generate returned non-zero"

  # STAGE 2: claude vision-judge — compare drafts to the frame bible, emit parseable verdict lines.
  log "stage judge: claude --print vision-scoring drafts vs frame bible"
  verdict="$dir/verdict.txt"
  claude -p "Look at each PNG in $dir/ (use Read to view them) and compare its CARD FRAME (border, footer band, side strip, role band, name banner, layout, typography) to the peer reference cards $PEER_PATHS. The bar is FRAME UNIFORMITY with the peers across all cards — not individual prettiness. For each <id>.png output EXACTLY one line:
PASS <id>
or
FAIL <id> <one-sentence concrete frame critique>
Output ONLY those lines, nothing else." \
    --permission-mode acceptEdits --settings "$SCRIPT_DIR/overnight-settings.json" --output-format json > "$dir/judge.json" 2>>"$LOG" || log "WARN: claude judge returned non-zero"
  # Extract result text (claude --output-format json → .result) then the PASS/FAIL lines.
  "$PY" -c "import json,sys; print(json.load(open('$dir/judge.json')).get('result',''))" 2>/dev/null > "$verdict" || cp "$dir/judge.json" "$verdict"

  # STAGE 3b: promote passes, recompute unresolved, accumulate critique.
  still=""; critique_note=""
  for t in $unresolved; do
    if grep -qiE "^PASS[[:space:]]+$t([[:space:]]|$)" "$verdict" 2>/dev/null && [ -f "$dir/$t.png" ]; then
      cp "$dir/$t.png" "$SKILLS_DIR/$t.png" && log "  PASS $t → promoted to $SKILLS_DIR/$t.png"
    else
      still="$still $t"
      crit="$(grep -iE "^FAIL[[:space:]]+$t" "$verdict" 2>/dev/null | head -1)"
      critique_note="$critique_note
${crit:-FAIL $t (no card produced / unparsed verdict)}"
    fi
  done
  unresolved="$(echo $still | xargs echo)"
done

# STAGE 4: FLUX-local deterministic fallback for anything still unresolved.
if [ -n "$unresolved" ] && [ "$FLUX_FALLBACK" = "1" ] && [ -x "$PY" ]; then
  log "--- FLUX-local fallback for still-unresolved: [$unresolved] ---"
  fdir="$STAGING/flux-fallback"; mkdir -p "$fdir"
  for t in $unresolved; do
    log "  FLUX generating $t (this loads torch on MPS, slow)"
    "$PY" agent.py "Neo-Seoul cyberpunk TCG skill card, vertical, neon border and footer band, central illustration: $(brief "$t")" \
      --no-enhance --width "$W" --height "$H" --output "$fdir/$t.png" >> "$LOG" 2>&1 \
      && log "    FLUX drafted $fdir/$t.png (needs human frame check — FLUX text rendering is weak)" \
      || log "    FLUX failed for $t"
  done
  log "FLUX fallbacks are in $fdir/ — review and cp the acceptable ones to $SKILLS_DIR/ manually."
fi

# --- integrity gate + summary ---
adopted="$(echo "$TARGETS" | tr ' ' '\n' | while read -r t; do [ -f "$SKILLS_DIR/$t.png" ] && echo "$t"; done | tr '\n' ' ')"
log "=== done. promoted/present in $SKILLS_DIR: [$adopted] · still unresolved: [${unresolved:-none}] ==="
if [ -z "$unresolved" ]; then
  log "all targets resolved — running integrity gate (test_image_assets)"
  MYTHOS_LOG_LEVEL=ERROR "$PY" -m unittest discover -s tests -p 'test_image_assets.py' >> "$LOG" 2>&1 \
    && log "integrity: test_image_assets GREEN" || log "integrity: test_image_assets RED — inspect $LOG"
fi
if [ "$AUTO_ADOPT" != "1" ]; then
  log "NOTE: aesthetic adoption is HUMAN by default. Drafts are in $SKILLS_DIR (loop/agy worktree if run there)."
  log "      Review, then commit; or re-run with a higher MAX_TRIES. Set AUTO_ADOPT=1 only when you trust the judge."
fi
