# Running an LLM Game Master Off the Critical Path on Google Cloud Run & Vertex AI

*Technical blog post + conference talk CFP package (Sessionize / GDG DevFest / Cloud Next Extended / GDE portfolio).
Facts as of 2026-10-25; every metric points to its source file or benchmark in this repository. Architecture reference:
`docs/contest/architecture-en.md`; Devpost submission: `docs/contest/devpost-en.md`.*

---

## Part 1 · Technical Blog Post

### Why Most LLM Features in Games Fail

When teams wire a Large Language Model into an interactive game, they almost always hit one of two walls:

1. **The Spinner Wall (Critical-Path Latency):** Even a fast flash model takes 1.5–5 seconds on median and 10–25
   seconds at the p95/p99 tail. In a turn-based tactics game where a player makes 200+ decisions per 40-minute run,
   waiting 5 seconds for scene text kills the pacing.
2. **The Hallucination Wall (Rule Corruption):** If the model is allowed to invent damage numbers, grant arbitrary
   items, or alter map seeds, the game ceases to be a fair tactical puzzle — and any daily leaderboard becomes
   impossible to verify.

While building **Mythos 2.0: Signal Run (세계:접속)** — a bilingual (English/Korean) cyberpunk tactics deck-builder
roguelite running on **Google Cloud Run** and **Vertex AI (`gemini-3.8-flash`)** — we designed an architecture around a
single invariant:

> **Put deterministic rules underneath the model, never downstream of it — and keep every LLM call strictly off the
> critical path.**

Here are the five engineering patterns that made a live AI Game Master work in production at **~$0.048 per full run**
with **0 ms of player-visible blocking**.

---

### 1. Zero-Millisecond First Render + Non-Blocking Provenance Swap

Every screen in Mythos 2.0 has an authored, context-aware fallback line (`src/mythos_ui/src/v2/ui/shell/localGm.ts`).
When a player enters an Act Intro, an Event, a Boss fight, or a Safehouse:

1. The UI renders the authored line at **0 ms** — buttons and cards are immediately interactive.
2. In parallel, the client dispatches an asynchronous request to `POST /api/v2/gm/narrate` or `/api/v2/gm/talk` with a
   strict per-route timeout (IX combat interrupt: `5.5 s`; enemy taunt: `3.5 s`; boss intro: `6.0 s`; companion chat:
   `11.5 s`; scene narration: `16.0 s` — `src/mythos_ui/src/v2/ui/shell/gm.ts`).
3. If Vertex AI responds within budget (`source: "llm"`), the text swaps in smoothly with a cyan highlight and a
   `✦ AI` provenance badge (`ui/components/AiMark.tsx`). If it misses or the player is offline, the authored line
   simply remains on screen.

Crucially, `narrateLine()` preserves provenance (`{ text, ai: res.source === 'llm' }`): only true model generations
receive the `✦ AI` mark, join the per-run comms log, and expose an in-app report button (`v2_gm_reports`).

---

### 2. Clamped Sandbox: Free-Text Improvise & Grounded NPC Dialogue

Players want to type anything, but the game engine needs exact, balanced state transitions. We solved this by turning
Gemini into a **constrained semantic classifier + flavor writer** while keeping all math inside the pure-TypeScript
engine (`src/mythos_ui/src/v2/engine/`):

- **Event Improvise (`src/mythos_v2/gm.py`):** In any event, the player can type a custom action (or tap one of three
  stat-matched suggestion chips from `improvSuggest.ts`). Gemini returns schema-constrained JSON:
  - `stat` ∈ `{str, agi, int, cha, obs}`
  - `dc` clamped server-side and client-side to **3–9** (`DC_MIN, DC_MAX = 3, 9`)
  - `reward` ∈ `{credits, heal, card, trace_down, implant}` (where `implant` is downgraded to `card` unless `dc >= 7`)
  - `risk` ∈ `{hp, trace, credits}`
  - `success` / `failure` narrative strings
  The engine then rolls `2d6 + stat >= dc` using its deterministic RNG stream and applies the whitelisted outcome.
