# Progress Log

Last updated: 2026-10-25

## 2026-10-25 — S-rank pass 2: Rage, archetype parity, Paradox 5 ceiling, status icons (Claude Opus 5.5)

- **Rage** (`StatusKind 'rage'`, `dmgBonusOf` adds it, `growRage` in the enemy phase, `CONTENT.tuning.rage` elite 3 / boss 1 from turn 3, Paradox 5 one turn earlier via `CombatScaling.rageFrom`; `bossHpPct` −15). Flat elite damage +1/+2 had left elite loss at ~3 % (rejected). `engine/tuning.test.ts` (5 tests).
- **Parity**: ghost evade perks AGI 7 → 8 (Se-rin's +1 made them free), `cracked_cube` victory heal 2 → 5, `overclocked_deck` block 3/turn.
- **Art**: Codex status icons `status/{bleed,evade,focus,rage}.png` (chroma-keyed, 4 calls); `art.test.ts` asserts every status has its own file.
- **Sim** (5 × 150 P0): mixed 40.5 % (39.3/40.7/38.7/49.3/34.7), ghost 42 / smuggler 42 / echo 37, elite loss 7.3 % (7.5 t), boss 8.9 t, Paradox 1–5 34.7/26.0/12.7/10.7/8.7 %, greedy P0 98.9 / P5 85.6 %, basic 0 %.
- **Verified**: `make check`, `make frontend-build`, `make playthrough-quick`, sandbox screenshot of an elite at turn 4 (Rage 3 pill, telegraph 9). **Unverified**: human feel of Rage, deploy.

## 2026-10-25 — Argon review: refactor, rebalance (~75 → ~45 %), unique art (Claude Opus 5.5)

- **Review** (`docs/plans/2026-10-25-argon-review-and-s-rank-plan.md`): Argon's `0699ace..491f071` raised P0 mixed win 30.8 → ~75 % (greedy 100 %) unmeasured — the log entry below still quoted 30.9 %. Same-block sims: `1f97f84` (stats/evade/crit/DoT) 61.7 %, `491f071` 70.8–77.5 %; all stat perks off 51.7 %; 7-row map −16 pts. Hidden mutator rules (`overclocked_grid` per-turn refund + DoT ×1.5, `magnetic_storm` bump/push, `acid_rain` first-2-enemies + hazard ×2), `ripper_hound` text, English-only CRIT/EVADE popups, reused art (3 bosses, 14 cards, 4 implants, 9 events, 12 sprites).
- **Refactor**: `engine/statPerks.ts` (one table for engine + `TopBar` tooltip), `perksOf`/`sprintEvade`/`hazardDamage`/`applyOpeningPerks`, `MutatorDef.combat` + `mutatorCombat()`, `WORLD_ECHOES` (`legacy.ts`; dead `world_echo_throne` + encounter-id branches removed), `CONTENT.tuning` (`EnemyTuning`; test doubles keep authored numbers).
- **Balance**: `MAP_ROWS` 8 → 7 (24 floors), perk thresholds +1, tuning HP +12 % / elite·boss +20 % / enemy dmg +1 (telegraphed), bleed movement-only, smuggler HP 32 → 35 + `overclocked_deck` block 2/turn (smuggler-only 32 → 46 %) + `system_hack` draws 1. P0 4 × 150 mixed 38.0/44.7/48.0/54.7 %, greedy 98.9 %, basic 0 %, Paradox 1/3/5 31.3/27.3/16.0 %; ghost ~54 · smuggler ~37 · echo ~48; boss ~10 turns. Elite flat +1/+2 dmg tried: elite loss stays ~3 % (not adopted, `EnemyTuning.eliteDmg` left at 0). Open: archetype gap 17 pts, elite threat, boss length.
- **Fixes/UX**: mutator text = code, `acid_rain` hits all enemies, localized 치명타/회피 popups, distinct bleed (crimson) / corrode (acid) damage numbers.
- **Art (Codex image, 68 calls, 0 GCP)**: unique boss key art ×3, boss sprites ×3, cards ×14, implants ×4, events ×9, enemy sprites ×9 (`sprites/specs.py`, `build_manifest.py`); eye-checked, `qa_text.py` (Gemini) not run.
- **Verified**: `make check` green (363 + 338), `make frontend-build`, `make playthrough-quick` OK (126 s; 134 s after the smuggler/tuning follow-up), sandbox screenshots (3 bosses, blade alley, rust hulk; 0 console errors). **Unverified**: `make test-e2e-v2`, phone widths with new art, deploy (production still `00148-nav`).

## 2026-10-25 — Promoted `00148-nav` (`34a6c75`) + BGM overhaul, content/volume expansion, 5-stat combat, Evade/Crit, 3-DoT & W1–W3 showcase kit

- **Cloud Run promotion (`00148-nav` / `34a6c75`, rollback `00146-cuf` / `00144-haw`)**: `make deploy-preview` → `make verify-preview` 5/5 → `update-traffic --to-latest` → production URL `verify_preview.py --url` 4/4.
- **BGM Overhaul & Content/Volume Expansion (`docs/plans/2026-10-25-content-volume-expansion-plan.md`, `scripts/v2_assets/gen_music.py`, `v2/content/`)**: replaced 10 core `.m4a` loops (`title`, `hub`, `map1`, `map2`, `event`, `shop`, `rest`, `combat1`, `combat2`, `elite`) with modern dark cyberpunk synthwave & electronic (removing traditional Korean instruments); expanded enemies `29 → 41` (+6 normal, +3 elites, +3 bosses: `baekho_stalker`, `hyeonmu_bastion`, `architect_omega` with full taunts & boss art), encounters `39 → 54`, map rows `7 → 8` (`9` floors/act, `27` floors/run), cards `96 → 104` (+8), and narrative events `70 → 79` (+9). `make check` (`node --test` 363/363, Python 338/338) + `make test-e2e-v2` green.
- **English GM eval & hedging (`scripts/dev/gm_eval.py`, `src/mythos_v2/gm.py`, `npc.py`, `llm.py`)**: expanded English eval slice to 13 cases; tightened `_ACT_SENSORY`, `improvised_block` and `deceive` keywords; isolated `GeminiTextLLM` `AuthorizedSession` per worker thread, capped per-leg HTTP timeout at `12 s`, and added a 3rd recovery retry on ≥ 10 s budgets (`tests/test_v2_llm_usage.py`). Local `gemma4:8b-64k` (`20261025-062735-…-en.json`): 13 × 2, usable **100 %**, p50 **0.58 s**, p95 **1.08 s**. Vertex `gemini-3.8-flash` (`20261025-073803-…-en.json`): **13/13** cases verified (`0 %` cleaner rejections on non-500/504 responses; 5 calls rescued by the 3rd recovery attempt).
- **English prose pass, shop/rest art parity & phone-width combat (`375–412 px`)**: polished English register across `ixMirror.ts`, `statVoices.ts`, `ix.ts`, `eventsArcs.ts` and `eventsMore.ts` (`make test-v2` 355/355). `ShopScreen.tsx` and `RestScreen.tsx` render per-act 2.0 WebP art (`art.test.ts`). `combat/screen/layout.ts` + `combat/phone.css` raise `375×667` board tiles from `41px` to `50px` (`390×844` `53px`, `412×915` `57px`, `44px` touch targets, 0 overflow). Verified full English Signal+ UI playthrough + screen tour (`PLAYTHROUGH_LANG=en scripts/dev/ui_playthrough.py --signal-plus`: 6 nodes incl. CRPG district/dialogue + shop/rest/treasure/final-choice/ending, 109 s, 3 terrain kills, 0 errors).
- **Act 1 early encounters (`a1_n1_*` in `encounters.ts`)**: added hazard/void opportunities to `a1_n1_dodge` (`envKills/fight` `0.17 → 0.69`), `a1_n1_overpass` (`0.75 → 1.00`, bonus `14 % → 31 %`), and `a1_n1_cover`. 3 × 360 `mixed` / 120 `greedy` / 60 `basic` seeds: greedy **95.0 %**, mixed **30.9 %**, basic **0 %**.
- **Showcase video, Devpost kit, blog/CFP & bilingual `README.md` (`scripts/trailer/`, `docs/contest/`, `README.md`)**: `record_trailer.py --lang en` → `outputs/trailer/ai/mythos2_ai_features_en.mp4` (`55.6 s`); `cinematic.py build --cut showcase` → `outputs/trailer/cinematic/mythos2_cinematic_showcase.mp4` (`82.0 s`: gameplay + 4 AI features + 8 s Google Cloud architecture card, 0 cloud calls). Wrote `docs/contest/devpost-en.md`, `docs/contest/blog-and-cfp-en.md` (technical blog post + Sessionize CFP), refreshed `docs/contest/pitch-en.md`, and upgraded root `README.md` with the English architecture diagram and guide.
- **5-Stat Combat (`STR/AGI/INT/CHA/OBS`), Evade/Crit, 3-DoT (`burn`/`bleed`/`corrode`) & Replayability (`docs/plans/2026-10-25-combat-stats-dot-replayability-plan.md`)**: wired all 5 stats into combat (`STR` attack/bump bonus, `AGI` opening/sprint `evade` + move range, `INT` DoT bonus + Turn 1 draw, `CHA` companion opening block + 1st companion card energy refund, `OBS` `focus` buildup/crit & mark bonus); added `bleed` (movement/push/pull tick) and `corrode` (armor strip + death contagion); added 6 cards (`artery_rip`, `crimson_hook`, `corrosive_rain`, `pandemic_pulse`, `phantom_feint`, `vital_snipe`), 4 implants (`serrated_wire`, `acid_injector`, `reflex_gyro`, `hawkeye_lens`), 4 tactical mutators (`acid_rain`, `magnetic_storm`, `overclocked_grid`, `bounty_hunters`), and World Echoes (`worldEchoFor`). `make check` green (`node --test` 362/362).

## 2026-10-24 — Promoted `00142-neh` (owner: "미리보기 + 검증 후 승격")

- `make deploy-preview` → `make verify-preview` 5/5 (label `git-sha=4a3e65b` = HEAD) → headless muted preview check (en-US phone, `?hud=1`: English, HUD, HP 34/34, 0 errors) → `update-traffic --to-latest` → service URL 4/4 + the same check, demo-code narrate `source: llm`. Rollback `00140-paw`.

## 2026-10-24 — Browser-language default for new players (owner OK)

- `store.ts` `deviceLang()` + `lang.ts` `firstVisitLang()` (tested). Headless: fresh en-US → en, reload mid-run → still en, legacy device (run + id, en-US) → ko, fresh ko-KR → ko; 0 errors. `e2e_v2.py`, `ui_playthrough.py`, `record_trailer.py` pin `ko-KR`.
- Verified: `make check`, `make test-e2e-v2`, `make playthrough-quick` (122 s) green.

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

Older entries (2026-10-18 … 10-20): `bin/docs/archive/progress-2026-10-20-showcase-prep.md`.
