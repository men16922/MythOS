# MYTHOS 2.0 — Signal Run (세계:접속) · Devpost submission text

*Judge- and reader-facing Devpost submission draft in English. Content counts checked against CONTENT on 2026-11-05; earlier evaluation metrics retain their original dates; every metric points to the
repository file or log that measured it. Source architecture document: `docs/contest/architecture-en.md`; pitch summary:
`docs/contest/pitch-en.md`.*

---

## Elevator Pitch

A deterministic cyberpunk tactics deck-builder where you read every enemy move before it lands — and a Vertex AI Gemini
game master, 97 district NPCs, your companions and the city's administrator AI react to what you actually typed and
chose, with **0 ms critical-path blocking**, **clamped deterministic outcomes**, and a **4-layer Google Cloud cost cap**.

---

## Inspiration & Problem

Generative AI in games usually fails in one of two ways:
1. **Latency blocks gameplay** — players stare at a spinner for 5–20 seconds waiting for an LLM before they can act.
2. **Hallucinations break game rules** — free-form model outputs leak into combat math, invent items, or ruin leaderboard
   fairness.

In a tactics roguelite where combat is a tight spatial puzzle on a 7×5 board and a run lasts ~40 minutes, either failure
is fatal. We built **Mythos 2.0: Signal Run** to answer an architectural question:

> *How do you put a live LLM Game Master (Vertex AI Gemini) inside a replay-verified tactics roguelite so that the AI
> feels personal and reactive, yet never blocks a frame, never decides a mechanical outcome, and never exceeds a strict
> cloud budget?*

---

## What It Does

**Mythos 2.0: Signal Run (세계:접속)** is a playable browser and Android tactics deck-builder set in rain-soaked
Neo-Seoul under **IX**, a polite administrator AI that scores every citizen and erases the "unregistered."

- **Deterministic 7×5 tactical board (Into the Breach × Slay the Spire):** Every enemy telegraphs where and how hard it
  will strike next turn. You win by positioning, pushing enemies into each other, into burning tiles, live wires, or off
  broken bridges into the void.
- **Seven live touchpoints (six use the model, all off the critical path):**
  1. **Scene Narration:** The GM narrates events and act transitions shaped by your stats, trace level, and party.
     Authored prose renders at **0 ms**; if Gemini's line arrives within budget, it swaps in with a `✦ AI` badge.
  2. **Free-Text Improvise (`src/mythos_v2/gm.py`):** In any event, type any action in your own words. Gemini classifies
     it into one of 5 stats, a difficulty clamped to **DC 3–9**, one reward from 5 fixed tiers, and one risk from 3; an
     implant reward requires DC ≥ 7. The pure-TypeScript engine rolls the check.
  3. **Grounded NPC Dialogue (`src/mythos_v2/npc.py`):** Talk to 97 district NPCs in your own words. The NPC replies in
     character and Gemini maps your words onto one of the scene's authored d20 intents (9 kinds) so the engine resolves
     state changes deterministically.
  4. **IX Loop & Boss Memory (`src/mythos_v2/gm.py`):** IX cuts in during boss fights and recalls how your previous loops
     ended (which boss killed you and how many times).
  5. **Companion Memory & Run Chronicle:** Companions remember choices you made earlier in the current run during
     safehouse conversations, and the GM composes an end-of-run chronicle from your typed Improvise actions.
  6. **IX Learns (Paradox 10, `content/ixReads.ts`, deterministic, no model call):** At the top Paradox level IX reads what your deck leans on at the
     start of every act and sets one authored counter for it (e.g. more armor against shove decks), shown under the
     act title. IX also profiles your habits across loops (where your loops end, what your deck leans to) and says so.
  7. **Procedural Events (`content/eventsProcedural.ts`):** Twelve authored situations whose place and person the GM
     invents on the spot; options and outcomes stay authored, at most two per run, never on the daily seed.
