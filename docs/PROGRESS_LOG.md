# Progress Log

Last updated: 2026-10-24

## 2026-10-24 — Contest W0: English architecture write-up + English GM eval slice

- `docs/contest/architecture-en.md`: problem, mermaid diagram, AI off the critical path, clamped outcomes, hedged tail latency, four cost layers, replay-verified dailies, deploy verification + gates — each number points to its source. Production DB host not claimed (not verifiable from the repo).
- `gm_eval.py --lang en` + 3 English cases (act intro, boss, chronicle). Local Ollama `gemma4:8b-64k` (forced; no Vertex): 9 cases × 2, usable 100 %, p50 0.56 s, p95 1.1 s (`outputs/gm-eval/20261024-162952-…-en.json`). Lines read naturally; the local chronicle can be flat. A Vertex English run needs the owner's OK (billed).

## 2026-10-24 — Architect HUD (opt-in `?hud=1`)

- `telemetry.ts` (memory only) + `gm.ts` record each GM call's outcome and latency; `ArchitectHud.tsx` shows AI calls / LLM share / median latency (authored line at 0 ms), allowance, seed + named streams, daily replay steps. Off unless the link has `?hud=1`; phones start folded.
- Verified: `telemetry.test.ts`; headless with a 0.9 s mocked `llm` narrate: HUD lists both calls (~920 ms), absent without `?hud=1`, 0 errors; `make check` green; `make playthrough-quick` OK.

## 2026-10-24 — Phone: first-combat tips off the board; two-row top bar

- Phone top bar: with an empty belt the three dashed slots are gone and the tools join the party row — 2 rows (88 px) instead of 3 (126 px); the first event option now shows without scrolling at 390×844. A consumable brings the third row back.
- `Coach.tsx`: a board tip sits beside the board when ≥ 180 px is free (desktop, phone landscape), else under the board / docked over the hand (phone portrait) — never on the tiles it explains.
- Verified: headless muted sandbox `a1_n2_nest` at 390×844, 844×390 and 1440×900 (whole board visible in all three); phone flow title → event → map, 0 errors; `make check` green; `make playthrough-quick` OK (97 s / 137 s).

## 2026-10-24 — `?lang=en|ko` link parameter (judge links)

- `ui/store.ts`: a link's `lang` is applied at boot and saved like a settings change; a server copy adopted at boot keeps it. No default change (the browser-language default stays an owner call).
- Verified: `lang.test.ts`; headless phone: `?lang=en` → English title, plain reload stays English, `?lang=ko` → Korean, 0 errors; `make check` green.

## 2026-10-24 — Wave 2: player HP 34/32/36 (owner pick)

- Telemetry first (`onFight`, same 360-run block): the cut barely changes Act 1 normal fights (~2 HP each) and moves deaths to bosses (Act 1 boss loss 3.6 → 9.8 %, final boss 19 → 27 %) — shown to the owner, who chose 34/32/36.
- After, real content, 3 × 360 mixed: 30.3 / 34.2 / 32.5 % (was 44 %); greedy 95.8 % (120); basic 0 %. `content.test.ts` HP range 30–38; `qa-routes.md` baseline updated.
- Verified: `make check` green, `make test-e2e-v2` green (combat shows 34/34). Needs the owner's feel verdict.

## 2026-10-24 — Wave 1: honest AI mark + one-tap Improvise ideas (UX-first cut)

- Plan review: `docs/plans/2026-10-24-improvement-and-direction-plan.md` fact-checked; HP A/B re-measured on 3 × 360 mixed runs (current 44.0 %, 34/32/36 → 32.3 %, 32/30/34 → 29.2 %).
- `gm.ts` `narrateLine()` returns `{text, ai}`: act intros, event lines and boss narration no longer log the local narration as AI (it carried the report flag too). `AiMark` (`✦ AI`) on model lines in GmCard / IX comms / enemy taunts / companion chat / GM ruling; one soft cyan flash when the line lands.
- Improvise: three one-tap ideas for the player's top stats (`improvSuggest.ts`); a tap fills the box, the chips hide while typing; each phrase reads as its named stat to the local judge (test).
- NPC free talk (`DialogueScreen`): model replies carry the mark + inline report flag and join the Settings AI-line list (they were missing from it). Verified on Vite dev with a mocked `llm` reply (district `d1_lamp_market` tent), 0 errors.
- Owner rule mid-wave: UX first, low fatigue → dropped the TopBar AI chip and intent-% / memory tags (`DECISIONS.md`).
- Verified: `make check` green (node 350, Python 337 + 12 DB skipped); `make playthrough-quick` OK (134 s); headless muted 1440×900 + 390×844 with a mocked `llm` narrate: mark on act intro + event card, 3 chips, tap fills, 0 console errors. Real model line checked the same day: local Ollama `gemma4:8b-64k` (no Vertex), act intro + event narrate both `source: llm` → mark shown on both cards.

