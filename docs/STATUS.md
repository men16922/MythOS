# Project MythOS Status

Last updated: 2026-07-17

## Current Baseline

Project MythOS is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- **Shared runtime/UI**: `RuntimeSessionService` is the single orchestration boundary for FastAPI REST/WS, React/Vite, Streamlit, and CLI.
- **Persistence/infra**: PostgreSQL is authoritative; MinIO/GCS store assets; OTel/Jaeger/Cloud Trace cover observability. Redis was removed 2026-07-04, so images generate synchronously in-request.
- **Narrative**: local development uses Ollama 8B storyteller + 3B parser with repair/fallback; the cloud product uses Vertex Gemini controlled generation. Prompt directives, Story Bible snippets, deterministic session synopsis, shard rollup, and outcome metrics are integrated.
- **Cloud model operations**: narrative is **full `gemini-3.5-flash`** — the key-beat hybrid A/B verdict was **ROLLBACK 2026-07-17** (owner: normal-turn 2.5 prose quality drop; routing code/observability kept, `DECISIONS.md`). Image generation runs `gemini-2.5-flash-image` (serving `00071-gt9`) after the unavailable 3.1 alias caused live 404s.
- **Visuals**: local mflux/FLUX + Redux and cloud Gemini image share the provider/storage boundary; curated scene/cutscene/ending art and synchronous generation are active.
- **Gameplay**: deterministic tactical combat, direct party control, companion growth/equipment, enemy intents, skills/items, combat cinema, rewards, boons, market/recovery, and IX boss flow are implemented. The 2026-07-11..14 combat overhaul arc (telegraph→control→status→visuals→enemy roster→balance→portrait dock) is owner-QA-passed — `COMPLETED_SUMMARY.md` M59-M60.
- **Scenario/progression**: Neo-Seoul is the primary long-form scenario; route-node DAG + multi-perspective anchors + session memory, Story Bible, Codex, Run History, achievements, meta progression, save/load, and ending resolver are implemented. Glass Library is parity-ready but held.
- **Localization/CBT**: EN-default/KO bilingual UI+API+prompts, invite-gated stable identity, loop caps, Save/Load UX, and the Cloud Run closed beta are live. Teaser V2 published (YouTube, 2026-07-14).
- **Agent operations**: `make check`, content invariants, three-engine overnight lanes, semantic critic, AGY browser QA, and resume-pointer docs workflow are active. `$gameplay-qa` standardizes local combat verification: deterministic rules → non-fallback rendered evidence → manual feel verdict.

Latest verified baseline:

