# Progress log — archived 2026-10-12

Moved out of docs/PROGRESS_LOG.md by the doc budget (oldest entries first): the 2.0 event waves, companion arcs, balance audits and the card-value report.

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

## 2026-10-11 — Companion arcs for Tae-o, Han, Se-rin, Kai and Lin-yue (15 events)

- Same shape as the Su-ah arc (`content/eventsArcs.ts`): three events per companion (Act 2 → Act 3 → Act 3), event-level gated on that companion being in the party, later parts read the flag the earlier one set; each picks up the thread their lore entry leaves open. **Tae-o** "처리 대기" (the wanted board → the pending file → holding the line; flags `taeo_trail`, `taeo_cleared`) · **Han** "구경하는 버그" (the blank registration booth → the first poke at IX → the empty reply "user unrecognized"; `han_probe`, `han_poked`) · **Se-rin** "열세 번째 선" (the radio that answers → the hidden line inside → finishing the chalk line; `serin_signal`, `serin_line`).
- 9 scene images (portrait-referenced; 9 calls, 0 failures, ledger 248), manifest + SPA rebuilt. `engine/suah-arc.test.ts` now drives all four arcs through the real reducers (companion gating, a sure no-check path to the first flag, the second flag opening the payoff). Pool: 62 events.
- **Kai** "노란 우산" (umbrella stall → crosswalk footage → the day he was named; `kai_clue`, `kai_found`) and **Lin-yue** "붉은 페이지" (crew roll → the Moonlight lot → the last entry; `linyue_crew`, `linyue_names`) followed in the same pass (6 more images, ledger 254) — every companion now has a 3-event arc; pool 68 events. The arc test table covers all five in `engine/suah-arc.test.ts`.

## 2026-10-11 — Su-ah arc: the voice in the drawer (3 events)

- Su-ah (the 4th companion) had the fewest dedicated events, and the Memory Forge leaves her "mother's voice in the drawer" as a thread nobody picks up. `content/eventsMore.ts` `SUAH_ARC`: `a2_suah_first_pour` (add a memory / pay 45 ₵ / tell her to stop) → sets `suah_voice`; `a3_suah_voice_archive` (listen needs `suah_voice`; or copy the file; or pull the plug) → sets `suah_voice_heard`; `a3_suah_last_pour` (only after the voice was heard: forge defence / edge / just stay). All three are event-level gated on Su-ah being in the party, so they never roll for other parties. 3 scene images (portrait-referenced), SPA rebuilt.
- New `engine/suah-arc.test.ts` drives the real reducers: gating by companion, the flag chain, bond/credit/max-HP effects.
- Guard rails added with it: a content invariant (a flag may be read only in the act where it can already have been set — a flag set only in a later act would lock its reader forever) and `build_overview` edge-case tests (empty input, `days` clamp, the KST midnight split, odd run fields).
- Verified: `make test-v2`, `make test-e2e-v2`. Pool is now 53 events.
