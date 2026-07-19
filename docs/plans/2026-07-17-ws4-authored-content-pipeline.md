# WS4 (final slice) — Authored-content pipeline: brief → codex gen+wire → judge relay → human adopt

Date: 2026-07-17. Status: **design (plan-only item consumed)**. Closes the last open WS4 line in
`NEXT_PLAN.md` ("agy→codex authored-content pipeline"). Supersedes the WS4 sketch in
`bin/docs/plans/2026-06-14-engineering-plan.md` §WS4; sibling of the shipped image-regen loop
(`bin/docs/plans/2026-06-20-ws4-image-regen-loop.md`).

## What changed since the 06-14 sketch (why this design differs)

1. **Owner directive 2026-07-06: curated key art = codex** — art *and* wiring both live in the codex
   lane (style match with the existing curated set). The old "agy drafts → codex reviews" split is
   obsolete for curated content; agy's content role is now **draft-only exploration** and browser QA.
2. **The generate→judge→refine loop already exists** (`scripts/overnight/image-regen.sh`, live-validated)
   and the **image-identity judge relay** (`OVERNIGHT_IMAGE_JUDGE=1`, `run.sh`) already auto-reverts
   canon-mismatched art commits. This plan does not rebuild either.
3. **A2A decision 2026-07-12**: inter-engine cooperation = runner-mediated one-shot relays, never live
   sessions. The pipeline below is therefore a *ledger of seeds and gates*, not a conversation.
4. **Proven end-to-end run 2026-07-14** (enemy art 20/20): brief plan → per-pose codex `exec` prompts →
   collect from `~/.codex/generated_images` → claude vision judge vs canon → alpha post-process →
   promote → integrity tests → sim render. That run IS this pipeline executed by hand; this doc
   standardizes its artifacts so the next need doesn't re-derive the procedure.

## Pipeline (5 stages, engine per stage)

| Stage | Artifact | Engine | Gate |
| --- | --- | --- | --- |
| 1. Brief | `docs/plans/YYYY-MM-DD-<content>.md` — canon description (text-only; codex has no vision), target files, pose/shot list, style siblings | claude (from owner intent / audit finding) | human GO on the brief |
| 2. Seed | `NEXT_PLAN.md` `[auto:codex]` item + 1-line completion criterion linking the brief | claude | tag rules (`LOOP.md` §3) |
| 3. Generate + wire | art via codex in-session gen (`gen_*.sh` resume-safe, per-call timestamp collection) + `postprocess.py` (alpha strip / fit) + scenario.json / curated-ref wiring | codex | `make check` + `make validate-content` + `tests.test_image_assets` |
| 4. Judge relay | claude vision judge vs canon siblings (green-screen/identity/style rejects → re-roll); runner-side `OVERNIGHT_IMAGE_JUDGE` auto-revert backs this up on commit | claude (one-shot) | judge PASS per asset |
| 5. Adopt | promote to `resources/<scn>/…`, evidence under `outputs/live-qa/manual-<date>-<topic>/`, sim render check | human feel verdict (aesthetic sign-off stays owner) | owner |

Reusable tooling contract (from the 07-14 run, kept in `outputs/codex-art-0714-enemies/`):
`gen_<topic>.sh` (one image per target, newest-PNG-after-marker collection, resume-safe) +
`postprocess.py` (border-connected flood fill + two-tone checker detection — codex paints fake
checkerboard alpha) are the canonical templates; copy per content batch, don't generalize into a
framework until a third real batch demands it.

## Text-content variant (bible snippets / cutscenes / directives)

Same skeleton, two substitutions: stage 3 = codex authors KO/EN content (bible.json / cutscene md /
directive md) under existing schema locks; stage 4 = **semantic critic** (existing runner relay) +
`make validate-content` instead of the vision judge. Register/naming rules stay authoritative
(`directives/naming.md`, narrative-register memory). Korean narrative voice remains the owner's
review surface — text content NEVER auto-adopts.

## Boundaries (unchanged)

- Orchestration is human-launched or overnight-seeded (`[auto:codex]`); no live A2A.
- Drafts stay in `outputs/` (gitignored); only judge-passing assets touch `resources/`.
- agy lane: image drafts + browser QA only; FLUX fallback is orchestrator-driven, never agy-driven.
- Aesthetic/tonal adoption defaults to human; `AUTO_ADOPT` stays off for curated content.

## Done / validation

- This design consumes the plan-only item; **implementation is on-demand** — the next real content
  need (e.g. Glass Library art depth when un-held, or a new Neo-Seoul set-piece) executes stages 1-5
  and validates the doc. No code changes required now (all gates/relays already exist).
