# Next Plan

Last updated: 2026-10-24

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`. Strategy & market roadmap: `docs/plans/2026-10-18-strategy-and-market-analysis.md`.

## Priority 0 — global showcase & improvement waves (owner direction 2026-10-24)

Plans: `docs/plans/2026-10-24-improvement-and-direction-plan.md` (Waves 1–4 + data-backed recommendations) · `docs/plans/2026-10-24-global-showcase-2026.md` (rest-of-2026 roadmap). Go global, framed as the owner's cloud-architect portfolio; target = the next Google Gemini / Cloud developer challenge on Devpost (expected Dec–Mar, unannounced), fallback = public write-up + talk CFPs. Korean contests move to 2027 spring.

- `[x]` **Wave 1 — AI visibility, UX-first cut** (2026-10-24, `DECISIONS.md`): `narrateLine()` keeps provenance (local / server-fallback lines are no longer logged or flagged as AI); one small `✦ AI` mark on model lines in the GM card, IX comms, enemy taunts, companion chat and the GM ruling; three one-tap Improvise ideas for the player's top stats (`improvSuggest.ts`, worded so the local judge reads the same stat). Dropped per owner: TopBar AI chip, intent-% and memory tags. NPC talk (`DialogueScreen`) mark + report flag + Settings list added the same day.
- `[x]` **Wave 2 — player HP 42/40/44 → 34/32/36** (2026-10-24, owner pick after the trade-off was shown): mixed win 44 → 32 %, greedy ~96 %, basic 0 % (3 × 360, same blocks). Extra deaths land at bosses (Act 1 boss loss 3.6 → 9.8 %, `a3_boss_ix` 19 → 27 %); Act 1 normal fights still cost ~2 HP. `[ ]` `[owner]` feel check; if Act 1 still feels safe, tune `a1_*` telegraph damage instead of HP.
- `[x]` **Wave 3 — Architect HUD** (2026-10-24, opt-in `?hud=1` only; phones start folded to a tab): `ui/common/telemetry.ts` records every GM call's outcome (llm / server fallback / local / off) + latency in `gm.ts`; `ArchitectHud.tsx` shows calls, LLM share, median latency vs the 0 ms authored line, the AI allowance, run seed + named streams used, daily replay steps. Not built (UX-first, judge value low): clamped-output diff view.
- `[~]` **Wave 4 — Global English entry & phone UX**: `[x]` `?lang=en|ko` link param (2026-10-24; pins and saves the language, no default change); `[owner OK: default change]` `navigator.language` auto-default for brand-new profiles; English first-session audit (`[x]` 2026-10-24 phone title → setup → event → map: no overflow) + `390×844` combat density polish (`[x]` coach tips off the board, 2-row top bar; hand-card text at phone width: checked — a tap shows the full text in the info strip, left as is). Schedule below (Waves 1–3 must not push W0 past 11-07).
- `[~]` W0 (→ 11-07): `[x]` `docs/contest/architecture-en.md` + mermaid diagram (2026-10-24); `[x]` English first-session audit (`lang=en`, phone, clean); `[ ]` English `make gm-eval` slice on local Ollama.
- `[ ]` W1 (Nov): `[owner OK]` judge links open in English (Wave 4); English text quality pass; English trailer captions.
- `[ ]` W2 (12-01→14): `[owner]` fun check → fixes; phone combat feel; `[owner]` demo-code deploy.
- `[ ]` W3 (12-15→31): 3-min English video, Devpost text, `[owner]` public-repo decision.

## Priority 0b — commercial-grade polish + contest readiness (owner goal 2026-10-18)

Paid Play release and Signal+ are on hold (`DECISIONS.md` 2026-10-18). Goal: fun and play experience at or above commercial roguelites, plus distinctive AI features, demo-ready for contests.

- `[x]` **Named RNG streams** (`engine/streams.ts`, 2026-10-18) — dailies are one run for everyone (maps, fights, rewards, shops per node), shuffle ≠ enemy AI, order-free reshuffle; legacy saves unchanged.
- `[x]` **Replay-verified daily board** (2026-10-18) — client logs committed daily actions (`ui/replay/`), server replays them (`mythos_v2/replay.py` + `replay_verify.mjs`), shield badge on verified rows; ranking unchanged (`DECISIONS.md`). Needs the next deploy (Dockerfile adds `nodejs`, migration 018 self-applies).
- `[~]` **Fun / experience audit → fixes** — pass 1 done 2026-10-18 (GM fallback lines, IX overlay, coach timing, implant overflow, phone top bar + directive fold, NPC portraits, cache art; `PROGRESS_LOG.md`). Next pass: combat feel at phone width, English text pass, shop/rest art parity.
- `[~]` **Judge-visible AI** — built 2026-10-18, off by default: `MYTHOS_DEMO_CODES` + a `?demo=<code>` link give a signed-out device AI lines on the free allowance (GM + `/plan` only; `docs/online.md` "Contest demo codes"). `[ ]` `[owner]` choose a code, add it to `.env`, deploy-preview → verify → promote, then put the link in the submission.
- `[~]` **Contest kit** — English write-up done (`docs/contest/pitch-en.md`, 2026-10-18). AI-features clip recorded from the real UI with real model lines (`record_trailer.py --scenes ai --gm` → `outputs/trailer/ai/mythos2_ai_features.mp4`, 56 s: Improvise ruling, NPC talk, a companion recalling this run's choice, IX at a boss). Left: combine with the store cut into one 60–90 s video, judge-accessible demo (see the owner call below), pick the next deadline (§5 of the strategy doc).

## Priority 1 — ship Mythos 2.0 (on hold: paid release)

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md` · Veo manual guide: `docs/test/veo_gemini_owner_guide.md`.