- **District NPC Free-Talk (`src/mythos_v2/npc.py`):** Across 6 CRPG districts and 18 NPCs, players can speak in their
  own words. Gemini replies in the NPC's persona and maps the player's utterance onto one of the scene's open authored
  options (`persuade`, `intimidate`, `deceive`, `bribe`, `help`, `hack`, `observe`, `ask`, `leave`). The NPC's reply
  stays on screen while the player chooses whether to commit to the mapped d20 check.
- **Deterministic Post-Processing (`clean_line` in `gm.py`):** Before any model line reaches the client, a deterministic
  cleaner strips markdown, speaker prefixes, unbalanced quotes (`_balance_quotes`), fourth-wall leaks, and any sentence
  stating mechanics numbers (`"HP 3"`, `"DC 7"`, `"70%"`). We verify this with a 25-case bilingual evaluation suite
  (`make gm-eval`, 12 KO + 13 EN cases: **100% usable on local `gemma4:8b-64k` at p50 0.58 s, and 100% cleaner
  acceptance across all 13 English cases on Vertex `gemini-3.8-flash`**).

---

### 3. Taming Vertex Tail Latency with Thread-Isolated Hedged Retries

In production on Cloud Run, we observed that while a ~100-token `gemini-3.8-flash` call typically finishes in **1.8–4.5
seconds**, tail requests to the global endpoint occasionally stall past 10 seconds or return `500 INTERNAL` /
`504 DEADLINE_EXCEEDED` at ~8–11 seconds.

In `src/mythos_v2/llm.py` (`GeminiTextLLM`), we implemented a three-part tail-latency defense:

1. **Hedged Request at 4.0 s (`MYTHOS_V2_GM_HEDGE_S`):** If the primary call has not returned after 4.0 seconds (or fails
   fast) and at least `2.0 s` (`HEDGE_MIN_LEFT_S`) remains in the route timeout, `_HEDGE_POOL` fires a second concurrent
   request and takes whichever finishes first.
2. **Thread-Local `AuthorizedSession` Isolation & 12 s Per-Leg Cap:** Each worker thread in `_HEDGE_POOL` maintains its
   own `threading.local()` `genai.Client` so a hedged retry never shares a stalled `requests.Session` connection pool
   with the primary leg, and each individual leg caps its HTTP timeout at `min(remaining, 12.0 s)`.
3. **Third-Attempt Recovery + Late-Token Accounting (`set_usage_sink`):** On longer budgets (`>= 10 s`), if both initial
   legs fail with transient `500/504` errors while time remains, a third recovery attempt fires automatically. If a
   slower hedged leg finishes *after* the winning leg has already returned to the player, its callback still reports the
   billed prompt + thinking + output tokens to `budget.charge` so FinOps accounting is never under-counted.

---

### 4. Four-Layer FinOps Cost Governance on Google Cloud

Putting an LLM behind a public web game requires hard guarantees that a traffic spike cannot cause a surprise cloud bill:

| Layer | Protection | Implementation |
|---|---|---|
| **1. Per-Player Monthly Cap** | $0.30/month (free) · $1.50/month (plus), counted in micro-USD from billed tokens (~**$0.048 per full 3-act run**) | `src/mythos_v2/budget.py` |
| **2. Global Daily Ceiling** | $20/day (`MYTHOS_V2_GM_DAILY_USD`); above 70% utilization (`MYTHOS_V2_FREE_SHARE`), free-tier calls serve authored text first | `src/mythos_v2/budget.py` |
| **3. Project Billing Kill-Switch** | ₩30,000/month Cloud Billing budget → Pub/Sub → Cloud Run function disables `aiplatform.googleapis.com` until next month | `scripts/ops/vertex_cap/main.py` |
| **4. Zero-Cost Anonymous Play** | Signed-out players without a judge `?demo=` code make 0 model calls (₩0) and play the full game on authored text | `src/mythos_v2/api.py` |

---

### 5. Serverless Anti-Cheat: Named RNG Streams & Node Replay Verification

Because Mythos 2.0 runs its tactical engine client-side for 0 ms responsiveness, how do we prevent tampered scores on the
daily leaderboard without running a stateful authoritative game server?

