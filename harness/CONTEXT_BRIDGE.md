# Agent Context Bridge

The root handoff harness for passing work context between agents. The source of truth for detailed state is `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, `docs/NEXT_PLAN.md`; this file stays a hyper-compressed handoff that lets the next worker orient immediately.

## Active Context

- **Project state**: Mythos 2.0 (세계:접속 — "Signal Run") is the only game on `main`: a browser tactics deck-builder roguelite (pure-TS engine in `src/mythos_ui/src/v2`) with an AI GM off the critical path (`src/mythos_v2`: narrate, improvise, companion chat, IX comms). The 1.x AI-narrated loop runtime is archived on branch `1.0` (2026-10-11).
- **Play path**: `make api` → `http://127.0.0.1:8000` (SPA + `/api/v2`); dev UI `cd src/mythos_ui && npx vite`. Android: Capacitor app in `src/mythos_ui/android` (`docs/android.md`).
- **Verification baseline**: `make check` (skills, doc budget, ruff/eslint, mypy, tsc/vite, `node --test src/v2` 362, Python unittest 338) + `make test-e2e-v2` (headless, muted). Balance via `simulateRun` (P0 2026-10-25, maxHp 34/32/36 + `a1_n1_*` hazard/void polish: greedy ≈ 95 % · mixed ≈ 31 % · basic 0 %; `gameplay-qa` `qa-routes.md`).
- **Doc entry point**: `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md`. Rules in `docs/GAMEPLAY.md`; design contract `docs/plans/2026-10-10-mythos-2.0.md`.

## Current Handover

1. **Live in production (`00146-cuf` / `88143d0`, promoted 2026-10-25; rollback `00144-haw`)**: Waves 1–4, W0–W3 global showcase kit, and 5-stat combat (`STR/AGI/INT/CHA/OBS` + Evade/Crit + 3-DoT `burn`/`bleed`/`corrode` + Replayability Waves 1–4) — `✦ AI` mark & source preservation, Improvise ideas, HP 34/32/36 + `a1_n1_*` hazard/void angles, Architect HUD `?hud=1`, `?lang=` + browser-language default, 13-case English GM eval (Ollama & Vertex) + `GeminiTextLLM` thread-local session & 3rd recovery retry, English prose pass, per-act shop/rest 2.0 WebP art parity, phone combat density (`375–412 px`, `tw: 50–57`), named RNG streams (`engine/streams.ts`), replay-verified daily leaderboard (`ui/replay/`, `mythos_v2/replay.py`), and contest demo codes (`MYTHOS_DEMO_CODES`, `?demo=<code>`).
2. **Next up (`docs/NEXT_PLAN.md` & `docs/plans/2026-10-24-global-showcase-2026.md`)**: All agent-actionable engineering, content, video (`outputs/trailer/cinematic/mythos2_cinematic_showcase.mp4`, `outputs/trailer/ai/mythos2_ai_features_en.mp4`), documentation (`docs/contest/architecture-en.md`, `devpost-en.md`, `pitch-en.md`, `README.md`), and Cloud Run deployment items are complete. Remaining items are `[owner]` / `[hold]` only (owner feel check `docs/test/mythos2_fun_check.md`, public-repo decision, and contest submission when announced). Paid Play release and Signal+ remain on hold (`docs/DECISIONS.md`).
3. **Testing & Cost rules**: always muted (`?mute=1`), at most one browser tab, prefer headless Playwright. **Never call Vertex Veo API** (blocked in `scripts/trailer/gen_veo.py`); new images use Codex image only.
4. **AI GM**: local Ollama `gemma4:8b-64k` (`.env` default `gemma4:latest` is not installed); cloud = Vertex `gemini-3.8-flash` (`.env` `MODEL`, passed by `make deploy*`). Authored pools exist on both sides (`talk.py` ↔ `ui/shell/talkLines.ts`, kept in sync by a test).

## Open Risks

- Saves are client-trusted (single-player, no competitive stakes); the server stores blobs only.
- Mixed-bot win rate varies ±6 % by seed block — compare balance A/B on identical blocks.
- The overnight harness's held-out task bank and Dev Graph experiments targeted 1.x and stay on branch `1.0`; new unattended seeds must be written against the 2.0 tree.