## 2026-10-20 — Promoted `00140-paw` (owner: "승격 + 운영 검증")

- Batch since 00138: coach tips beside the board, NPC free talk kept on screen, story chronicle (`chronicle.ts`), Archive "unlockable now" marks, AI clip with the companion scene. Preview 5/5 → `--to-latest` → service URL 4/4, demo narrate `llm`, title + demo notice, 0 page errors. Rollback `00138-mez`.
- Also checked on a GM-on local server: the safehouse companion chat answers from this run's choices ("아까 그 노인 버리고 튀었으면…").

## 2026-10-20 — First-session review, NPC free talk kept on screen, AI-features clip

- First session as a brand-new player (normal speed, recorded): title → first fight in ~40 s of clicks; found the first-combat tip covering the board it explains — tips about the board now sit in the free column beside it and the target pulses.
- **NPC free talk**: the player's typed line and the NPC's model reply were replaced 0.9 s later by the matched option's canned label (unreadable; the AI's work vanished). Now the reply stays, the mapped option is offered as "그 말대로 간다 → …" (the player decides), and the outcome shows their own words + the reply (`DialogueScreen.tsx`).
- `record_trailer.py --scenes ai --gm`: 45 s clip from the real UI with Vertex lines (Improvise ruling, NPC talk, IX at the Haetae fight) → `outputs/trailer/ai/` (not committed; `outputs/` is ignored).
- Verified: `make check`, e2e, `playthrough-quick`, a Signal+ 6-node playthrough (dialogue 12 polls), frames of the clip read back. Not deployed yet.

## 2026-10-20 — Promoted `00138-mez` (owner: "지금 승격 + 운영 검증"); fun-check sheet

- `gcloud run services update-traffic mythos-api --to-latest` → 100 % `LATEST` = `00138-mez` (`25dbf9b`); rollback `00113-w55`. Service URL: `verify_preview.py --url` 4/4; demo code → `/plan` 200 + `act_intro`/`event` lines 3/3 `llm`; no code → 401; daily board 200 (migration 018 applied itself to production Postgres); title renders with the demo notice, 0 page errors (headless, muted).
- `docs/test/mythos2_fun_check.md`: the owner's 30–40 min play sheet (first 10 minutes, combat feel, AI features incl. Improvise and NPC talk, replay value, phone) + five tester survey questions.

## 2026-10-19 — Preview 00137 verified; GM tail latency: per-request timeout + hedged Vertex calls

