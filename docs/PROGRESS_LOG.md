# Progress Log

Last updated: 2026-10-11

## 2026-10-11 — Stat inner voices (1.x port #2)

- After a stat check resolves (event option or Improvise), the stat that was rolled talks back in one authored line under the outcome text, once the text has finished typing: 근력 rough and loyal, 민첩 a jumpy kid, 지능 a cold 합쇼체 analyst, 매력 a soft teasing older sister, 관측 an old dry watcher. 5 stats × 4 success + 4 failure lines, KO/EN, no numbers (the chips already carry them). Picked by a stable hash of (stat, outcome, event:option), so the same moment always sounds the same; no LLM, no balance effect. Each voice has its own colour.
- `Typewriter` gained an `onDone` callback; the voice mounts on completion. Verified in a real browser against the dev server (success path and failure path, console clean) and by `narrative.test.ts` (counts, length, no digits, distinct registers, deterministic spread).

## 2026-10-11 — 1.x port, Wave 1 (naming guard, agendas, flag reachability, boss stacking)

- Owner directive: "포팅 계획까지 포함하여 잔여 작업 전부 검증 완료시까지 수행 … 개선사항은 스스로 판단 … 게임의 재미 최우선". Executing `docs/plans/2026-10-11-port-from-1x.md` wave by wave.
- **#1 naming/register guard**: `talk.absent_companion_named` rejects a line naming a companion the context never gives (party, event title, chosen action, player name; the speaker is always allowed) on narration, companion chat and IX → authored fallback; `drop_polite_sentences` removes polite endings from every Korean companion reply except Kai (the one 해요체 speaker). Naming rule added to the narrate prompt; the client now sends `party` in the chat context. "한" is checked only in English (it is an ordinary Korean word).
- **#8 agendas**: `talk.AGENDAS` — one quiet inner goal per companion (KO/EN, written against the new arcs), injected as "never state it, let it colour tone".
- **#10 reachability**: `narrative.test.ts` now also proves every flag reader has a setter that can share its party (≤ 2 companions) within act order. All chains pass.
- **#12 boss stacking**: verified with decks of 4/8 extra burn cards and with pre-applied burn 6/12 — realistic burn builds shorten bosses 25–30 % but do not raise IX's mixed win rate (65 → 61 %), so no 1.x-style stack cap is needed. A pre-applied 12 burn would halve boss length, but one card gives at most 4 and burn decays by 1 per turn.
- Tests: `tests/test_v2_talk.py` (naming, register, agendas), `tests/test_v2_api.py` (absent-name narration falls back).

## 2026-10-11 — GM token usage + cost in the dashboard (1.x port #4, first of Wave 1)

