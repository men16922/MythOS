# Project MythOS Status

Last updated: 2026-07-08

## Current Baseline

Project MythOS is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- **Shared runtime/UI**: `RuntimeSessionService` is the single orchestration boundary for FastAPI REST/WS, React/Vite, Streamlit, and CLI.
- **Persistence/infra**: PostgreSQL is authoritative; MinIO/GCS store assets; OTel/Jaeger/Cloud Trace cover observability. Redis was removed 2026-07-04, so images generate synchronously in-request.
- **Narrative**: local development uses Ollama 8B storyteller + 3B parser with repair/fallback; the cloud product uses Vertex Gemini controlled generation. Prompt directives, Story Bible snippets, deterministic session synopsis, shard rollup, and outcome metrics are integrated.
- **Cloud model operations**: rev `00025-856` runs full `gemini-3.5-flash` + prompt diet (~$1.0/loop) + the 07-05 fix/feature batch (GCS presign IAM signBlob, simulator gating, save overwrite/delete, companion-equip UI, item toast). Optional `GEMINI_MODEL_KEYBEAT` routing implemented but **not enabled**.
- **Visuals**: local mflux/FLUX + Redux and cloud Imagen share the provider/storage boundary; curated scene/cutscene/ending art and synchronous generation are active.
- **Gameplay**: deterministic tactical combat, direct party control, companion growth/equipment, enemy intents, skills/items, combat cinema, rewards, boons, market/recovery, and IX boss flow are implemented.
- **Scenario/progression**: Neo-Seoul is the primary long-form scenario; route-node DAG + multi-perspective anchors + session memory, Story Bible, Codex, Run History, achievements, meta progression, save/load, and ending resolver are implemented. Glass Library is parity-ready but held.
- **Localization/CBT**: EN-default/KO bilingual UI+API+prompts, invite-gated stable identity, loop caps, Save/Load UX, and the Cloud Run closed beta are live.
- **Agent operations**: `make check`, content invariants, three-engine overnight lanes, semantic critic, AGY browser QA, and resume-pointer docs workflow are active.

Latest verified baseline:

- `make check` **862 green** + `make validate-content` clean (re-verified 2026-07-06 at `d661f44`).
- **Overnight lanes drained 2026-07-06 PM**: opening variant art ×6 (codex regen `d661f44`; agy draft superseded — user directive: curated key art = codex), skill icons ×10 + SFX ×4 (`b095446`), live-QA ×2 PASS_CANDIDATE (P1-A onboarding/combat screens + KO placeholder). All P1 `[auto:*]` items closed; remaining P1 work is `[manual]` only.
- **CBT P1 CODE TRACK COMPLETE 2026-07-05** (`9226005..08f764f`, 19 slices, not yet deployed): A onboarding (telegraph/tutorial/disclosure) · B replay variety (meet-arc slot/6 opening variants/loop modifiers) · C density (join signal/no-op guard/G3 cues/board/cover) · D+E identity (stun/signatures ×6/IX 전용기+텔레그래프) · E narrative arc (G1 막+setup 원장/G2 반전 뱅크/G4 루프 후킹) + maintenance pair (postgres retry, placeholder i18n).
- Cloud Run rev **`00025-856`**: presign hotfix + simulator gating + save overwrite/delete + dashboard admin rows + companion-equip UI overhaul + item-gain toast + dev-console link fix, live; `mythos-d1b0da3e` admin/cap-exempt (user-directed). Voice audition kit delivered (48 samples: KO natives / EN premades).
- Three AGY objective runs passed save/load restore, route pairing+horizon refresh, choice idempotency, support targeting, loot persistence, and equip/unequip. Remaining gate is human play feel.
- Completed detail is compressed in `docs/COMPLETED_SUMMARY.md` M35-M56; latest increments and exact measurements remain in `docs/PROGRESS_LOG.md` and dated plans.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

Direction remains global-first EN/KO closed beta: Gemini/Vertex is the product path; Ollama/FLUX remains the local development path. Deployment/onboarding/localization history is in `docs/COMPLETED_SUMMARY.md` M50 and M56.