- Preview `00137-loq` (`56a7467`): `make verify-preview` 5/5; on the preview, demo code → `/plan` 200 + a real `llm` line; no/bad code → 401; saves stay closed; title shows "데모 접속".
- Found on it: ~half of act-intro GM calls ended in Vertex **504 DEADLINE_EXCEEDED** at ~7 s (Cloud Run logs `ServerError`; older revisions show the same sporadically). Measured locally: the same 100-token answer takes 2–5 s, sometimes 10–23 s. Fixes in `mythos_v2/llm.py`: the HTTP timeout is now per request (the cached client kept its first call's timeout), and a call with no answer after 4 s (`MYTHOS_V2_GM_HEDGE_S`) sends the same request once more — first success wins, the loser's tokens still reach the budget (`set_usage_sink`). Narrate timeout 10 → 14 s (client 12 → 16 s; authored text is on screen meanwhile). Local Vertex: act intros 10/12 answered (7 hedged). Failures now log the error message. **Preview `00138-mez` (`25dbf9b`)**: `verify-preview` 5/5, act intros through the demo code 10/10 `llm` (2.8–8.0 s). Not promoted (owner call).

## 2026-10-18/19 — Contest demo codes; replay-verified daily board (`32e14bd`, `c917c51`)

- **Demo codes** (off by default): `MYTHOS_DEMO_CODES` + `?demo=<code>` give a signed-out device AI lines on the free allowance, GM routes and `/plan` only (`docs/online.md`). Verified: 3 server tests, 1 client test, end-to-end against a google-mode server (no code → no AI calls; code → `/plan` 200 + "데모 접속" on the title).
- **Replay verification**: client logs committed daily actions (`ui/replay/`), server replays them with the bundled engine (`mythos_v2/replay.py`, `replay_verify.mjs`), `verified` column (migration 018), shield badge; ranking unchanged. Verified: a full real-UI daily victory (533 steps, act 3) replays to an identical final state; replay/daily/store tests incl. Postgres (33); e2e "replay of N steps verified" + badge; local Docker image build runs the verifier (node 20 → True). The e2e caught `submitDaily`/`queueAdd` dropping the new field (fixed, lesson added).
- `make check` green (node 344, Python 329 + 12 skipped), `make playthrough-quick` OK. Not deployed (Dockerfile now installs `nodejs`).

## 2026-10-18 — Experience audit pass 1: GM fallback lines, IX overlay, phone top bar, NPC portraits, cache art (owner goal: commercial-grade polish)

- **How found**: full Signal+ run through the real UI with `PLAYTHROUGH_TOUR=<dir>` (new: two screenshots of every screen kind) at 1280×720 and 390×844 (touch), then reading every screen.
- **Fixed**: (1) the authored GM lines every signed-out player reads (`ui/shell/localGm.ts`, was inline in `gm.ts`) printed "세린이(가)", "1번째 루프" and one generic line per event — now per-scene action lines with `josa()` (`lang.ts`); same particle fix in `BossNarration`, `RestScreen`, the district log, a `gm.py` prompt; (2) IX comms toasts lingered onto act intros / caches over the title and GM card — dropped off fight/reward screens; (3) first-combat coach covered the encounter title banner — waits for it; (4) implants past the bar width were scrolled out of sight — `+N` chip with a hover list; (5) phone top bar's first row was clipped (3 rows in a 92 px bar) — explicit 3 rows at 126 px (`--m2-bar-h`), directive panel folds on phones; (6) all 18 CRPG NPCs had a letter placeholder — portraits via Codex image (`gen_npc_portraits.py`, 19 calls); (7) the supply cache was CSS boxes — generated sealed/unsealed crate cross-fade (`gen_codex_image.py`, 2 calls).
- **Verified**: `make check` green (node 339), `make test-e2e-v2` green, `make playthrough-quick` OK; screenshots checked for every fix (desktop + phone). Not deployed.
- **Watch (no change)**: mixed-bot telemetry over 240 runs — act 1 normal fights 0 % loss / 5 % HP, most deaths at the IX boss (23 %); the basic bot still dies in act 1, so act 1 tests telegraph reading. Retune only with real-player data.

## 2026-10-18 — Named RNG streams (daily fairness, AI ≠ shuffle, order-free reshuffle) + docs: contests first

- **Why**: on one daily seed, a player who only opened a shop got a different Act 2 map and a different opening hand in the same fight (reproduced with an engine script) — every roll shared `run.rng`. Spec taken from the owner's StS2 RNG study (`~/Desktop/AI/sts2-rea-lab`, clean-room report only).
- **What**: `engine/streams.ts` (`runStream`, `mapRng`, `combatSeeds`, `combatStream`, `resetNodeStreams`); `run.ts` rewards/shop/cache/events/encounter fallback, `crpg.ts` d20, `combat.ts` seeds + opening shuffle, `effects.ts` reshuffle (canonical sort) and random inserts, `intents.ts` AI noise on its own stream. `RunState.streams` / `CombatState.streams` optional: saves without them keep the old single stream. 6 tests in `engine/streams.test.ts`; 5 older tests now vary `run.seed`.
- **Verified**: `make test-v2` 334/334, `make check` green, `make test-e2e-v2` green, `make playthrough-quick` OK. Sim before/after on identical seeds (3 × 360 mixed): 42.4 % → 43.3 %, greedy 97.5 % → 96.7 %, basic 0 → 0. Not deployed.
- **Docs**: `DECISIONS.md` (streams; paid release + Signal+ on hold, contests first), `NEXT_PLAN.md` P0 rewritten around polish + contest kit, `GAMEPLAY.md` daily wording made exact, `qa-routes.md` baseline refreshed (the 10-11 "mixed ≈ 35 %" predated later content).

Older entries: `bin/docs/archive/progress-2026-10-18-mythos2-tiers-and-replayability.md` (2026-10-18 tiers / CRPG / replayability / spend cap), `bin/docs/archive/progress-2026-10-17-mythos2-ai-and-bench.md` (2026-10-17 and before).