- The GM cost guard decision had no number to stand on: `v2_gm_usage` counted calls but not tokens. `llm.py` backends now report the billed tokens of the call they just made (`Usage`, thread-local `take_last_usage`; Gemini adds thinking tokens to output), `_GMRunner` hands them to `log_gm` through a request-scoped ContextVar, and `record_gm_usage` adds them to the day/route/outcome row (migration 014 + `SCHEMA_STATEMENTS`). `/admin` "AI GM 일별 호출" gained input/output tokens and an estimated cost.
- No price is assumed: cost shows only when the server has `MYTHOS_GM_PRICE_IN_PER_M` / `MYTHOS_GM_PRICE_OUT_PER_M` (USD per million). **Owner**: set both on the Cloud Run service (from the current Vertex price list) to turn the cost column on; until then it reads "—" and tokens are the signal.
- Tests: `tests/test_v2_llm_usage.py` (both backends' usage extraction against fake clients, missing metadata → zero, price math, env parsing), store contract (token sums on memory + Postgres), API → dashboard end to end. Known undercount: calls abandoned by the timeout are counted, their tokens are not.
- The GM cost guard itself stays off (owner) — the per-player 400 calls/day cap still applies; decide on a tighter cap once a few days of real tokens/day are visible.

## 2026-10-11 — Combat balance pass: Incinerator tuned; card audit (no change)

- Per-encounter telemetry (mixed bot, 4 seed blocks × 60 runs): the curve is as designed (Act 1 ≈ 0–3 % losses, Act 2 elites/boss 0–8 %, Act 3 6–27 %, IX 26 %), with one outlier — `a2_elite_incinerator` lost 20 % of the time and cost 15.7 HP per fight vs 0–5 % and ≈ 4 HP for the other Act 2 elites. In isolation (starter decks × 60 seeds × 3 archetypes): mixed 91 % win / 15.5 HP lost, greedy 5.0 HP lost vs 0.4–0.7 for Reaver and Captain.
- Levers tried one at a time (isolated mixed win / HP lost): firestorm burn 3 → 2: 96 % / 12.7 · plus drone cooldown 3 → 4: 97 % / 12.2 · plus HP 40 → 34: 96 % / 11.6. Only the burn change moves it; the others are marginal, so the change is **burn 3 → 2 and nothing else**. Run level: Incinerator loses 20 % → 16 %, 15.7 → 12.6 HP; greedy bot loses 0 of 70 (was 1 %); overall mixed 41 % unchanged (98 → 99 wins / 240). It stays the hardest Act 2 elite on purpose — it punishes standing in ground fire.
- Card value, measured (`engine/card-value.report.ts`, added): two extra copies of each card in a starter deck vs. none, six encounters, same seeds. Independent seed sets agree at r = 0.90–0.97, so it is signal, not noise. **The first run (greedy bot) was biased**: it showed Guard cards (`bulwark`, `guard_protocol`, `suah_living_metal`) as the weakest cards, but a free Guard on the connector does nothing for the greedy bot (it already takes ~2.5 HP per Act 3 fight and over-values Guard in its evaluation) while for the mixed bot it cuts HP lost 12.0 → 7.5 (Guard 4) → 5.5 (Guard 8). Under the mixed bot those three are average. Standalone strongest (mixed): `hot_wire`, `blink_strike`, `shield_bash`, `vector_kick`; weakest under **both** bots: `afterburner`, `serin_undertow`, `kinship` — all setup/synergy cards (draw engine for the Overclock pack, a pull that needs a collision, a long-fight Guard power), which a starter-deck test undervalues by construction. **No card was changed**: a standalone number cannot justify retuning a synergy card. Watch list for real-play data, not a tuning order. The earlier crude points-per-energy list (static, ignores statuses) is superseded and wrong about `hot_wire`.
- Greedy bot baseline note: 98–99 % over 240 runs on these blocks (the docs' 100 % was a different 360-run sample); it was 98 % before this change.

## 2026-10-11 — Event balance audit + guard (and a correction)

- **Correction**: the wave-4 entry says "the sim does not resolve events". It does — `runSim.decideEvent` picks the best expected-value option with `outcomeValue`; I had read a field that doesn't exist. Balance of events was therefore measurable all along.
- Audit (`outcomeValue` per option at a mid-run state, stats 4 and 6): the new street-level events sat at the bottom of their acts — 5 had every open option net-negative, i.e. a pure tax. Retuned `a1_bus_stop_scan`, `a1_hand_crank_lamp`, `a2_toll_bridge_kids`, `a2_lantern_ferry`, `a2_face_stall`, `a3_name_archive`, `a3_maintenance_priest`, `a3_serin_inside_line` (small credit / ◈ / HP gains, lighter failures, a few DCs 7→6); all open-option bests are now ≥ 0.7. The five arc finales intentionally tie at 10 (gated behind two earlier parts); `a3_ix_offer` (21.7) is the deliberate outlier.
- New `engine/event-balance.test.ts` locks it: best open option ≥ 0.5 and ≤ 12 for every rolled event, with two named exceptions (`a3_blank_in_list` — an authored heavy-trade twist the scale undervalues; `a3_ix_offer`) and a check that exemptions don't go stale. `runSim.outcomeValue` is now exported for it.
- Sim A/B on identical seeds (mixed bot, 3 blocks × 60): before any event wave 72/180 (40 %) → after the waves 74/180 (41 %) → after this retune 78/180 (43 %). Differences are inside the ±5 pp noise; the 30 extra events did not move difficulty.
- Continuity fix: `a3_kai_name_given` no longer assumes the umbrella was bought (touch-only path).

## 2026-10-11 — Companion arcs for Tae-o, Han, Se-rin, Kai and Lin-yue (15 events)

- Same shape as the Su-ah arc (`content/eventsArcs.ts`): three events per companion (Act 2 → Act 3 → Act 3), event-level gated on that companion being in the party, later parts read the flag the earlier one set; each picks up the thread their lore entry leaves open. **Tae-o** "처리 대기" (the wanted board → the pending file → holding the line; flags `taeo_trail`, `taeo_cleared`) · **Han** "구경하는 버그" (the blank registration booth → the first poke at IX → the empty reply "user unrecognized"; `han_probe`, `han_poked`) · **Se-rin** "열세 번째 선" (the radio that answers → the hidden line inside → finishing the chalk line; `serin_signal`, `serin_line`).
- 9 scene images (portrait-referenced; 9 calls, 0 failures, ledger 248), manifest + SPA rebuilt. `engine/suah-arc.test.ts` now drives all four arcs through the real reducers (companion gating, a sure no-check path to the first flag, the second flag opening the payoff). Pool: 62 events.
- **Kai** "노란 우산" (umbrella stall → crosswalk footage → the day he was named; `kai_clue`, `kai_found`) and **Lin-yue** "붉은 페이지" (crew roll → the Moonlight lot → the last entry; `linyue_crew`, `linyue_names`) followed in the same pass (6 more images, ledger 254) — every companion now has a 3-event arc; pool 68 events. The arc test table covers all five in `engine/suah-arc.test.ts`.

## 2026-10-11 — Su-ah arc: the voice in the drawer (3 events)

- Su-ah (the 4th companion) had the fewest dedicated events, and the Memory Forge leaves her "mother's voice in the drawer" as a thread nobody picks up. `content/eventsMore.ts` `SUAH_ARC`: `a2_suah_first_pour` (add a memory / pay 45 ₵ / tell her to stop) → sets `suah_voice`; `a3_suah_voice_archive` (listen needs `suah_voice`; or copy the file; or pull the plug) → sets `suah_voice_heard`; `a3_suah_last_pour` (only after the voice was heard: forge defence / edge / just stay). All three are event-level gated on Su-ah being in the party, so they never roll for other parties. 3 scene images (portrait-referenced), SPA rebuilt.
- New `engine/suah-arc.test.ts` drives the real reducers: gating by companion, the flag chain, bond/credit/max-HP effects.
- Guard rails added with it: a content invariant (a flag may be read only in the act where it can already have been set — a flag set only in a later act would lock its reader forever) and `build_overview` edge-case tests (empty input, `days` clamp, the KST midnight split, odd run fields).
- Verified: `make test-v2`, `make test-e2e-v2`. Pool is now 53 events.

## 2026-10-11 — Durable AI GM usage counters (dashboard)

- The GM counters lived in process memory (lost on every Cloud Run restart), so there was no basis to decide on a cost guard. `v2_gm_usage` (migration 013, also in `SCHEMA_STATEMENTS`) counts calls per KST day / route / outcome; `log_gm` writes it best-effort (2 s cap, never fails or delays a reply beyond that). Dashboard: "AI GM 일별 호출" — total, LLM, fallback and the fallback rate, plus the outcome mix (timeout / rate_limited / rejected …).
- Decision: the GM cost guard stays off (owner: none for now); revisit when this table shows real volume (≈ $0.085 per run measured).
- Not done on purpose: re-seeding the overnight held-out bank — `scripts/overnight/heldout-bank.md` is the owner-ratified frozen v1 and its three tasks target 1.x code that now lives on branch `1.0`; replacing it needs a recorded owner decision.

## 2026-10-11 — Event wave 4: 12 new street-level events (16 per act)

- Goal from the owner: "계속해서 2.0의 퀼리티 업그레이드 및 잔여작업 수행해". A veteran meets ~3 events per act from a pool of 12, so repeats showed up after a few runs; each act now rolls from 16.
- `content/eventsMore.ts`: 4 per act (noodle stall, hand-crank lamp, courier lockbox, bus-stop scan beam · lantern ferry, face stall, toll kids, stalled maglev · glass atrium, name-tag archive, maintenance priest, window cleaner). Each has a stat-check option with a stinging failure, a no-risk option and a trade-off; no companion conflict and no new flags, so they roll in any order. 12 scene images (`scripts/v2_assets`, 12 calls, 0 failures; `V2_IMAGE_BUDGET=250` for the run since the ledger was already past the old 220), art manifest rebuilt, SPA rebuilt.
- **Deployed** as rev `00095` together with the new-players metric (migration 012 ran on first use; preview smoke: health postgres, bundle + art served, overview 401 unsigned) and promoted to 100 %.
- Verified: `make test-v2` 221, `make test-e2e-v2`, sim mixed bot 35/90 = 39 % (inside the 28–41 % band; the sim does not resolve events, so event balance rests on the narrative tests and the numbers matching existing events' ranges).

## 2026-10-11 — Operator dashboard for 2.0 (`/admin`)

- Owner: "Admin용 대시보드는 어디갔어?" → "내 계정으로 admin을 잡고, 2.0용으로 새로 만들고싶어". The 1.x invite-key dashboard stayed on branch `1.0`; 2.0 gets a new one.
- **Server**: `mythos_v2/admin.py` (pure aggregation + `GMStats`), `V2Store.admin_players/admin_runs/admin_daily` (Memory + Postgres, field-subset SQL so full blobs are never pulled), `auth.Identity` / `verify_identity` (email + email_verified), `MYTHOS_ADMIN_EMAILS`, `GET /api/v2/admin/overview?days=` (401/403/429), `GET /admin` (no-store, noindex). Local shortcut `MYTHOS_ADMIN_OPEN=1` in `open` mode only. `make deploy*` pass `.env`'s `MYTHOS_ADMIN_EMAILS`.
- **Page**: KPIs, per-day stacked chart, archetype win rates, killers/endings, today's daily board, GM/server block, player roster with active run + last run; 30 s refresh; every string escaped.
- **Deployed** (owner: "일단 배포해"): `make deploy-preview` → rev `00093`; smoke on the preview URL (health postgres + gemini, `/admin` 200 no-store, overview 401 for no/forged token and `X-Player-Id`) → `update-traffic --to-latest` (100 %). A real Google sign-in on `/admin` is still the owner's check.
- **Follow-up (not yet deployed)**: `v2_saves.created_at` (migration 012, also in `SCHEMA_STATEMENTS`, so the self-creating DDL adds it on first use) → dashboard "신규 가입" (24 h / 7 d KPI, per-day, roster join age). Existing rows read as the migration time.
- Verified: `tests/test_v2_admin.py` (access matrix, aggregation, page), store contract on memory + Postgres (`make test-db`), headless render of the real payload with a stubbed Firebase. **Not verified**: a real Google sign-in on `/admin` (needs the owner's browser) and production (not deployed).

Older entries: `bin/docs/archive/progress-2026-*.md` (2.0 build: `progress-2026-10-10-mythos2-overnight-build.md`; 2.0 feedback round + residuals: `progress-2026-10-11-mythos2-early.md`; sign-in, leaderboard, Android, 1.x archive: `progress-2026-10-11-mythos2-online.md`); 1.x: branch `1.0`.
