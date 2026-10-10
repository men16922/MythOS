# Agent Brief

Last updated: 2026-10-11

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Mythos 2.0 is built on branch `mythos-2.0` (undeployed; prod is still 1.x `mythos-api-00090-ww4`).** Wait for the owner's first-play verdict (`docs/test/mythos2_first_play.md`, D–S grade) before tuning; then the ship decision (merge → no-traffic tagged Cloud Run revision or full rollout — owner call, it changes what CBT testers see). Tune with the sim harness, not by feel: `simulateRun(seed, archetype, CONTENT, policy, { onFight })` (P0 baseline greedy 93 % · mixed 52 % · basic 0 %; P5 92 / 11). **Test with sound off** (`?mute=1` / localStorage `mythos2.mute=1`; owner directive) and **one browser tab only** (owner complaint). 1.x tracks (§3 verdict, serving research, Dev Graph holds) are paused behind the 2.0 verdict. `git push` stays owner.

## Snapshot

Project MythOS (`세계:접속`) — single-player SF roguelite. Since 2026-10-10 the default game is **Mythos 2.0 "Signal Run"**: Into the Breach-style telegraphed tactics on a 7×5 board + Slay the Spire deck/implants + Hades-style Archive meta, AI GM off the critical path. The 1.x AI-narrated loop TRPG stays reachable at `/?classic=1`.

2.0 layout:
- `src/mythos_ui/src/v2/engine` — pure TS, seeded RNG, JSON state, reducers; tests `node --test` (`make test-v2`). Combat (`combat.ts`/`effects.ts`/`intents.ts`), run/map/meta (`run.ts`/`map.ts`/`meta.ts`), bots + sim (`combatSim.ts`/`runSim.ts`). Contract: `types.ts`.
- `v2/content` — typed data: cards, enemies, encounters, implants, consumables, companions, archetypes, events, lore, endings, IX lines, acts, unlocks, paradox. `content.test.ts`/`narrative.test.ts` guard integrity and quotas.
- `v2/ui` — shell screens (`ui/shell`), combat board/animator (`ui/combat`), shared components, `ui/common` (assets, `sfx.ts` procedural WebAudio, `audio.ts` buffer-looped music + hard mute, generated `artManifest.ts`/`spriteManifest.ts`).
- `src/mythos_v2` — `/api/v2` (profile/run saves in `v2_saves`, memory fallback; GM `narrate`/`improvise` via Ollama/Gemini with authored fallbacks). Client `v2/net/api.ts` mirrors to localStorage.
- `resources/neo-seoul/v2/` — all-new 2.0 art/music/sprites (Gemini image, Lyria, Codex image); regenerate via `scripts/v2_assets/` (idempotent, `--force`).

## Active Work

`docs/NEXT_PLAN.md` is authoritative.
1. Owner first play + grade → post-verdict tuning (numbers live in content files; measure before/after).
2. Ship decision (merge, deploy shape, push) — owner.
3. Candidates after the verdict: phone-width combat, Act 2 normal-fight tension (skilled play takes ~0 damage), Act 3 burst cards, daily seed, Cloud Run smoke of `/api/v2` + Vertex GM.

## Read Order

1. Current state: `docs/STATUS.md`
2. Next work: `docs/NEXT_PLAN.md`
3. Latest log: `docs/PROGRESS_LOG.md`
4. 2.0 rules: `docs/GAMEPLAY.md`; 2.0 design/contract: `docs/plans/2026-10-10-mythos-2.0.md`
5. 1.x architecture (classic): `docs/DESIGN.md`

## Commands

- Full gate: `make check` (skills, doc budget, content, ruff/eslint, mypy + tsc/vite build, `test-v2`, `test`); browser smokes run separately (`make test-e2e-v2`, `make test-e2e`) after `make frontend-build`
- 2.0 engine/content tests: `make test-v2`; 2.0 browser smoke: `make test-e2e-v2`; classic browser E2E: `make test-e2e`
- Local play: `make api` (port busy → `MYTHOS_API_PORT=8010 make api`), Vite dev `cd src/mythos_ui && npx vite`; combat sandbox `/?sandbox=combat&mute=1`
- Infra: `make dev-up` / `make dev-down`

## Guardrails

- 2.0 rules live only in `v2/engine`; content is data in `v2/content` (no rules in UI). Never `Math.random` in engine/content.
- Engine/content imports use explicit `.ts` extensions (Node type stripping).
- Classic 1.x: keep orchestration in `RuntimeSessionService`; don't break `/?classic=1`.
- Don't treat generated outputs, `.env`, tokens, `.docker/` data as source artifacts.
- Keep entry docs short; move detail to `bin/docs/archive/`, dated plans or COMPLETED_SUMMARY.
