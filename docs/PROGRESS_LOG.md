# Progress Log

Last updated: 2026-06-27

This file keeps **only the latest incremental summaries** (latest 5 items). The long 2026-06 detailed log (including per-stage route-node session detail) is in
`bin/docs/archive/progress-2026-06.md`, the 2026-05 log in `bin/docs/archive/progress-2026-05.md`.

## 2026-06-27 — EN/KO S0: language plumbing (code, make check green)
- Status: Completed. Target output language threads end-to-end to the Narrative Director; behavior-preserving (default `ko`, EN content in S1).
- Changed: `schemas.py` `NarrativeContext.language` field; `options.py` `RuntimeOptions.language`; `scenario_context.build_runtime_narrative_context(language=...)` → context; `session.py` passes `options.language` at the 2 build sites; `prompts.py` `_story_system_prompt(context)` seam replaces the hardcoded `STORY_SYSTEM_PROMPT` inject (fixes §7.1 dual-model non-context-aware finding). NEW `tests/test_language_plumbing.py` (6).
- Verified: `make check` green — mypy/lint/tsc-vite + **526 tests OK** (skipped 2). Default `ko` preserves current Korean output (EN prompts/content land in S1).
- Blockers: none. Deferred to S1: API/UI language selector + loop/player state persistence + default flip to `en`.
- Next: **S1 영어 생성** — EN system prompt + `JSON_CONTRACT_EN` + `DEFAULT_FALLBACK_BY_LANG["en"]`, flip default to `en`.

## 2026-06-27 — EN/KO prerequisite: stable archetype-id migration (code, make check green)
- Status: Completed. Combat/progression joins moved off Korean display names to stable ids — unblocks EN/KO bulk i18n.
- Changed:
  - Data: `resources/{neo-seoul,glass-library}/scenario.json` — archetypes/characters gain stable `id`; `combat.archetype_loadout`/`archetype_base_skills` rekeyed to ids (id-only).
  - Resolver: `scenario_context.py` `resolve_archetype_id()` + `apply_archetype_traits()` accepts id-or-name, stores `archetype_id` (joins) and canonicalizes `archetype` to display name (so `{archetype}` prompt/UI unchanged).
  - Consumers: `progression.py` (`DEFAULT_ARCHETYPE='ghost'`, `_ARCHETYPE_ALIASES` read-time normalize, unlocked_archetypes as ids), `session.py` (`_resolved_archetype` → 4 join sites), `app.py` (expose id + unlock test by id).
  - Clients: `types.ts`/`OnboardingPanel.tsx`/`streamlit_app.py` send id, display name as label.
  - Tests: 6 fixtures retargeted to ids + NEW `tests/test_archetype_id_migration.py` (8 back-compat tests). Also fixed a pre-existing overnight lint red in `scratch/test_lsp_semantic.py`.
- Verified: `make check` green — ruff/eslint, mypy 125 files, tsc/vite build, **520 tests OK** (skipped 2). **No DB migration** (traits + unlocked_archetypes are JSONB; legacy Korean-name saves normalized read-time). Design+verification: `docs/plans/2026-06-27-en-ko-localization.md` §7.
- Blockers: none (prereq risk closed).
- Next: EN/KO S0 — language plumbing (`NarrativeContext.language` + lang ContextVar, default `en`).

## 2026-06-27 — Strategy pivot: global-first EN/KO + GCP closed-beta feedback (planning, no code)
- Status: Planning/design only — no code. Direction set + decision-locked (DECISIONS +2).
- Changed:
  - NEW `docs/plans/2026-06-27-en-ko-localization.md` — EN/KO full-bilingual (English default), **SIDECAR** scenario localization (`i18n/{en,ko}/<section>.json`, lang ContextVar), golden-path-first slices S0–S5, parity-gate invariant. §7 = 10-agent design-lock results.
  - NEW `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md` (replaces removed `LOCAL_VERSION_FEEDBACK_STRATEGY.md`) — validate core loop via GCP closed beta + **r/playtesters** (not video); r/aigamedev = results/architecture sharing; "fully local" framing dropped; final launch sequence.
  - `docs/NEXT_PLAN.md` Post-local track rewritten to the new sequence (net-0). 10-agent design-lock workflow re-verified the surface: original map underestimated **~3–5×** (Korean ~40KB+ / **2** scenarios incl. glass-library; UI 32 files/476 lines incl. hooks; combat-package Korean). Model: EN dev = qwen3:8b `think:false`; product = Gemini/Vertex. Local stack up for live-QA (infra+worker+API :8000).
- Verified: `check-doc-budget` (planning only — no code/tests); no dangling refs to the removed doc.
- Blockers: prerequisite — **join-key ID migration** (Korean display names used as combat join keys) must precede bulk i18n extraction.
- Next: local gate = neo-seoul live-QA A·F sign-off; then join-key ID migration → S0 lang plumbing.

