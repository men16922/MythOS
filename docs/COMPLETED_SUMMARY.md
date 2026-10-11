# Completed Summary

최종 갱신: 2026-10-11

완료된 milestone의 압축 요약. 최신 짧은 로그는 `PROGRESS_LOG.md`에 있다.

## M0–M90 — Mythos 1.x (2026-05 … 2026-09) — archived

The AI-narrated loop TRPG: Python runtime (loop engine, Narrative Director on Ollama/Gemini, PostgreSQL memory, FLUX/Imagen visuals), React SPA + Streamlit + CLI, tactical combat, CBT on Cloud Run (`00090`), the overnight agent harness and Dev Graph experiments. Full milestone table, verification records and plans are on branch **`1.0`** (`docs/COMPLETED_SUMMARY.md` there).

## M93 — 2.0 residuals closed: boss narration, sharper IX, daily seed, phone combat, Act 3 burst (2026-10-11)

- **Purpose**: owner "잔여 작업 전부 수행해" — every open item from M92 plus the no-owner-call candidates from NEXT_PLAN.
- **Output**: `BossNarration` (GM card on boss entrance/phases); IX prompt rewrite + event-opening brief; `ttl`/`cover` engine events; talk-pool sync test; 3 Act 3 burst cards (art); daily-seed mode (`engine/daily.ts`, title/setup/archive, history tags); phone-width combat layout + touch inspector; side-column placement for IX/boss overlays.
- **Evidence**: v2 + Python gates green (see commit); card overflow 0/101; Vertex + local gemma4 samples; sim P0 greedy 100 % / mixed ≈ 35 % / basic 0 % (P5 78 / 3).
- **Open (owner only)**: listen-test of SFX, ship/deploy decision (incl. Cloud Run smoke of `/api/v2`), `git push`.

## M92 — 2.0 feedback round: battlefield effects, sound, companion identity, AI presence, visible save (2026-10-11)

- **Purpose**: owner's first-session feedback on 2.0 ("feel is good"): AoE/wall impact, weak sound, invisible DoT/passives, character cards, natural Korean, visible save, the LLM conversation back.
- **Output**: ground layer (burning / live tiles) + board FX by element, wall slams, punchier SFX bus; companion combat passives + 12 companion reward cards (art) + weighted rewards; safehouse companion chat, GM narration card, IX combat comms (`/api/v2/gm/talk`); pause menu + autosave indicator + Continue detail; Korean pass across content/UI.
- **Evidence**: `node --test src/v2` 161 pass; `test_v2_*.py` 103 pass; ruff/mypy-strict/tsc/eslint clean; sim P0 greedy 93 % / mixed 38 % / basic 0 % (P5 83 / 6); headless save/continue check; FX loudness measured offline (no audible playback).
- **Open**: owner listen-test of the new SFX; boss narration has no UI call site (only IX comms); IX LLM lines are generic vs authored.

## M91 — Mythos 2.0 "Signal Run" built overnight (2026-10-10..11, branch `mythos-2.0`)

- **Purpose**: owner mandate — fun D → S, rebuild anything by morning. Replaced the LLM-gated narrative loop with a client-side tactical deck-building roguelite; AI GM moved off the critical path (DECISIONS 2026-10-10).
- **Output**: TS engine (`v2/engine`: telegraph combat incl. track lock-ons, push/bump/void/friendly fire, enemy AI, triggers, bonus objectives; StS map, events + bounded Improvise, shop/rest/treasure, endings, Archive meta, Paradox 1–5; greedy/mixed/basic bots + run sim), content (89 cards, 27 enemies, 37 encounters, 44 implants, 38 events, 23 lore, 20 unlocks), UI (shell + juicy combat board, procedural SFX, looped music, coach marks), `/api/v2` saves + GM, ~33 MB generated assets (Gemini image, Lyria, Codex sprites). Classic kept at `/?classic=1`.
- **Evidence**: `node --test src/v2` 138 pass; `make test` pass; `test-e2e` (classic) + `test-e2e-v2` pass; sim P0 greedy 93 % / mixed 52 % / basic 0 % (P5 92 / 11); three muted agent playtests (the last through IX → ending → Archive) with fixes.
- **Open**: owner first-play grade, ship decision, push.

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.
