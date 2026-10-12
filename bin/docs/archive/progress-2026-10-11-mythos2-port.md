# Progress archive — 2026-10-11, Mythos 2.0 (1.x port Wave 1, GM cost, stat voices)

Moved from `docs/PROGRESS_LOG.md` on 2026-10-13 (doc budget).

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

- Older entries: `bin/docs/archive/progress-2026-10-11-mythos2-late.md` (event balance audit, combat balance pass).