- **2026-07-15 (`make check` 1094; DEPLOYED `mythos-api-00068-76m`)** — live loop images failed with `404 NOT_FOUND` because `gemini-3.1-flash-image` was unavailable in this project/`us-central1` (not quota); a direct `gemini-2.5-flash-image` probe returned image bytes, so source/deploy defaults were pinned to 2.5 and deployed at 100% traffic. Watch the next real-loop asset record for app-path confirmation.
- **2026-07-14 session #20 (`make check` 1094; deploys `00064`→`00067`)** — key-beat hybrid env flipped + routing live-verified on `00066-blc` (key-beat 4/4 → 3.5, normal 1/1 → 2.5); 3.5 streaming whitespace-runaway silent fallback fixed (non-streaming retry + raw-evidence warning); **Neon idle-reap turn swallow fixed** (`456b522` pool checkout check + transaction pre-ping; probe 3/3 RECOVERED, `PostgresConnectionReapTest` locked) and deployed on `00067-x4d`. Protocol/rollback: `docs/plans/2026-07-14-keybeat-hybrid-ab.md`.
- **2026-07-14 session #19 (DEPLOYED `00060`→`00063`; owner QA PASS)** — enemy art 20/20 codex regen, telegraph/spawn-variety fixes, balance verdicts, two-tier slice 4 turn-order strip, portrait action dock. Compressed in `COMPLETED_SUMMARY.md` M60.
- Earlier per-session baselines (07-06..07-13 deploys `00044`→`00059`): `bin/docs/archive/progress-2026-07.md` + `COMPLETED_SUMMARY.md` M35-M60.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`. Direction remains global-first EN/KO closed beta: Gemini/Vertex is the product path; Ollama/FLUX remains the local development path.

1. **Owner live QA gate** (`docs/test/neo_seoul_live_qa.md`) — all agent lanes are drained; §1 A/B is DECIDED (rollback). Remaining owner-side: **§2 real-device portrait combat pass** (dock reachability / 38dvh / URL-bar / notch / turn-strip readability) · **§3 two-style playtest** (play-style consequence system balance). While playing: confirm the first real-loop image on `00071`, term-gloss chips (§8), and that idle errors no longer appear; hand loop ids to the agent for the golden eval bank.
2. **Remaining manual content checks** (CBT P1 residuals): S4 copy tone, 6 variant intros in-game feel, G2 twist tone, EN fresh-loop coherence retest.
3. **Maintenance/hold**: WS4 content pipeline plan-only; WS5 deprioritized; Glass Library held until Neo-Seoul satisfaction.

## Open Risks

- **Image provider recovered 2026-07-15**: `gemini-3.1-flash-image` returned `404 NOT_FOUND` (model not served in this project/`us-central1`) — a 2026-07-17 log audit shows it **never succeeded in prod** (zero successes 07-12..15; the remembered working images were `imagen-3.0` on 07-11). `gemini-2.5-flash-image` was directly verified and is the pinned default on `00068-76m`. Watch the next app-generated asset; 429 quota retry remains separately available. Residual: safety-filter empties on violent scene briefs — watch frequency. Lesson (DECISIONS 07-15 addendum): model swaps need one real generation probe before deploy.
- **3.5 whitespace runaway**: streaming controlled generation can emit trailing-whitespace runaway → JSON truncation; a same-model non-streaming retry is live (`b55e933`). Watch `streamed payload unparseable` warning frequency in prod logs.
- **Real-device portrait combat untested (standing gap)**: portrait action dock (`00063`) + turn-order strip (`00062`) are emulator-verified only — dock reachability, 38dvh height feel, URL-bar/notch, strip readability need a real phone (QA guide §2).
- **Play-style consequence system ON since 2026-07-10 — needs balance playtest**: `advance_route` axis tally → intent flag at threshold 2 turned on a previously dormant system; perspective/stability-tension/ending distribution will shift (intended). Owner: two loops in different styles, confirm divergence + balance (threshold tunable; QA guide §3). B4 stat-tag decision rides along.
- **Companion variant-loop thread closed 2026-07-10** (present = `unlock_flags∩flags` unified across all surfaces): owner clean-loop retest pending; in-flight/legacy loops need a new loop or one-time DB cleanup.
- **fallback = static combat is intended (2026-06-06 design)**: combat VFX only play at `?fallback=0`; open the sim WITHOUT `?fallback=1` to see animations.
- **ally-writeback**: fixed 2026-07-09 (`efa1c8f`, no more auto-promotion of story-flag allies); residual = one-time DB cleanup of players promoted by the old bug, on request.
- **agy browser attach flaky**: intermittent silent hang acquiring browser tools; gtimeout ceiling + verdict-rescue landed. Run live-QA direct from a supervising session; if attach fails twice, hand to human.
- **3.5-flash cost accepted (~$1.0/loop)**: hybrid rolled back 2026-07-17 (quality verdict); partial-2.5 audit found no viable spot (2 LLM touchpoints; thinking already 0). Remaining levers: prompt-cache hit monitoring · prompt diet round 2 (feel-sensitive, deliberately held) · re-evaluate at scale with golden-bank rubric scores.
- DB hygiene (low): `narrative_shards` raw rows retained post-rollup; prune only if size/query load bites.
- Some dated plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, `PROGRESS_LOG.md` for current truth.
- Combat image quality varies per character. Prefer an action-sheet-based pipeline over independent pose generation.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`