1. **Auto tracks all drained (07-08)** — variant-routed opening S1-S4 (loop branches by variant end-to-end: anchor skin + goals + turn 0-3 directive windows KO/EN) + P1.5 clarity T1-T4a (identity-swap fix, WS responsiveness, fork-mirror contract, plain copy, axis affordances) + variant intro shot 03. `make check` **916** green; 2 AGY QA PASS (`20260708-062258/063004-manual`). Design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`.
2. **T5/T6 RESOLVED 2026-07-08 (owner: mobile-inclusive P0)** — reframed mobile-first + new Track M (mobile foundation: `100dvh`, phone font/tap breakpoint, hover-`title=`→tap tooltip incl. the shipped T4a axis chip) is now the prerequisite. `[auto:claude]` slices M1-3/T6a-c/T5a-c queued in `NEXT_PLAN.md`; design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md` "Decision 2026-07-08". This unblocks the overnight claude lane. Remaining `[manual]`: copy tone + play-feel (owner, local).
3. **Human lane**: S4/T4 copy tone verdict, in-game 2회차 feel run (local `make api-cloud`), G2 twist tone (`twist_bank`), deploy new bundle + sign-off (`docs/test/neo_seoul_live_qa.md`) + Audrey EN retest, voice-id pinning, `git push` (ahead ~28), ally-writeback triage.
4. **Post-sign-off model experiment**: 2.5-normal/3.5-key-beat hybrid A/B; record keep/rollback verdict.
4. **Maintenance/hold**: WS4 content pipeline plan-only; Glass Library waits for Neo-Seoul satisfaction; teaser #2 deferred (uncut-single-turn or post-P1 montage).

## Open Risks

- **push workflow (ongoing)**: private-repo push is a hard-block by the safety classifier so the agent cannot do it → user pushes directly (men16922's own account). Origin last pushed `a1e3b81` (07-06 night); ~28 commits since (S4 + P1.5 + overnight) await human push.
- **P1.5 T5/T6 UNBLOCKED 2026-07-08** (owner decided mobile-inclusive P0) — `[auto:claude]` slices (Track M + T6 concise-mode + T5 board) now queued in `NEXT_PLAN.md`. New watch: the UI was never phone-tested — mobile is UX-degraded (9–11px fonts, `100vh` chrome-overlap, ~20 hover-only `title=` tooltips dead on touch incl. the shipped T4a axis chip, sub-44px tap targets), not structurally broken. Track M addresses it.
- **agy browser attach flaky (new 2026-07-06)**: the live-QA actor intermittently fails to acquire any browser tool and hangs silently — nested-in-agy runs burned 3 iterations; even direct runs failed 21:18+/21:41 after succeeding 20:20/20:23 (suspect Antigravity IDE/browser state). Mitigations landed: gtimeout hard ceiling + verdict-rescue in `run-agy.sh` (`6f61d9a`) so failures now record NEEDS_HUMAN instead of burning 30 min. Practice: run live-QA direct from a supervising session; if attach fails twice, hand the item to human.
- **3.5-flash cost watch (mitigated 2026-07-05)**: prompt diet cut input −25% → ~$1.0/loop full-3.5. The env-only hybrid (~$0.5) is implemented but remains disabled until the planned post-sign-off A/B.
- **WS idle drop (~45s) — MITIGATED 07-08 (T2)**: was the root of the tester "3-click" complaint. Fixed by 20s keepalive ping/pong + optimistic choice pending + one-shot reconnect-resend (`2a27e7b`); AGY QA confirmed single-click advance even with the socket force-closed. Watch only if slow image turns still stall.
- **ally-writeback promotion (open triage)**: `_finish_party_state` promotes any co-fighting AI ally into the permanent party — intended-vs-bug human call pending. (Simulator gating shipped 07-05 closed its main entry path; pre-existing simulator loops still occupy tester caps, e.g. `d1b0da3e` 5/10 — DB cleanup only on request.)
- DB hygiene (low): `narrative_shards` raw rows retained post-rollup; run summaries/save slots/metrics are JSONB memory records — prune/dedicated tables only if size or query load bites.
- Some detailed plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, and `PROGRESS_LOG.md` for current truth.
- Combat image quality varies widely per character. Prefer an action-sheet-based pipeline over independent pose generation.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`
