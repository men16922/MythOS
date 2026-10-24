# Mythos 2.0 QA routes

## Deterministic layers
- Engine + content: `make test-v2` (= `cd src/mythos_ui && node --test src/v2/`). Single file: `node --test src/v2/engine/combat.test.ts`.
- Fixtures: `engine/combat.fixture.test.ts` (`FIXTURE`, `makeRun`, `place`, `aim`, `silence`, `setHand`, `unit`).
- Real-content checks: import `CONTENT` from `src/v2/content/index.ts` (see `engine/passive.test.ts`).
- Backend (saves + GM): `make test` (Python `unittest`, `tests/test_v2_*.py`).

## Run simulator (balance)
- `simulateRun(seed, archetype, CONTENT, policy, { paradox, onFight })` in `engine/runSim.ts`; policies `greedy` (1-ply exhaustive), `mixed` (greedy ~75 % of turns), `basic` (ignores telegraphs).
- Baseline 2026-10-24 (archetype maxHp 34/32/36, owner), P0 over 3 × 360 mixed / 120 greedy / 60 basic runs (seeds `100000·block + i`, archetypes round-robin): greedy ≈ 96 % · mixed ≈ 32 % (30–34 % by block) · basic 0 %. Deaths cluster at bosses (Act 1 boss loss 3.6 → 9.8 %, `a3_boss_ix` 19 → 27 %); Act 1 normal fights still cost ~2 HP. Before (42/40/44, 2026-10-18): greedy ≈ 97 % · mixed ≈ 43–44 %.
- Randomness is per stream: a run's rolls come from `runStream(run, name)` scoped to the current node, act maps from `mapRng`, fights from `combatSeeds` (+ `shuffle` / `ai` inside). To vary rolls in a test, vary `run.seed` (setting `run.rng` only changes legacy saves without `run.streams`).
- A/B a change on identical seed blocks; report per-act turns and HP lost from `onFight` telemetry.
- Daily-seed determinism: `engine/daily.test.ts`.
- Card value (standalone): `node --experimental-strip-types src/mythos_ui/src/v2/engine/card-value.report.ts [cardId …]` (env `ACT=2|3`, `POLICY=greedy|mixed`, `SEEDS`, `OFF`). Adds two copies of each card to a starter deck and compares HP lost / turns / losses on the same seeds. Use `POLICY=mixed` (the `greedy` bot rarely takes damage, so defence looks worthless), run two `OFF` values, and treat it as a watch list: setup/engine/synergy cards score low by construction.
- Per-encounter telemetry: `simulateRun(…, { onFight })` → per-encounter loss rate / turns / HP lost; isolate one fight with `autoPlay(startCombat(run, id, C), C, policy)` on starter decks (`combat-content.test.ts` shows the shape).
- Event balance: `engine/event-balance.test.ts` (best open option 0.5–12 on the simulator's own scale).

## Browser layers (always muted, headless preferred)
- Combat sandbox: `/?sandbox=combat&mute=1&enc=<encounterId>` (e.g. `a1_n2_nest`, `a2_elite_incinerator`, `a3_boss_ix`); `vw`/`vh` params size the stage.
- Full game: Vite dev (`cd src/mythos_ui && npx vite`, proxies `/api` and `/resources` to `make api`) and the dev hook `window.__m2` (`run`, `setRun`, `setView`, `C`) to jump to a screen or fight.
- Smoke: `make frontend-build && make test-e2e-v2` (title → setup → act intro → event → map → fight, fails on console errors).
- Phones: Playwright context `viewport 390×844, is_mobile=True, has_touch=True`.
