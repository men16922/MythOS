# Player tiers + CRPG layer + narrative, RPG and AI expansion

Date: 2026-10-18 · Status: **planned — D1/D2/D6 decided; D3–D5, D7–D9 on the defaults below until the owner says otherwise** · Requested by the owner ("사용자 Tier를 나눠야할거같아. 유료/무료 구분", "LLM 관련 내러티브 요소 강화 … v1에서 더 가져오거나, RPG 요소 등 그리고 AI 관련된 것들을 강화", "전투 요소 위주라서 CRPG 관련 요소도 … 유료 버전을 위한 혜택 … 발더스 게이트", "로그인 유저는 금액 한도로 AI, 유료 월 구독은 금액 한도를 늘려주는거지").

## 0. Why now

- The game is listed as **Free, no IAP, no ads** (`docs/play-store.md`), so every GM call is pure cost: ≈ $0.05/run today, ≈ $0.10/run after the Jan 2027 price doubling (`PROGRESS_LOG` 2026-10-17; the 3.8 price itself is from third-party pages, unverified).
- Guards today: per-player 20/min + 400/day, concurrency 4 × maxScale 3. **No money cap** per user or overall — multi-account abuse or a spike is bounded only by Cloud Run throughput (rough upper bound: hundreds of USD/day, not measured).
- The game is combat-first; the owner wants a CRPG layer (Baldur's Gate 3 as the reference) as the paid benefit. That layer and the other AI features raise the per-run cost, so budgets come first.
- The Play closed test (12 testers × 14 days) is a fixed wait before production; tier infrastructure can be built inside that window.

## 1. Principles

1. AI stays **off the critical path**: authored text/options first, AI swaps in, every call has a fallback. Budget exhausted = the authored path, never a broken screen.
2. **Signal+ buys content and richness.** The CRPG layer is paid content (like an expansion), so it may carry its own rewards in normal runs, but each district replaces one event node and stays inside an event node's reward budget (no run gets longer or much stronger). Combat numbers, card/implant odds and enemy stats are tier-independent.
3. **Daily seed stays identical for everyone**: no districts, no tier-only state effects on the daily.
4. Lore rule (owner, 2026-10-17): only IX remembers loops; companions get faint déjà vu at most. Within-run memory is fine.
5. Still rejected: runtime image generation, LLM-made cards/enemies, LLM map direction.

## 2. Tiers and AI budgets

| | Guest (no sign-in) | Signed-in (free) | Signal+ (monthly subscription) |
|---|---|---|---|
| Base game, authored narrative, RPG systems (§5) | all, offline | all | all |
| AI lines (event/IX/boss/act intro/taunt/chronicle), GM Improvise, companion free chat | — | yes, **within a small monthly $ budget** | yes, **within a larger monthly $ budget** |
| CRPG layer (§4: districts, dialogue with d20 checks, AI NPC talk, backgrounds, approval, quests, banter) | — | — | yes |
| Budget exhausted | — | authored path + quiet notice + Signal+ offer | authored path + quiet notice |

**Budgets (defaults, D2/D3).** Signed-in free: **$0.30/month** of GM cost (≈ 3–6 runs of base AI). Signal+: **$1.5/month** at ₩3,900 (net ≈ $2.4 after the 15 % Play fee; ≈ 6–10 CRPG-heavy runs at an estimated $0.15–0.25/run). At ₩5,900 the Signal+ budget could be $2.5. Budgets are counted from the token counts `v2_gm_usage` already stores × the configured price, reset on the 1st (KST).

**Exposure.** Worst case free spend = free budget × signed-in MAU (10k MAU × $0.30 = $3k/month), so a **global daily ceiling** stays on as the fuse; when it trips, free users go authored first, Signal+ last. Optional lever: serve free users a cheaper model (measure with `make gm-eval` first).

**Engineering (W1, ≈ 4–6 days):**
- `v2_entitlements` (player_id, sku, state, expires_at, purchase-token hash), self-creating DDL like `store.py` + `migrations/010_v2_entitlements.sql`; `v2_gm_budget` view or monthly rollup over `v2_gm_usage`.
- Purchase verification on the server via the Google Play Developer API (`purchases.subscriptionsv2.get`) with the existing service account (owner: grant Play Console API access); RTDN over Pub/Sub for renew/cancel/refund. Alternative: RevenueCat (D4).
- `auth.py` resolves `tier`; `ratelimit.py` gains the per-user monthly $ budget and the global daily ceiling (`MYTHOS_V2_GM_DAILY_USD`, `MYTHOS_V2_BUDGET_FREE_USD`, `MYTHOS_V2_BUDGET_PLUS_USD`); `/api/v2/config` returns `tier`, `features`, `budgetLeft`.
- Client: Capacitor billing plugin, `Signal+` screen (what it adds incl. recorded CRPG/AI samples, price, restore purchases), budget meter in Settings, feature gating from `/config`. Web: no checkout at first; the same Google account on the web gets the entitlement (D5).
- Play: listing → "Contains in-app purchases", Data safety (purchase history), privacy/terms, refund wording. Tests: entitlement states, budget exhaustion → fallback, RTDN handler, expiry.

**W0 — now, before Play production (S, ½–1 day):** per-user monthly budget for signed-in users + global daily ceiling, everyone treated as "signed-in free" until W1. Plus an owner-set GCP billing budget alert.

## 3. What is left in 1.x (branch `1.0`)

The 2026-10-11 port (`2026-10-11-port-from-1x.md`) took everything that fit an AI-off-critical-path game. Re-judged for this plan:

| 1.x piece | Path on `1.0` | Verdict now |
|---|---|---|
| Free-form GM scenes, NPC agendas, free action (the 1.x TRPG/CRPG core) | `mythos_narrative` director, `scenario.json` `npc_agendas` | **revived inside CRPG districts** (§4 C1/C3): authored scene graph as the spine, AI as the NPC voice and intent reader |
| Echo inscription (각인) | `src/mythos_runtime/echoes.py` | **port** as N2 |
| Autonomy level gated by clues | `progression.py: determine_autonomy_level` | **port** as N5 |
| Skill tree, insight points, epiphanies | `progression.py` | **adapt** into backgrounds (C6) and growth (N4) |
| Scene-granted items (whitelisted, ≤ 2/scene) | `session._filter_grant_items` | reused as the district reward clamp |
| Session synopsis / beats | `session_memory.py` | feeds N7 and NPC memory inside a run |
| Stability/Tension, ending resolver, NoveltyController, route DAG | — | still not ported |

## 4. CRPG layer — Signal+ (Baldur's Gate 3 as the reference)

| # | Feature | BG3 analogue → Signal Run | Effort |
|---|---|---|---|
| C1 | **Districts (구역 탐색)** | Explorable locations → new `NodeKind 'district'`. In Signal+ normal runs one event node per act becomes a district: 3–5 points of interest (scene stills), 2–3 NPCs, interactables, a limited action count (≈ 4–6; patrol/Trace rises after) so a district takes 3–5 minutes. | L |
| C2 | **Dialogue with d20 checks** | Dialogue trees + visible d20 roll, DC, modifiers, advantage, inspiration reroll. Authored graphs in `content/dialogues/`; options gated by stat/background/companion/flag; the roll uses the existing `checkChance` math, shown as d20 + modifier. The d20 presentation can also reskin ordinary event checks for everyone (cheap). | M–L |
| C3 | **AI NPC talk** | Talk to anyone, any way → in a dialogue node Signal+ can type freely; the GM maps the line to one of the node's authored intents (persuade / deceive / intimidate / insight / offer / attack / leave) and voices the NPC reply; the engine rolls. Option buttons stay visible as the fallback. NPC personas server-side, like `taunt.py`. | M |
| C4 | **Companion approval + camp** | "Se-rin approves" → options carry authored value tags per companion; approval feeds bond progress (clamped per node). Safehouse becomes a camp night: a companion with high approval starts a scene (authored + AI free talk). Absorbs N6. | M |
| C5 | **Quests and reactivity** | Journal + consequences across acts → district quests accepted in Act 1/2 pay off later (an ally disables a boss turret, a spared NPC reappears, a betrayed faction ambushes). Flags only; quest log screen. | M–L |
| C6 | **Backgrounds (origin)** | Origins / backgrounds → pick one at run start (e.g. 전직 단속관, 브로커, 의사, 러너): two proficient stats, unique dialogue options, an inspiration trigger. Archetypes keep owning combat. | M |
| C7 | **Party banter** | Camp/travel banter → the two deployed companions trade 2–3 lines on map travel about recent events (authored pool + AI variants). | S–M |
| C8 | **Talk your way in or out** | Dialogue that avoids or reshapes fights → a clamped set of combat modifiers: skip the fight, surprise (enemies lose their first telegraph), a temporary ally unit, one enemy weakened. Sim-tested via `gameplay-qa`. | M |

Content for a first release: 3 acts × 2 district variants = **6 districts**, ≈ 3 NPCs and ≈ 40 dialogue nodes each, 2–3 stills each (image calls on the ledger), Korean first, owner tone review. Validators extend `narrative.test.ts` (every dialogue node reachable, every flag read has a setter, every option has an authored fallback line).

## 5. RPG and narrative depth — authored, all tiers

| # | Feature | What it is | Effort | Check |
|---|---|---|---|---|
| N4 | **Connector growth** | +1 stat point per act clear and per elite; stats drive event/dialogue checks only, so combat balance is untouched. | S–M | check success-rate shift; `STAT_MAX` stays |
| N2 | **Echo inscription** | At loop start, choose 1 of up to 3 echoes from the last run's highlights; each maps to one of ~8 authored effects built from existing passives/stats. AI names the echo from the chronicle when budget allows. Off on the daily. | M | `simulateRun` on identical seed blocks |
| N5 | **Autonomy (자율도)** | Meta level from lore/clues across loops; widens Improvise bounds and unlocks extra lines in the final IX choice. | M | reward clamp review |
| N3 | **Thought cabinet (내면화)** | Stat voices offer "thoughts" after notable checks/lore; slot up to 2, they internalise over N nodes for a small passive + a closing line. ~15 thoughts. | L | passive balance |

## 6. AI features — any signed-in user, within budget

| # | Feature | What it is | Effort |
|---|---|---|---|
| N1 | **Prefetch pipeline** | Generate the next node's lines (and district NPC openers) during combat/map so longer AI text shows with no wait. | M |
| N7 | **Within-run memory** | Companions and district NPCs remember what you said earlier this run (bounded synopsis like 1.x `session_memory`). | S |
| N8 | **IX profiles you** | IX comms reference cross-loop play data: most-played card, what killed you, Improvise habits, favourite companion, district choices. | S |

`make gm-eval` gets cases for every new route (NPC talk, banter, camp, intent mapping) before it ships; `/admin` shows cost per tier and budget exhaustion rate.

## 7. Waves

| Wave | Content | When |
|---|---|---|
| **W0** | per-user monthly budget + global daily ceiling + billing alert | now, before Play production |
| **W1** | tier infrastructure (§2) | during the 14-day closed test |
| **W2** | CRPG spine: C2 dialogue + d20, C6 backgrounds, C4 approval/camp | after W1 (parallel with W1 on disjoint files) |
| **W3** | C1 districts + C5 quests + C3 AI NPC talk + C8 combat hooks, first 6 districts — the Signal+ launch headline | first paid release |
| **W4** | N4 growth · N2 echo · N5 autonomy · C7 banter · N7 · N8 · N1 | next update |
| **W5** | N3 thought cabinet, more districts | after first-player data |

Each wave: `make check`, `gameplay-qa` for any rule change, `make playthrough-quick`, `make gm-eval` for prompt changes, deploy-preview → verify → owner promote.

## 8. Owner decisions

- **D1 — decided: monthly subscription** (Signal+).
- **D2 — decided: signed-in users get AI within a $ budget; Signal+ raises the budget.** Amounts: free $0.30/month, Signal+ $1.5/month (defaults, open).
- **D3 price**: ₩3,900/month (default) / ₩5,900 with a $2.5 budget.
- **D4 billing**: self-hosted Play verification (default) / RevenueCat.
- **D5 web**: entitlement only, no web checkout at first (default).
- **D6 — decided: all of N2–N9 in scope**; N6 folded into C4 and N9 (Deep Dive) folded into C1/C3.
- **D7 daily**: no districts or tier-only state effects on the daily (default).
- **D8 CRPG access**: Signal+ only (default) / Act 1 district free as a taste.
- **D9 district placement**: replaces one event node per act in Signal+ normal runs (default) / added on top.
