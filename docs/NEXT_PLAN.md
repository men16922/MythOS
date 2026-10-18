# Next Plan

Last updated: 2026-10-18

Open work only. Finished tracks are in `COMPLETED_SUMMARY.md`; the 1.x plan (paused tracks, Dev Graph holds, serving research) is archived with the 1.x code on branch `1.0`. Strategy & market roadmap: `docs/plans/2026-10-18-strategy-and-market-analysis.md`.

## Priority 0 — ship Mythos 2.0

Rules: `docs/GAMEPLAY.md` · design/contract: `docs/plans/2026-10-10-mythos-2.0.md` · owner guide: `docs/test/mythos2_first_play.md` · Android: `docs/android.md` · Veo manual guide: `docs/test/veo_gemini_owner_guide.md`.

- `[x]` **SFX differentiation & boost** — fixed the 4 flagged overlap/level groups (`hit_light`/`bump`/`explosion`, `kill`/`void`, `swing`, `alarm`) in `src/mythos_ui/src/v2/ui/common/sfx.ts` (2026-10-18). `[ ]` `[manual]` Optional owner listen check via `outputs/sfx-review/index.html`.
- `[x]` **Trailer recut & Veo hard-block** — added `HAETAE` boss caption (`veo/haetae`), shifted `06_ix_win` to `59.8s`, and recut `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` via local `ffmpeg` (0 API calls); blocked Vertex Veo API in `gen_veo.py` and documented manual Gemini Web workflow in `docs/test/veo_gemini_owner_guide.md` (2026-10-18). `[ ]` `[manual]` Optional owner watch check.
- `[ ]` `[manual]` **Android release** — follow `docs/play-store.md` "Owner steps": Play Console account ($25; a new personal account needs a 12-tester × 14-day closed test before production — recruit testers now), `MYTHOS_CONTACT_EMAIL` in `.env` + deploy-preview → verify → promote (the `/privacy` and `/account-deletion` pages and in-app account deletion / AI-line reporting ship with it), grant `roles/firebaseauth.admin` to `mythos-run@` (command in the sheet), upload keystore → `VERSION_CODE=1 make android-aab`, paste the prepared listing / Data safety / content-rating answers, upload `outputs/play-store/` graphics (`scripts/android/store_assets.py`).


## AI expansion & quality (updated 2026-10-18)

Done 2026-10-17–18: Settings "AI 대사 사용"; IX loop memory; chronicle uses typed Improvise actions + outcomes; talking-enemy taunts (5 personas, `mythos_v2/taunt.py` ↔ `content/taunts.ts`); déjà-vu event openings (`profile.eventsSeen`); GM eval set `make gm-eval` (baselines in `outputs/gm-eval/`); `_balance_quotes()` quote-truncation fix + `_ACT_SENSORY` act sensory palettes in `gm.py`; `on_late_usage=budget.charge` timeout spend accounting in `api.py`; `ix_timeout=5.5s` (`api.py` + `gm.ts`). Owner call 2026-10-17: only IX remembers loops; companions get a faint déjà vu in the safehouse chat (`loopsTogether`). Rejected: runtime image generation, LLM-made cards/enemies or map direction (critical path, balance, daily comparability).

## Tiers + CRPG layer (built 2026-10-18)

Built W0–W5 (`docs/plans/2026-10-18-tiers-and-ai-narrative.md` §9) + Act 1 free district trial (`CrpgRunState.trial`) + combat-twist HUD badges (`.m2c-mod-badge`). Left:
- `[ ]` `[manual]` Play: create `signal_plus_monthly`, merchant profile, service-account access (`docs/play-store.md` step 7), then one license-tester purchase on a device → `/plan` shows plus.
- `[x]` Promoted `00131` 2026-10-18; older revisions deleted. Owner confirmed 2026-10-18: ₩3,900, allowances $0.30 / $1.50, `MYTHOS_V2_GM_DAILY_USD` 20. `[ ]` `[manual]` Optional: set `MYTHOS_GM_PRICE_*` to Google's list price once known, and deploy current `mythos-2.0` (`make deploy-preview` → `make verify-preview` → promote).
- `[ ]` After real play: more districts if players finish all six.

## After the first wave of players

- `[ ]` Balance from real play (numbers live in `v2/content`; measure with `simulateRun` on fixed seed blocks before/after). Watch list of possibly strong/weak cards from the 2026-10-11 audit is in `PROGRESS_LOG.md`; check the dashboard's killers and win rates first.
- `[ ]` Play Games Services (after the Play account): game + daily leaderboard ids, mirror `/api/v2/daily` bests, achievements.
- `[x]` GM cost guard — done 2026-10-18: per-player monthly allowance, $20/day global ceiling (`mythos_v2/budget.py`), late-usage charging on timed-out calls (`api.py`), and the ₩30,000/month Vertex spend cap that disables the API (`docs/online.md`).
- `[ ]` Companion arcs are done for all six (3-event flag chains); a further event wave only if players report repetition (each act now rolls from 16 events; scenes with art cost one image call each — see `scripts/v2_assets/ledger.json`).

- `[x]` **1.x port & voice pins** — verdicts for all 22 candidates in `docs/plans/2026-10-11-port-from-1x.md`. Recommended 8×2 KO/EN voice-over candidates pinned in `resources/neo-seoul/v2/voice/voices.json` (2026-10-18); batch TTS generation remains gated on explicit owner approval (paid ElevenLabs API). The store promo video is `outputs/trailer/cinematic/mythos2_cinematic_store.mp4` (`make cinematic`) — only its Play Console upload is waiting on the account.

## Agent operations

- Held-out bank v2 (2.0 tree) ratified and model pins kept, 2026-10-13 (`DECISIONS.md`). Unattended loops on the 2.0 tree need explicit `[auto:*]` seeds here (`overnight-harness:overnight-seed`); none are queued.
