# Mythos 2.0 QA routes

## Deterministic layers
- Engine + content: `make test-v2` (= `cd src/mythos_ui && node --test src/v2/`). Single file: `node --test src/v2/engine/combat.test.ts`.
- Fixtures: `engine/combat.fixture.test.ts` (`FIXTURE`, `makeRun`, `place`, `aim`, `silence`, `setHand`, `unit`).
- Real-content checks: import `CONTENT` from `src/v2/content/index.ts` (see `engine/passive.test.ts`).
- Backend (saves + GM): `make test` (Python `unittest`, `tests/test_v2_*.py`).

## Run simulator (balance)
- `simulateRun(seed, archetype, CONTENT, policy, { paradox, onFight })` in `engine/runSim.ts`; policies `greedy` (1-ply exhaustive), `mixed` (greedy ~75 % of turns), `basic` (ignores telegraphs).
- Baseline 2026-10-11, P0 over 360 runs: greedy 100 % · mixed ≈ 35 % (28–41 % by seed block) · basic 0 %; P5: 78 / 3.
- A/B a change on identical seed blocks; report per-act turns and HP lost from `onFight` telemetry.
- Daily-seed determinism: `engine/daily.test.ts`.

## Browser layers (always muted, headless preferred)
- Combat sandbox: `/?sandbox=combat&mute=1&enc=<encounterId>` (e.g. `a1_n2_nest`, `a2_elite_incinerator`, `a3_boss_ix`); `vw`/`vh` params size the stage.
- Full game: Vite dev (`cd src/mythos_ui && npx vite`, proxies `/api` and `/resources` to `make api`) and the dev hook `window.__m2` (`run`, `setRun`, `setView`, `C`) to jump to a screen or fight.
- Smoke: `make frontend-build && make test-e2e-v2` (title → setup → act intro → event → map → fight, fails on console errors).
- Phones: Playwright context `viewport 390×844, is_mobile=True, has_touch=True`.
