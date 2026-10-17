# Player tiers (free / paid) + narrative, RPG and AI expansion

Date: 2026-10-18 · Status: **planned — D1/D2/D6 decided 2026-10-18; D3/D4/D5/D7 on the recommended default until the owner says otherwise** · Requested by the owner ("사용자 Tier를 나눠야할거같아. 유료/무료 구분", "LLM 관련 내러티브 요소 강화 … v1에서 더 가져오거나, RPG 요소 등 그리고 AI 관련된 것들을 강화. 계획 세워보자").

## 0. Why now

- The game is listed as **Free, no IAP, no ads** (`docs/play-store.md`), so every GM call is pure cost: ≈ $0.05/run today, ≈ $0.10/run after the Jan 2027 price doubling (`PROGRESS_LOG` 2026-10-17; the 3.8 price itself is from third-party pages, unverified).
- Guards today: per-player 20/min + 400/day, concurrency 4 × maxScale 3. **No global ceiling** — multi-account abuse or a traffic spike is bounded only by Cloud Run throughput (rough upper bound: hundreds of USD/day, not measured).
- More AI (this plan's second half) raises the per-run cost further, so tiers and budgets come first.
- The Play closed test (12 testers × 14 days) is a fixed wait before production; tier infrastructure can be built inside that window.

## 1. Principles (carried from 2.0, unchanged)

1. AI stays **off the critical path**: authored text first, AI swaps in, every call has a fallback. The free tier is simply "the fallback path", so it is already a complete game.
2. **Paid buys richness, not power.** No paid feature changes combat numbers, card/implant odds or win rate beyond what the free tier can also reach. Anything that touches run state has a free-tier authored equivalent with the same clamp.
3. **Daily seed stays comparable**: tier-only features that touch state are off on the daily.
4. Lore rule (owner, 2026-10-17): only IX remembers loops; companions get faint déjà vu at most. Within-run memory is fine.
5. Still rejected: runtime image generation, LLM-made cards/enemies, LLM map direction (critical path, balance, daily comparability).

## 2. Tier design

| | Free | Signal+ (paid) |
|---|---|---|
| Game | whole game, offline, no sign-in needed | same |
| Authored narrative, RPG systems (§4) | all | all |
| AI lines (event/IX/boss/act intro/taunt/chronicle) | **none** — authored only (owner D2) | yes, within the monthly fair-use budget |
| Improvise | local keyword judge (exists) | GM judge |
| Companion chat | authored dialogue choices (§4 N6) | free text + within-run memory |
| Paid AI features (§5) | — | yes |
| Budget exhausted | — | silently degrades to authored + a quiet notice |

Free tier makes **no GM calls at all**, so its marginal AI cost is zero; the global ceiling only protects the paid budget.

**Cost envelope (estimate).** ₩3,900/month subscription − 15 % Play fee ≈ ₩3,300 ≈ $2.4. At $0.10–0.15/run (2027 price, with the §5 features) that covers 16–24 runs/month of full AI. Proposed fair-use budget: **$1.5/user/month of GM cost** (≈ 10–15 runs), tracked from the token counts `v2_gm_usage` already stores.

**Engineering (W1, ≈ 4–6 days, M–L):**
- `v2_entitlements` (player_id, sku, state, expires_at, purchase-token hash); Alembic-free self-creating DDL like `store.py` + `migrations/010_v2_entitlements.sql`.
- Purchase verification on the server via the Google Play Developer API (`purchases.subscriptionsv2.get`) with the existing service account (needs Play Console API access — owner step); RTDN over Pub/Sub for renew/cancel/refund. Alternative: RevenueCat (faster, but a third-party processor → Data safety + privacy page change). See D4.
- `auth.py` resolves `tier` per request; `ratelimit.py` gains a per-user monthly budget and a **global daily ceiling** (free and total); `/api/v2/config` returns `tier`, `features`, `budgetLeft` for the client.
- Client: Capacitor billing plugin, `Signal+` screen (what it adds, price, restore purchases), Settings status, feature gating from `/config`. Web: no purchase flow at first; a web session signed into the same Google account gets the entitlement (D5).
- Play: listing → "Contains in-app purchases", Data safety (purchase history), privacy/terms pages, refund wording. Tests: entitlement states, budget exhaustion → fallback, RTDN handler, expired subscription.

**W0 — before Play production regardless of D1 (S, ½ day):** global daily GM ceiling (`MYTHOS_V2_GM_DAILY_USD`) + an owner-set GCP billing budget alert. Converts unbounded risk into a fixed number even if tiers slip.

## 3. What is left in 1.x (branch `1.0`)

The 2026-10-11 port (`2026-10-11-port-from-1x.md`) already took everything that fit an AI-off-critical-path game. What remains is either (a) mechanics that were judged "overlapping" before RPG depth was a goal, or (b) the LLM-authoritative loop that 2.0 rejected. Re-judged for this plan:

| 1.x piece | Path on `1.0` | Verdict now |
|---|---|---|
| Echo inscription (각인) — inscribe one carried memory at loop start → themed run modifier | `src/mythos_runtime/echoes.py` | **port** as N2 (authored effect table, AI-written echo text) |
| Autonomy level gated by clues collected | `progression.py: determine_autonomy_level` | **port** as N5 |
| Codex skill tree, insight points, epiphanies | `progression.py` (`INSIGHT_PER_*`, `epiphanies_seen`, `skill_ranks`) | **adapt** into N3/N4 (2.0 has cards, not skills) |
| Scene-granted items (`world_delta.grant_items`, whitelisted, ≤ 2/scene) | `session._filter_grant_items` | already covered by Improvise's clamped rewards |
| Free-form GM scenes (the 1.x core loop) | `mythos_narrative` director | **revive only as an optional side mode** (N9), never on the map path |
| Session synopsis / beats | `session_memory.py` | feeds N7 (within-run companion memory) |
| Stability/Tension, ending resolver, NoveltyController, route DAG | — | still not ported (2.0 has its own pressure/endings) |

## 4. RPG and narrative depth — authored, both tiers

| # | Feature | What it is | Effort | Risk / check |
|---|---|---|---|---|
| N2 | **Echo inscription** | At loop start, choose 1 of up to 3 echoes from the last run's highlights (killer, best fight, companion, ending). Each maps deterministically to one of ~8 authored effects built from existing passives/stats. AI names and describes the echo from the chronicle (paid); authored name otherwise. Off on the daily. | M | balance via `simulateRun` on identical seed blocks (`LESSONS.md`) |
| N4 | **Connector growth** | +1 stat point per act clear and per elite (choose STR/AGI/INT/CHA/OBS). Stats drive event checks only (`run.ts` `checkChance`), so combat balance is untouched; makes builds feel like RPG characters. | S–M | event success-rate shift; stat cap stays `STAT_MAX` |
| N5 | **Autonomy (자율도)** | Meta level from lore/clues collected across loops. Each level widens the Improvise bounds (one more Improvise per act, a higher reward tier) and unlocks extra lines in the final IX choice. Fits the fiction: the Connector learns to bend the grid. | M | Archive overlap with `unlocks.ts`; reward tier needs clamping review |
| N3 | **Thought cabinet (내면화)** | Stat voices (`content/statVoices.ts`) offer "thoughts" after notable checks/lore; slot up to 2, they internalise over N nodes and grant a small passive + a final authored line. ~15 thoughts. Paid: the voice comments live on the current situation. | L | content volume; passive balance |
| N6 | **Companion dialogue that matters** | Safehouse chat gets one "meaningful exchange" per visit: free tier picks from 3 authored replies, paid types freely and the GM classifies tone. Either way the effect is the same clamp: +bond progress once per safehouse. | M | exploit = capped once per visit; same for both tiers |

## 5. AI features — Signal+

| # | Feature | What it is | Calls/run (est.) | Effort |
|---|---|---|---|---|
| N1 | **Prefetch pipeline** | Generate the next node's lines during combat/map so longer AI text shows with no wait. Infrastructure for N8/N9 and for richer event narration. | ± (some wasted prefetches) | M |
| N7 | **Within-run companion memory** | Companions remember what you told them earlier this run (bounded synopsis like 1.x `session_memory`). No cross-loop memory (lore rule). | +0 (bigger prompts) | S |
| N8 | **IX profiles you** | IX comms reference your cross-loop play data: most-played card, what killed you, Improvise habits, favourite companion. IX already remembers loops; this makes it personal. | +0–3 | S |
| N9 | **Deep Dive (심층 접속)** | Archive-hub side mode: a 3–5 exchange free-text scene with the GM inside an authored frame (lore-locked prompt, naming guard). Rewards are lore fragments / Memories-tab entries only — no power. Revives the 1.x feeling without touching the run. | +5–10 per dive | L |
| — | Live TTS for IX lines | Paid-only voiced AI lines. After the static voice pins. | cost TBD | later |

`make gm-eval` gets cases for every new route before it ships; `/admin` shows cost per tier.

## 6. Waves

| Wave | Content | When |
|---|---|---|
| **W0** | global daily ceiling + billing alert | now, before Play production |
| **W1** | tier infrastructure (§2), tier = free for everyone until the SKU exists | during the 14-day closed test |
| **W2** | N4 growth · N2 echo · N5 autonomy (authored RPG, both tiers) | after W1 or in parallel (disjoint files) |
| **W3** | N7 · N8 · N6 · N1 (first Signal+ value) | with the first paid release |
| **W4** | N9 Deep Dive · N3 thought cabinet | after first-player data |

Each wave: `make check`, `gameplay-qa` for any rule change, `make playthrough-quick`, `make gm-eval` for prompt changes, deploy-preview → verify → owner promote.

## 7. Owner decisions

- **D1 model — decided 2026-10-18: monthly subscription** (Signal+).
- **D2 free-tier AI — decided 2026-10-18: none.** Free = authored only; Improvise uses the local keyword judge; companion chat is the authored-choice form of N6.
- **D3 price**: ₩3,900/month (default, open).
- **D4 billing**: self-hosted Play verification (default, open) / RevenueCat.
- **D5 web**: entitlement only, no web checkout at first (default, open).
- **D6 scope — decided 2026-10-18: all of N2–N9** (RPG growth + echo + autonomy, companion dialogue, IX profiling, Deep Dive + thought cabinet), in the wave order of §6.
- **D7 daily**: tier-only features off on the daily seed (default, open).