1. **Named RNG Streams (`src/mythos_ui/src/v2/engine/streams.ts`):** First, we banned `Math.random` across the entire
   engine and content tree. Second, inspired by clean-room analysis of roguelite RNG partitioning, we split the run seed
   into isolated **named streams** (`map@a1`, `reward@a1:n2`, `shop@a1:n4`, `combat@.../shuffle`, `combat@.../ai`) plus a
   canonical sort before deck reshuffles. Visiting a shop or typing an AI Improvise action on node 2 never alters the map
   or opening hand on node 3.
2. **Bundled Node Replay Verifier (`src/mythos_v2/replay.py` + `replay_verify.mjs`):** During a daily run, the client
   records every committed reducer action (`ui/replay/record.ts`). When the run finishes, Cloud Run invokes the identical
   TypeScript engine bundled into a standalone Node verifier (`replay_verify.mjs`, 10 s timeout, max 2 concurrent
   processes per instance) to replay the entire run from seed to final score, awarding a verified shield badge on the
   leaderboard.

---

### 6. Making Backend Architecture Visible: The Architect HUD (`?hud=1`)

Backend reliability is invisible by default — when hedging and fallbacks work, the player just sees a smooth game. For
judges and engineers, appending `?lang=en&hud=1` activates `ArchitectHud.tsx` (`src/mythos_ui/src/v2/ui/components/ArchitectHud.tsx`),
a live telemetry drawer displaying:

- Total GM calls in the session and `llm` vs. `fallback` / `local` share
- Median LLM latency alongside the `0 ms` authored baseline
- Remaining player monthly allowance
- Active run seed, named RNG stream keys touched, and recorded daily replay steps

---

## Part 2 · Conference Talk CFP (Sessionize Ready)

### Title Options
1. **AI Off the Critical Path: Designing a Zero-Spinner, Cost-Capped LLM Game Master on Cloud Run and Vertex AI**
2. **Don't Let the Model Roll the Dice: Deterministic Engines, Hedged Gemini Calls, and 4-Layer FinOps in Production**

### Elevator Pitch (300 characters)
LLMs in interactive apps usually fail by blocking the UI for 10 seconds or hallucinating broken state. Learn how we built
a tactics roguelite on Cloud Run & Vertex AI Gemini with a 0 ms authored first render, 4 s hedged retries, clamped
deterministic outcomes, and a 4-layer $0.05/run spend cap.

### Abstract
Integrating Large Language Models into real-time or turn-based games exposes two brutal failure modes: tail latency
(`504 DEADLINE_EXCEEDED` at 10–20 seconds) and rule-breaking hallucinations.

In this talk, we walk through the production architecture of **Mythos 2.0: Signal Run**, a bilingual tactics deck-builder
roguelite deployed on **Google Cloud Run** and **Vertex AI (`gemini-3.8-flash`)**. You will learn five transferable
patterns for any interactive AI application:

1. **Zero-Millisecond First Render & Provenance Swap:** Rendering authored state at 0 ms and swapping in `✦ AI` responses
   asynchronously within strict per-route budgets (3.5 s to 16 s).
2. **The Clamped Sandbox Pattern:** Using Gemini's structured output to classify open-ended user text ("Improvise" and
   NPC dialogue) into bounded engine enums (`DC 3–9`, whitelisted rewards/risks, and d20 intents) while stripping
   mechanical leakage with deterministic post-processors.
3. **Tail-Latency Engineering on Vertex AI:** Implementing 4-second hedged retries with thread-isolated
   `AuthorizedSession` pools, 12-second per-leg HTTP caps, third-attempt recovery, and late-token budget accounting
   (`on_late_usage`).
4. **Four-Layer FinOps Governance:** Combining micro-USD token accounting ($0.30/month per user, ~$0.048/run), a $20/day
   graceful degradation threshold, and a Cloud Billing → Pub/Sub → Cloud Run Function kill-switch at ₩30,000/month.
5. **Serverless Replay Verification:** Partitioning seeded randomness into named streams so a stateless Cloud Run
   endpoint can replay and verify 500-step client runs in Node without a dedicated game server.

### Key Takeaways for Attendees
- A concrete blueprint for putting LLMs *on top of* deterministic domain logic rather than *inside* it.
- Production Python code for hedged Vertex AI calls (`google-genai`) that accounts for tokens even on losing hedged legs.
- A defense-in-depth FinOps setup on Google Cloud that makes public, unauthenticated demos safe from runaway bills.
