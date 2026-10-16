# Agent Context Bridge

The root handoff harness for passing work context between agents. The source of truth for detailed state is `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, `docs/NEXT_PLAN.md`; this file stays a hyper-compressed handoff that lets the next worker orient immediately.

## Active Context

- **Project state**: Mythos 2.0 (세계:접속 — "Signal Run") is the only game on `main`: a browser tactics deck-builder roguelite (pure-TS engine in `src/mythos_ui/src/v2`) with an AI GM off the critical path (`src/mythos_v2`: narrate, improvise, companion chat, IX comms). The 1.x AI-narrated loop runtime is archived on branch `1.0` (2026-10-11).
- **Play path**: `make api` → `http://127.0.0.1:8000` (SPA + `/api/v2`); dev UI `cd src/mythos_ui && npx vite`. Android: Capacitor app in `src/mythos_ui/android` (`docs/android.md`).
- **Verification baseline**: `make check` (skills, doc budget, ruff/eslint, mypy, tsc/vite, `node --test src/v2`, Python unittest) + `make test-e2e-v2` (headless, muted). Balance via `simulateRun` (P0: greedy 100 % · mixed ≈ 35 % · basic 0 %).
- **Doc entry point**: `docs/AGENT_BRIEF.md` → `docs/STATUS.md` → `docs/NEXT_PLAN.md`. Rules in `docs/GAMEPLAY.md`; design contract `docs/plans/2026-10-10-mythos-2.0.md`.

## Current Handover

1. **Owner calls pending**: SFX listen-test, deploy of 2.0 to Cloud Run (then smoke `/api/v2` + Vertex GM there), Play Console account + upload key for the Android app, `git push`.
2. **Testing rule**: always muted (`?mute=1`), at most one browser tab, prefer headless Playwright.
3. **AI GM**: local Ollama `gemma4:8b-64k` (the `.env` default `gemma4:latest` is not installed); cloud = Vertex `gemini-3.8-flash` (`.env` `MODEL`, passed by `make deploy*`). Authored pools exist on both sides (`talk.py` ↔ `ui/shell/talkLines.ts`, kept in sync by a test).

## Open Risks

- Saves are client-trusted (single-player, no competitive stakes); the server stores blobs only.
- Mixed-bot win rate varies ±6 % by seed block — compare balance A/B on identical blocks.
- The overnight harness's held-out task bank and Dev Graph experiments targeted 1.x and stay on branch `1.0`; new unattended seeds must be written against the 2.0 tree.