- **Live Architect HUD (`?hud=1`):** Judges and engineers can toggle an in-game telemetry overlay
  (`src/mythos_ui/src/v2/ui/components/ArchitectHud.tsx`) showing live GM call count, LLM vs. fallback share, median
  latency against the 0 ms authored baseline, remaining player allowance, active seed, named RNG streams, and daily
  replay steps.

---

## How We Built It

1. **Pure TypeScript Engine with Named RNG Streams (`src/mythos_ui/src/v2/engine/`):**
   - Zero `Math.random` calls across the entire engine and content layer.
   - Randomness is partitioned into isolated **named streams** (`streams.ts`: map per act; rewards, shop, and event per
     node; deck shuffle and enemy AI per fight). On the daily seed, every player faces the exact same maps and fights
     regardless of earlier choices or whether AI narration is enabled.
2. **Replay-Verified Daily Leaderboards (`src/mythos_v2/replay.py`):**
   - The client records committed actions during a daily run (`ui/replay/record.ts`).
   - On submission, Cloud Run executes the identical TypeScript engine bundled for Node (`replay_verify.mjs`, 10 s cap,
     concurrency limit 2) to verify the score and attach a verified shield badge without running a stateful game server.
3. **Tail-Latency Hedging (`src/mythos_v2/llm.py`):**
   - On Vertex AI, a ~100-token scene intro typically completes in 2–5 s, but tail requests occasionally hit >12 s or
     `504 DEADLINE_EXCEEDED`.
   - We fire one hedged retry after `MYTHOS_V2_GM_HEDGE_S = 4.0 s` (first response wins), raising Cloud Run act-intro
     completion within budget from ~50% unhedged to **10/12 (83%)**, while charging any late tokens from the losing leg
     via `on_late_usage` so cost accounting stays exact.
4. **Four-Layer Cost Governance (`src/mythos_v2/budget.py`, `scripts/ops/vertex_cap/`):**
   - **Layer 1 (Per-player monthly allowance):** $0.30 free tier / $1.50 higher tier, tracked in micro-USD from billed
     token counts (~**$0.048 per full 3-act run** across ~63 calls).
   - **Layer 2 (Global daily ceiling):** $20/day (`MYTHOS_V2_GM_DAILY_USD`); past 70% utilization, free-tier calls degrade
     gracefully to authored text.
   - **Layer 3 (Project kill-switch):** A Cloud Billing budget alert at ₩30,000/month triggers Pub/Sub → a Cloud Run
     function (`scripts/ops/vertex_cap/main.py`) that disables `aiplatform.googleapis.com` for the rest of the month.
   - **Layer 4 (Zero-cost anonymous play):** Signed-out play without a demo code makes zero LLM calls (₩0) and remains
     100% playable.
5. **Canary Preview Verification (`scripts/dev/verify_preview.py`):**
   - `make deploy-preview` deploys a zero-traffic Cloud Run revision tagged `git-sha=<HEAD>`.
   - `make verify-preview` asserts the revision label matches `HEAD`, checks health and Firebase Auth config, and
     verifies the served JS bundle is byte-identical to the local build before traffic promotion.

---

## Challenges We Ran Into

- **Preventing LLM mechanical leakage:** Early prompts occasionally echoed difficulty numbers (`"DC 7"`, `"HP 3"`) or
  leaked fourth-wall terms (`"this event"`, `"your stat"`), which clashed with the engine's actual roll. We built a
  deterministic post-processor in `src/mythos_v2/gm.py` that strips markdown, speaker labels, unbalanced quotes, and any
  sentence stating mechanics numbers, backed by a 25-case bilingual evaluation suite (`scripts/dev/gm_eval.py`, 12 KO +
  13 EN cases; 100% usable on `gemma4:8b-64k` and 100% cleaner acceptance across all 13 English cases on Vertex
  `gemini-3.8-flash`).
