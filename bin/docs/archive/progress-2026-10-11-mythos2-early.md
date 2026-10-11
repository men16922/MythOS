# Progress log — archived 2026-10-11

Moved out of docs/PROGRESS_LOG.md by the doc budget (oldest entries first).

## 2026-10-11 — 2.0 residuals: boss narration, sharper IX, daily seed, phone combat, Act 3 burst cards

- Owner: "잔여 작업 전부 수행해". Closed every open item from the feedback round plus the post-verdict candidates that need no owner call.
- **AI**: boss entrance/phase narration (`BossNarration.tsx`, GM card over combat; authored first, one LLM swap); IX prompt sharpened (concrete subject + ruling, ≤ 60 자, no place boilerplate) — local gemma4 and Vertex `gemini-3.5-flash` samples now name the unit/companion and end on a verdict; separate event-opening brief (`gm.is_event_opening`); client/server authored-pool sync test (caught one drifted apostrophe); IX comms + boss card moved to the side columns on wide screens (no longer over the back row).
- **Engine**: `ttl` / `cover` events (live-wire countdown, chipped cover) replace animator guesswork; 3 burst cards vs Act 3 armor (`armor_breaker`, `execution_protocol`, `overcharge_lance`; art) — Act 3 elite fights 9.0 → 7.7 turns (greedy), careless-bot rate unchanged within seed noise.
- **Daily seed** (`engine/daily.ts`): KST date × archetype seed, base pools/no threads/paradox 0, per-day best + attempts, title/setup/archive UI, history rows tagged; determinism tested across a fresh and a veteran profile.
- **Phone combat**: see the agent report folded into M93 (portrait/landscape, touch inspector).
- Verified: card text overflow 0/101 (base + upgraded); Vertex smoke of talk/narrate (0.9–2.2 s); sim P0 greedy 100 % · mixed ≈ 35 % (28–41 % by seed block, 360 runs) · basic 0 %; P5 78 / 3.

## 2026-10-11 — 2.0 feedback round: battlefield effects, punchier sound, companion identity, AI back in front, visible auto-save

- Owner played 2.0 ("feel is good") and asked for: AoE impact on the area itself, wall-bump impact, stronger sound, visible DoT/passives, stronger character cards, turn-to-target before casting, more natural/expressive Korean, a visible save/continue, and the LLM conversation back. All addressed (three parallel agents: combat FX + SFX, Korean writing pass, AI presence; lead: engine/content/save).
- **Engine**: ground layer (`ignite` → burning tiles, `electrify` → temporary live wire; burn floor ≥ 2, enemy-lit ground survives into the player's turn; AI avoids both), `area` / `fire` / `passive` events and `damage.cause` (burn/hazard/bump) for the board, `push.slam` (extra bump damage), area redirect/cancel, casters keep facing their target, companion combat passives (`combatPassive`, owner-only triggers), companion reward cards gated to the party + weighted rewards.
- **Content**: 12 new companion cards (2 each, Gemini art), fire/electric on 9 cards/items and 4 enemy types, companion card buffs; 101 cards. Korean pass over events/lore/acts/endings/IX/cards/enemies/UI (voice per character, '~한다' rules text, unified terms: 수호, 접속자, 은신처, 정예, 붕괴 구역, 전기 바닥).
- **Board/sound**: per-tile eruptions by element with scorch, flames/arcs on live tiles with turn badges, burning-unit flames, wall/cover/unit slams ("쾅!", hit-stop, cracks), turn-before-cast; SFX bus with its own punchier compressor + limiter (push +23 dB, burn +7, hits +4; stacked hits no longer clip: 1.34 → 0.98 peak), new cues explosion/ignite/zap/wall_slam/….
- **AI presence**: safehouse companion chat (LLM in voice, injection-hardened, authored fallbacks), GM narration card on events + act intros, IX comms in combat (7 triggers). `POST /api/v2/gm/talk`.
- **Save**: every action auto-saves (already true); now visible — HUD "자동 저장" pulse, pause menu in HUD + combat (save & quit / settings / abandon), Continue shows place + time. Headless check: turn 2 before quit = after Continue = after reload.
- Sim P0 (60 runs): greedy 93 % · mixed 38 % · basic 0 %; P5 83 / 6.
- Verified: `node --test src/v2` 161 pass, `test_v2_*.py` 103 pass, ruff/mypy-strict/tsc/eslint clean, `make check` (see commit), `make test-e2e-v2`.
