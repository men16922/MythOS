#!/usr/bin/env bash
# Harness V2 cross-release evidence — release bundle 00078-rs9 (commit c51cf63,
# deployed 2026-07-20: custom icon set + skill loadout editor + aim corner badge).
# This is the THIRD distinct release for the 3/3 evidence goal.
#
# The 3/3 verdict counts the six-assertion contract (comparability with the
# 07-19 local build and 00077-8g9); route_axis_chip rides alongside as the 7th
# per the 2026-07-20 decision and does not gate the 3/3 count.
#
# Run from the repo root:  bash scratch/run-release-calibration-00078.sh
# Each run boots its own local API on a free port and writes hashed evidence to
# outputs/live-qa/release-00078-rs9-<objective>-1/. ~85s mean per run (~10 min total).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

RELEASE="00078-rs9"
declare -a OBJECTIVES=(
  "image_arrival:2"
  "companion_join:3"
  "party_distribution:2"
  "cutscene_cardinality_return:2"
  "choice_arrival:2"
  "first_use_gloss:2"
  "route_axis_chip:6"
)

pass=0; fail=0; results=()
for entry in "${OBJECTIVES[@]}"; do
  objective="${entry%%:*}"; turns="${entry##*:}"
  run_id="release-${RELEASE}-${objective//_/-}-1"
  if [ -e "outputs/live-qa/$run_id" ]; then
    echo "SKIP $objective — outputs/live-qa/$run_id already exists"
    results+=("$objective: SKIPPED (exists)")
    continue
  fi
  echo "=== [$objective] run_id=$run_id turns=$turns"
  LIVE_QA_TRIGGER=calibration \
  LIVE_QA_CASE=probe \
  LIVE_QA_MODE=fallback \
  LIVE_QA_OBJECTIVES="$objective" \
  LIVE_QA_MAX_TURNS="$turns" \
  LIVE_QA_RUN_ID="$run_id" \
  bash scripts/live-qa/run-agy.sh
  rc=$?
  if [ "$rc" -eq 0 ]; then pass=$((pass+1)); results+=("$objective: rc=0")
  else fail=$((fail+1)); results+=("$objective: rc=$rc"); fi
done

echo "==================================================="
echo "release $RELEASE calibration: pass=$pass fail=$fail (six-assertion contract + route_axis_chip rider)"
printf ' - %s\n' "${results[@]}"
