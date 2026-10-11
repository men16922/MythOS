---
name: gameplay-qa
description: Validate Mythos 2.0 gameplay changes through deterministic engine tests, the bot-driven run simulator, the combat sandbox and muted headless browser evidence. Use on "전투 QA", "게임플레이 검증", "밸런스 측정", "카드/적/임플란트 확인", or for combat rules, tactical-board interactions, combat FX, run/map/event flow and balance. Do not use for an unexplained failure; invoke the diagnose skill first.
---

# /gameplay-qa — Gameplay verification (Mythos 2.0)

Validate a playable claim at the lowest reliable layer, then move outward. Keep deterministic correctness, browser-observable behaviour, and human feel as separate conclusions.

## Workflow

1. Read `references/qa-routes.md` for the commands, the sandbox and the simulator facts. Rules live in `docs/GAMEPLAY.md`.
2. If the symptom's cause is unknown, stop and invoke `$diagnose`; this skill is not a root-cause shortcut.
3. Engine/content change → run the narrow `node --test` file first (`src/mythos_ui/src/v2/engine/*.test.ts`, `content/*.test.ts`) and add or amend a regression test for the changed rule.
4. Balance/content numbers → measure with the run simulator before and after, **on the same seed blocks** (mixed-bot noise is ±6 %).
5. UI, targeting, animation or FX → the combat sandbox or the full game in **headless Playwright with `?mute=1`** (or one Chrome tab, muted, closed afterwards). Capture a screenshot path plus console/page errors.
6. Run `make check` (and `make test-e2e-v2` after `make frontend-build`) before claiming correctness.
7. Classify the outcome precisely:
   - **Verified mechanically**: engine tests / simulator numbers prove the rule.
   - **Verified in browser**: the rendered UI and interaction were observed.
   - **Needs human feel verdict**: pacing, clarity, visual taste, sound, balance feel or fun.

## Scope rules

- Testing is always silent (`?mute=1` / localStorage `mythos2.mute=1`) and uses at most one browser tab (owner directive).
- Keep QA local: no `make deploy`, no production data, no billed cloud calls as part of this skill (the GM falls back to authored text without them).
- Never `Math.random` in engine/content; reproduce bugs with a seed.
- Do not tick a human checklist item from automation. Record objective evidence and leave the feel verdict manual.

## Output

Report only: changed behaviour, commands and results, rendered evidence paths, simulator numbers (before → after), and the remaining human verdict.
