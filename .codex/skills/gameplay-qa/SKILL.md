---
name: gameplay-qa
description: Validate Project MythOS gameplay changes through deterministic combat tests, the local combat simulator, and rendered browser evidence. Use on "전투 QA", "게임플레이 검증", "전투 시뮬 테스트", "스킬/아이템/상태이상 확인", or for combat mechanics, tactical-board interactions, combat VFX/cinematics, and Neo-Seoul playability QA. Do not use for an unexplained failure; invoke the diagnose skill first.
---

# /gameplay-qa — Gameplay verification

Validate a playable claim at the lowest reliable layer, then move outward. Keep deterministic correctness, browser-observable behavior, and human feel as separate conclusions.

## Workflow

1. Read `docs/test/neo_seoul_live_qa.md` only for the relevant checklist section. Read `references/qa-routes.md` for stable commands and simulator facts.
2. If the symptom's cause is unknown, stop and invoke `$diagnose`; do not treat this skill as a root-cause shortcut.
3. Run the narrow relevant `unittest` module first. Add or amend a regression test for changed mechanics.
4. Run `make check` before claiming code correctness.
5. For UI, targeting, animation, or VFX work, use the local combat simulator with its test kit and inspect the rendered browser. Capture a screenshot or artifact path plus console/network failures.
6. Classify the outcome precisely:
   - **Verified mechanically**: tests/API state prove rules and serialization.
   - **Verified in browser**: rendered UI and interaction were observed.
   - **Needs human feel verdict**: pacing, clarity, visual taste, balance, or fun.

## Scope rules

- Use the combat simulator for repeatable skill/item/status coverage; explicit party selection is exclusive, and an empty list is a solo run.
- Do not use `?fallback=1` to judge combat VFX: fallback combat is intentionally static. Open the non-fallback simulator for visual checks.
- Keep local QA local. Do not run `make deploy`, alter production data, or use Cloud providers as part of this skill.
- Do not mark a human checklist item complete from automation. Record objective evidence and leave the feel verdict manual.
- For unattended work, use the repository browser-QA hook rather than manually invoking an agent loop. Never edit the repository while an overnight runner is active.

## Output

Report only: changed behavior, commands and result, rendered evidence path/URL if applicable, and the remaining human verdict. Add a source-lock test when a past regression is cheap to prevent.
