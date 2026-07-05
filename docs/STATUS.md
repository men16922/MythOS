# Project MythOS Status

Last updated: 2026-07-05

## Current Baseline

Project MythOS is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- **Shared runtime/UI**: `RuntimeSessionService` is the single orchestration boundary for FastAPI REST/WS, React/Vite, Streamlit, and CLI.
- **Persistence/infra**: PostgreSQL is authoritative; MinIO/GCS store assets; OTel/Jaeger/Cloud Trace cover observability. Redis was removed 2026-07-04, so images generate synchronously in-request.
- **Narrative**: local development uses Ollama 8B storyteller + 3B parser with repair/fallback; the cloud product uses Vertex Gemini controlled generation. Prompt directives, Story Bible snippets, deterministic session synopsis, shard rollup, and outcome metrics are integrated.
- **Cloud model operations**: rev `00021-mxt` runs full `gemini-3.5-flash` + prompt diet (~$1.0/loop) + the 07-05 GCS presign hotfix (IAM signBlob; images/WS were structurally broken on cloud before it). Optional `GEMINI_MODEL_KEYBEAT` routing is implemented and live-probed but **not enabled**.
- **Visuals**: local mflux/FLUX + Redux and cloud Imagen share the provider/storage boundary; curated scene/cutscene/ending art and synchronous generation are active.
- **Gameplay**: deterministic tactical combat, direct party control, companion growth/equipment, enemy intents, skills/items, combat cinema, rewards, boons, market/recovery, and IX boss flow are implemented.
- **Scenario/progression**: Neo-Seoul is the primary long-form scenario; route-node DAG + multi-perspective anchors + session memory, Story Bible, Codex, Run History, achievements, meta progression, save/load, and ending resolver are implemented. Glass Library is parity-ready but held.
- **Localization/CBT**: EN-default/KO bilingual UI+API+prompts, invite-gated stable identity, loop caps, Save/Load UX, and the Cloud Run closed beta are live.
- **Agent operations**: `make check`, content invariants, three-engine overnight lanes, semantic critic, AGY browser QA, and resume-pointer docs workflow are active.

Latest verified baseline:

- `make check` **765 green** (incl. GCS presign IAM-fallback + WS visual-frame guard regressions).
- Cloud Run rev **`00021-mxt`**: full-3.5 + dieted prompt + presign hotfix live; `/assets/resolve` 500→200 re-measured on the previously failing asset; 0 signing failures in logs.
- Three AGY objective runs passed save/load restore, route pairing+horizon refresh, choice idempotency, support targeting, loot persistence, and equip/unequip. Remaining gate is human play feel.
- Completed detail is compressed in `docs/COMPLETED_SUMMARY.md` M35-M56; latest increments and exact measurements remain in `docs/PROGRESS_LOG.md` and dated plans.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

Direction remains global-first EN/KO closed beta: Gemini/Vertex is the product path; Ollama/FLUX remains the local development path. Deployment/onboarding/localization history is in `docs/COMPLETED_SUMMARY.md` M50 and M56.

1. **Human live sign-off**: fresh-loop 3.5 prose verdict + Audrey EN coherence retest using `docs/test/neo_seoul_live_qa.md`; authenticated production turn; human `git push`.
2. **Post-sign-off model experiment**: enable the planned 2.5-normal/3.5-key-beat hybrid, verify routing and compare full-loop quality, latency, errors, and cost; record keep/rollback verdict.
3. **CBT onboarding P1**: combat-entry telegraph, first-combat tutorial, and progressive first-loop disclosure after a design snapshot.
4. **Human triage**: decide ally writeback semantics and whether the boot-screen combat simulator becomes admin/dev-only.
5. **Maintenance/hold**: WS4 content pipeline remains plan-only; Glass Library expansion waits for Neo-Seoul satisfaction sign-off.

## Open Risks

- **push workflow (ongoing)**: private-repo push is a hard-block by the safety classifier so the agent cannot do it → user pushes directly (men16922's own account). Unpushed commits now include the presign hotfix (source). Cloud Run rev `00021-mxt` (2026-07-05) serves the working tree incl. that fix.
- **3.5-flash cost watch (mitigated 2026-07-05)**: prompt diet cut input −25% → ~$1.0/loop full-3.5. The env-only hybrid (~$0.5) is implemented but remains disabled until the planned post-sign-off A/B.
- **WS idle drop (~45s)**: observed during live repro — the socket died during a long idle wait between frames. Harmless for normal play (frames flow continuously) but could matter for slow image turns; watch during live QA.
- **combat simulator ungated in CBT (new, 2026-07-05)**: boot-screen simulator creates real loops → burns the tester loop cap (10) and adds boot-screen density (Audrey #4). Human decision queued in NEXT_PLAN; related: `_finish_party_state` promotes any co-fighting AI ally into the permanent party.
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
