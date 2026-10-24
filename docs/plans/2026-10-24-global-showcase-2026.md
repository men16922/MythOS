# Global showcase plan — rest of 2026 (2026-10-24 → 2026-12-31)

Owner direction 2026-10-24: go **global**, and make the project useful to the owner's career as a **cloud architect +
developer** (not as a game developer). The game stays the vehicle; the deliverable is evidence of a production AI
system designed and operated on Google Cloud. Paid Play release / Signal+ stay on hold (`DECISIONS.md` 2026-10-18);
Korean indie contests (IndieGo, 인디크래프트, GIGDC, 비버롹스) move to the 2027 spring season.

## Target

Be ready, by the end of December, to submit within days of the next **Google Gemini / Google Cloud developer
challenge on Devpost**. Pattern so far (not yet announced for this winter — unverified): Gemini 3 Hackathon
2025-12-17 → 2026-02-09; Gemini Live Agent Challenge 2026-02-16 → 03-16 (Gemini + a Google Cloud service required;
grand prize included a Cloud Next stage slot). Cloud Next 2027 is 2027-04-13–15. Themes change per edition, so the
package must be easy to re-angle.

If no fitting challenge is announced, the same package ships as a public technical write-up + talk submission
(GDG DevFest / Cloud Next Extended CFPs on Sessionize) — groundwork for a Google Developer Expert (Cloud/AI) application.

Checked 2026-10-24 and rejected: IGF 2027 (closed 09-13), Build with Gemini XPRIZE (closed 08-17), late-October
hackathons on other clouds (Nebius×NVIDIA, Meta, Open Agent — would need a rebuild on another stack).

## What to show (architect angle)

1. **AI off the critical path** — authored text renders first; every model call has an authored fallback; AI never
   decides outcomes (Improvise and NPC talk are clamped into fixed engine ranges).
2. **Tail latency** — measured Vertex 504s at ~7 s; per-request timeout + one hedged retry after 4 s
   (`mythos_v2/llm.py`, `MYTHOS_V2_GM_HEDGE_S`); late answers still charged (`on_late_usage`).
3. **Cost governance** — per-user allowances, daily USD cap, measured cost per run (`mythos_v2/budget.py`),
   Vertex spend-cap function (`scripts/ops/vertex_cap`).
4. **Trust without a game server** — deterministic TS engine with named RNG streams; the server replays committed
   daily actions to verify leaderboard rows (`mythos_v2/replay.py`, `ui/replay/`).
5. **Operations** — Cloud Run preview → verify (`make verify-preview`, `git-sha` label) → promote; Firebase sign-in;
   offline-first client; Postgres with memory fallback; quality gate (`make check`, UI bot playthroughs, `make gm-eval`).

## Facts that shape the work (verified 2026-10-24)

- The game is already bilingual: every content `Text` is `{ko, en}` and `content.test.ts` rejects a missing `en`;
  the GM/companion/IX prompts take `lang` (`gm.py` `Lang`), and `scripts/dev/gm_eval.py` has English cases.
- But a judge's first visit opens in **Korean**: new profiles default to `lang: 'ko'` (`engine/meta.ts`), and there is
  no `?lang=` link parameter or browser-language default.
- The trailer captions are Korean (`scripts/trailer/record_trailer.py`); `docs/contest/pitch-en.md` is dated 10-18.

## Phases

### W0 · 10-24 → 11-07 — architecture write-up + English audit
- `[ ]` `docs/contest/architecture-en.md`: the five points above with the measured numbers and file pointers, plus
  one architecture diagram (request path, fallbacks, budget, replay verify, deploy flow). Source of the Devpost
  text, a blog post and a README.
- `[ ]` English first-session audit: play the first ~10 minutes with `lang=en` (headless, muted, one tab), list
  hard-coded Korean, awkward English, overflow/clipping; fix in `v2/content` / `v2/ui`.
- `[ ]` `make gm-eval` English slice on local Ollama (free); one Vertex run only with the owner's OK.

### W1 · November — English as a first-class entry
- `[ ]` `[owner OK: default change]` Demo/judge links open in English: `?lang=en` link parameter, and/or the
  browser language for brand-new profiles only (existing saves keep their setting).
- `[ ]` English text quality pass over cards, events, companions, IX lines (register rule: repetition
  is the problem, not abstract SF terms; plain screenplay action-lines except in deliberately strange scenes).
- `[ ]` More English GM eval cases (Improvise ruling, NPC talk) and a baseline file.
- `[ ]` Trailer: English caption track for the AI cut.

### W2 · 12-01 → 12-14 — polish + public demo
- `[ ]` `[owner]` Fun check (`docs/test/mythos2_fun_check.md`), ideally once in English → fix what it flags.
- `[ ]` Combat feel at phone width (375–412 px), shop/rest art parity.
- `[ ]` `[owner]` Demo code deploy: preview → `make verify-preview` → promote; judge link `<URL>/?demo=<code>&lang=en`.

### W3 · 12-15 → 12-31 — submission package
- `[ ]` 3-minute English video: gameplay + the AI features clip + the architecture diagram (local `ffmpeg`;
  Vertex Veo API stays banned).
- `[ ]` Devpost-style text (problem, build, Google Cloud services used, challenges, what's next) from W0.
- `[ ]` `[owner decision]` Public code: a new curated public repo vs cleaning this one (no `.env`, keys, keystores,
  `google-services.json`, `.firebase/`, `outputs/`).
- `[ ]` When the challenge is announced: re-angle to its theme, submit.

## Owner decisions

1. Default-language change for judge links (W1).
2. Public repository shape (W3).
3. Employer side-job rules for prize money / public talks (the reason monetization was held).
4. Vertex spend for English eval runs and the demo period.

## Not this year

Play release, Signal+, new districts/cards, Korean contest submissions (2027 spring: IndieGo 3–4월,
인디크래프트 4–5월, GIGDC 6월, 비버롹스 ~7월 — dates from the 2026 editions).
