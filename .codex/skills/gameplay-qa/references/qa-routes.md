# MythOS gameplay QA routes

Run commands from the repository root.

## Deterministic gate

- Narrow combat tests: `./.venv/bin/python -m unittest tests.test_combat_engine` or the smallest relevant `tests/test_combat_*.py` module.
- Full local gate: `make check`.
- Existing browser regression: `make test-e2e`; use it for broad boot-to-combat coverage, not as a substitute for a feature-specific assertion.

## Local interactive combat

1. Start the local API in a separate terminal: `make api` (default `http://127.0.0.1:8000`).
2. Open the boot screen and select the combat simulator. Do not add `fallback=1` when inspecting animation or VFX.
3. Start a simulator combat with `test_kit=true`: it unlocks the full skill pool and grants EMP, incendiary, cryo grenades, and nanopatches.
4. Select the exact party needed for coverage. `party_members=[]` is intentionally a solo run; an explicit roster never silently adds story allies.
5. Use browser DevTools or Playwright to capture a screenshot, console errors, failed requests, and the interaction result. Stop the API after ad-hoc testing with `make api-stop`.

## Evidence boundary

- API/unit state establishes combat rules, logs, and serialization.
- A non-fallback rendered session establishes targeting affordances, board effects, cinema, and input behavior.
- `docs/test/neo_seoul_live_qa.md` owns subjective verdicts such as impact, readability, balance, and fun. Never convert automated evidence into a human pass.

## Automation integration

The overnight runner already calls `scripts/overnight/browser-qa.sh` for browser-observable commits. It delegates browser activity to `scripts/live-qa/run-agy.sh`, writes ignored evidence under `outputs/live-qa/`, and stops on FAIL/NEEDS_HUMAN. Do not run it casually as a replacement for focused local QA.