- **Keeping Improvise suggestions aligned between offline and online judges:** We added one-tap Improvise ideas tailored
  to the player's top stats (`improvSuggest.ts`) and tuned the phrasing so the offline keyword classifier and the online
  Gemini classifier map each suggestion to the same stat.
- **Phone-width tactical readability (`375–412 px`):** Fitting a 7×5 tactical board, enemy intent badges, party bar, and
  hand fan onto a `375×667` screen without horizontal scroll required dynamic viewport band compaction in
  `combat/screen/layout.ts`, preserving 44 px touch targets and 50–57 px board tiles.

---

## Accomplishments We're Proud Of

- **Complete bilingual game + production AI harness:** 245 protocol cards, 154 enemies, 181 encounters, 76 implants, 337
  events, 14 companions, 34 districts with 97 NPCs, and 18 endings — 100% paired in Korean and English
  (enforced by `content.test.ts`).
- **Bot-driven balance & QA discipline (2026-11-05):** `make check` passed 584 engine/content/UI tests; Python ran
  343 tests with 12 database tests skipped. Built-SPA browser smoke passed separately. Greedy, mixed and basic
  bots compare balance on identical seed blocks; older win rates are historical, not measurements of this release.
- **Zero-spinner UX:** Players never wait on a model call; every AI line is visibly badged (`✦ AI`), logged per run, and
  reportable in-app.

---

## What We Learned

- **Put deterministic rules underneath the model, never downstream of it:** Letting the LLM classify open-ended player
  intent into a small vocabulary (`stat`, clamped `dc`, whitelisted `reward`/`risk`, or authored dialogue `intent`) gives
  players expressive freedom while keeping balance, saves, and daily replays 100% deterministic.
- **Measure tail latency, not just median latency:** In interactive games, p95 matters more than p50. Combining a 0 ms
  authored first render with a 4 s hedged retry eliminated visible stalls without blowing up token spend.

---

## What's Next

- Expand district stories and post-run chronicle sharing based on player telemetry.
- Publish a deep-dive cloud architecture post and conference talk on running cost-capped, replay-verified LLM systems on
  Cloud Run and Vertex AI.

---

## Built With (Google Cloud & Stack)

- **Google Cloud:** Cloud Run (FastAPI API + SPA hosting, tagged preview revisions), Vertex AI (`gemini-3.8-flash` with
  4 s hedged retries), Firebase Authentication (Google sign-in + judge `?demo=` codes), Cloud SQL for PostgreSQL (with
  in-memory fallback), Cloud Billing Budgets + Cloud Pub/Sub + Cloud Run Functions (`vertex_cap` spend kill-switch),
  Firebase Cloud Messaging + Cloud Scheduler (daily-seed notifications), Cloud Logging, Firebase Crashlytics & App
  Distribution (Android).
- **Client & Engine:** TypeScript, React 19, Vite, Capacitor (Android), Web Audio API (procedural SFX + adaptive act
  stems), Playwright.
- **Backend & Tooling:** Python 3.12, FastAPI, Pydantic, Node.js (`replay_verify.mjs`), FFmpeg + Pillow (automated
  trailer pipeline).

---

## Try It

- **Web Demo (English + Architect HUD):** `<Cloud Run URL>/?lang=en&hud=1&demo=<judge-code>`
- **Three-minute showcase (`?showcase=1`):** `<Cloud Run URL>/?showcase=1&lang=en&hud=1&demo=<judge-code>` opens a prepared, throwaway profile on its own storage (it never touches a real save and never syncs): the Archive where IX names a habit it read off three past loops, then a Paradox 10 run at Act 3 where IX has read the deck, with a procedural event and a marked recruit on the first map nodes.
- **Showcase Video:** `outputs/trailer/cinematic/mythos2_cinematic_showcase.mp4` (82 s: gameplay + live AI features +
  Google Cloud architecture card) and `outputs/trailer/ai/mythos2_ai_features_en.mp4` (56 s English AI feature cut).