- `[x]` **SFX differentiation & boost** — fixed the 4 flagged overlap/level groups (`hit_light`/`bump`/`explosion`, `kill`/`void`, `swing`, `alarm`) in `src/mythos_ui/src/v2/ui/common/sfx.ts` (2026-10-18). `[ ]` `[manual]` Optional owner listen check via `outputs/sfx-review/index.html`.
- `[x]` **Trailer recut & Veo hard-block** — added `HAETAE` boss caption (`veo/haetae`), shifted `06_ix_win` to `59.8s`, and recut `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` via local `ffmpeg` (0 API calls); blocked Vertex Veo API in `gen_veo.py` and documented manual Gemini Web workflow in `docs/test/veo_gemini_owner_guide.md` (2026-10-18). `[ ]` `[manual]` Optional owner watch check.
- `[hold]` `[manual]` **Android release** (owner hold 2026-10-18) — follow `docs/play-store.md` "Owner steps": Play Console account ($25; a new personal account needs a 12-tester × 14-day closed test before production — recruit testers now), `MYTHOS_CONTACT_EMAIL` in `.env` + deploy-preview → verify → promote (the `/privacy` and `/account-deletion` pages and in-app account deletion / AI-line reporting ship with it), grant `roles/firebaseauth.admin` to `mythos-run@` (command in the sheet), upload keystore → `VERSION_CODE=1 make android-aab`, paste the prepared listing / Data safety / content-rating answers, upload `outputs/play-store/` graphics (`scripts/android/store_assets.py`).


## AI expansion & quality (updated 2026-10-18)

Done 2026-10-17–18: Settings "AI 대사 사용"; IX loop memory; chronicle uses typed Improvise actions + outcomes; talking-enemy taunts (5 personas, `mythos_v2/taunt.py` ↔ `content/taunts.ts`); déjà-vu event openings (`profile.eventsSeen`); GM eval set `make gm-eval` (baselines in `outputs/gm-eval/`); `_balance_quotes()` quote-truncation fix + `_ACT_SENSORY` act sensory palettes in `gm.py`; `on_late_usage=budget.charge` timeout spend accounting in `api.py`; `ix_timeout=5.5s` (`api.py` + `gm.ts`). Owner call 2026-10-17: only IX remembers loops; companions get a faint déjà vu in the safehouse chat (`loopsTogether`). Rejected: runtime image generation, LLM-made cards/enemies or map direction (critical path, balance, daily comparability).

## Tiers + CRPG layer (built 2026-10-18)

Built W0–W5 (`docs/plans/2026-10-18-tiers-and-ai-narrative.md` §9) + Multi-boss pool (`jujak_core`, `arachne_queen`), 5-choice `a1_opening`, Chapter Tactical Directives (`engine/directives.ts`), Act 1 `localNarrate` / `CompanionWhisper` / `SOLO_BANTER`, full CRPG web access, dynamic Act 1 BGM, and combat-twist HUD badges (`.m2c-mod-badge`). Left:
- `[hold]` `[manual]` Play: create `signal_plus_monthly`, merchant profile, service-account access (`docs/play-store.md` step 7), then one license-tester purchase on a device → `/plan` shows plus.
- `[x]` Promoted `00113-w55` (`git-sha=3f2bf81`, 100% `LATEST`, 2026-10-18; rollback `00133-pab`). Owner confirmed 2026-10-18: ₩3,900, allowances $0.30 / $1.50, `MYTHOS_V2_GM_DAILY_USD` 20. `[ ]` `[manual]` Optional: set `MYTHOS_GM_PRICE_*` to Google's list price once known.
- `[ ]` After real play: more districts if players finish all six.

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after). Watch list of possibly strong/weak cards from the 2026-10-11 audit is in `PROGRESS_LOG.md`; check the dashboard's killers and win rates first.
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[x]` GM cost guard — done 2026-10-18: per-player monthly allowance, $20/day global ceiling (`mythos_v2/budget.py`), late-usage charging on timed-out calls (`api.py`), and the ₩30,000/month Vertex spend cap that disables the API (`docs/online.md`).
- `[ ]` Companion arcs are done for all six (3-event flag chains); a further event wave only if players report repetition (each act now rolls from 16 events; scenes with art cost one image call each — see `scripts/v2_assets/ledger.json`).

- `[x]` **1.x port & voice pins** — verdicts for all 22 candidates in `docs/plans/2026-10-11-port-from-1x.md`. Recommended 8×2 KO/EN voice-over candidates pinned in `resources/neo-seoul/v2/voice/voices.json` (2026-10-18); batch TTS generation remains gated on explicit owner approval (paid ElevenLabs API). The store promo video is `outputs/trailer/cinematic/mythos2_cinematic_store.mp4` (`make cinematic`) — only its Play Console upload is waiting on the account.

## Agent operations

- Held-out bank v2 (2.0 tree) ratified and model pins kept, 2026-10-13 (`DECISIONS.md`). Unattended loops on the 2.0 tree need explicit `[auto:*]` seeds here (`overnight-harness:overnight-seed`); none are queued.
