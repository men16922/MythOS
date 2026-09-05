#!/usr/bin/env bash
# Harness V2 cross-release evidence — six-assertion objective QA contract on
# release bundle 00077-8g9 (commit fc4ebc5, deployed 2026-07-19).
# Mirrors the 2026-07-19 local calibration invocation exactly (trigger=calibration,
# case=probe, mode=fallback; companion_join uses 3 interactive checkpoints).
#
# Run from the repo root:  bash scratch/run-release-calibration-00077.sh
# Each run boots its own local API on a free port and writes hashed evidence to
# outputs/live-qa/release-00077-8g9-<objective>-1/. ~85s mean per run (8-9 min total).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

RELEASE="00077-8g9"
declare -a OBJECTIVES=(
  "image_arrival:2"
  "companion_join:3"
  "party_distribution:2"
  "cutscene_cardinality_return:2"
  "choice_arrival:2"
  "first_use_gloss:2"
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
echo "release $RELEASE calibration: pass=$pass fail=$fail"
printf ' - %s\n' "${results[@]}"