## 2026-06-26 — plan: cloud transition + career-leverage strategy (deferred, low priority)
- Status: Planning only — no code. Direction set + recorded.
- Changed:
  - NEW `docs/cloud/CAREER_STRATEGY.md` — goal=Google Cloud 이직(이상)/GDE; assets=game + overnight harness(차별점); Vertex-as-hero (controlled generation → drop 3b parser, context caching, Imagen, Cloud Trace); role doors (DevRel/CE-AI/GDE); reputation engine (blog/Show HN/GDG Seoul); sequence (wedge `VertexGeminiJSONProvider` → deploy → publish).
  - `docs/cloud/GCP_PLAN.md` — pre-existing (2026-06-21, other agent); now cross-linked from CAREER_STRATEGY.
  - `docs/NEXT_PLAN.md` — added "## Deferred (low priority) — Cloud 전환 & 커리어" gated on **local completion (Neo-Seoul playability)**; compressed glass-library (2→1 line) + AGY-findings (2→1 line) to stay within the 120-line cap.
  - Verified seams support the plan: `JSONProvider` (`director.py:36`), `VisualProvider`/`StorageAdapter` (`visual_service.py:54/59`), `MythOSStore` ABC (`store.py:24`) — adapters-only swap, core unchanged.
- Verified: `bash harness/check-doc-budget.sh` green (all entry docs within budget; NEXT_PLAN 120/120).
- Blockers: none. XPRIZE "Build with Gemini" excluded — it requires a real revenue business + impact category in 90d (no game/entertainment fit), mismatched with the 이직/평판 goal.
- Next: local completion gate = Neo-Seoul `[manual]` live-QA sign-off (A 종료 서사 + F 전투 직후 콜백, `docs/test/neo_seoul_live_qa.md`); cloud work begins only after.

## 2026-06-21 (v) — consolidate Gemini/AGY instructions and register Serena MCP
- Status: Completed.
- Changed:
  - Updated `GEMINI.md` to incorporate Antigravity (AGY) specific instructions, run commands, and sandbox configurations.
  - Deleted redundant `AGY.md` file from the repository root.
  - Adjusted agent guidelines in `AGENTS.md` to point only to `CLAUDE.md` and `GEMINI.md` as agent entry points.
  - Staged Serena MCP server launch configuration inside the client's global `/Users/men1692/.gemini/config/mcp_config.json` using the corrected `serena start-mcp-server` command structure with `--project-from-cwd` detection, `DEBUG` logging, and LSP communication tracing enabled.
- Verified:
  - Confirmed deletion of `AGY.md` and updates to `GEMINI.md` / `AGENTS.md` / `mcp_config.json`.
  - Ran `make check-skills` to ensure the overnight harness skills remain synchronized without drift.
- Blockers: None.
- Next: Proceed with other priorities listed in NEXT_PLAN.md.

## 2026-06-21 (u) — configure Serena MCP to use LSP for Python and TypeScript
- Status: Completed. Serena MCP is now configured to utilize SolidLSP/LSP instead of falling back to grep.
- Changed:
  - Created `.serena/project.yml` at the repository root to declare standard language backend and configurations for Python (pyright) and TypeScript (vtsls / typescript), using the primary language `python` to satisfy SolidLSP's Language enum bounds.
  - Modified `CLAUDE.md` and `harness/CORE_MANDATES.md` to update code navigation guidelines: Serena MCP/Gemini agent now uses LSP-first navigation, and Gemini was removed from the grep-only lanes list.
- Verified:
  - Checked `.serena/project.yml` file creation.
  - Ran `make check-doc-budget` and `make check` to verify lint, types, build, and all 512 tests passed successfully.
- Blockers: None.
- Next: Proceed with other priorities listed in NEXT_PLAN.md.

## 2026-06-21 (t) — overnight [auto:claude]: extract useSceneVisuals hook from App.tsx
- Status: Behavior-preserving frontend god-component decomposition, slice 6. The scene-image / visual-status concern moved out of App.tsx into a hook, matching the `useGameSocket`·`useCombatCinemaQueue`·`useTypewriter` pattern.
- Changed: NEW `src/mythos_ui/src/hooks/useSceneVisuals.ts` — owns `sceneImageUrl`/`imagePlaceholderText` state + `visualTimeoutRef` (worker watchdog) + `clearVisualTimeout` (memoized via `useCallback` for stable identity) + `onVisualStatus` (drains a `visual_status` WS frame: pending/processing → placeholder + 90s timeout, succeeded → URL, else fail) + `resolveImage` (resolves a succeeded asset's `storage_uri` → presigned URL). Takes `logToConsole`, returns the state + setters + the three functions. `App.tsx`: removed the inline state/ref block + the three function defs (~50 lines); dropped the now-unused `apiResolveAsset` import and `AssetInfo` type import (both moved into the hook); added `clearVisualTimeout`+`setImagePlaceholderText` to `sendChoose`'s useCallback dep array (now hook-sourced). App.tsx 1102→1069 lines. No logic change.
- Verified: `make check` green — ruff + eslint (0 warnings) + mypy (124 files) + tsc/vite-build + **512 tests OK** (skipped 2); doc-budget + skills mirror checks pass. Pure extraction; no test-count change (FE has no unit-test runner; gate guarantees compile/type/lint only).
- Blockers: none. Post-commit AGY live-QA (auto-screened, §3.4.1) is the runner's job; not run in this iteration.
- Next: continue App.tsx/CombatCinema decomposition one slice per iteration (onboarding/session-lifecycle handlers `handleStartGame`/`handleResumeGame`/`handleSimulateCombat` are the next candidate).
