#!/usr/bin/env bash
# Calibrate the new 7th objective assertion `route_axis_chip` (§2 갈림길 가치축 칩
# 정합) on the local fallback stack. Mirrors the six-assertion calibration shape;
# max_turns=6 because the actor must advance to the first junction (~turn 4).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

RUN_ID="calibration-20260720-route-axis-chip-1"
if [ -e "outputs/live-qa/$RUN_ID" ]; then
  echo "SKIP — outputs/live-qa/$RUN_ID already exists"
  exit 0
fi
LIVE_QA_TRIGGER=calibration \
LIVE_QA_CASE=probe \
LIVE_QA_MODE=fallback \
LIVE_QA_OBJECTIVES=route_axis_chip \
LIVE_QA_MAX_TURNS=6 \
LIVE_QA_RUN_ID="$RUN_ID" \
bash scripts/live-qa/run-agy.sh
echo "route_axis_chip calibration rc=$?"
