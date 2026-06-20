# WS4 — Image regenerate-on-reject loop (agy draft → vision judge → codex prompt-refine → FLUX fallback)

Date: 2026-06-20. Status: design + first implementation. Authority for the WS4 line in `NEXT_PLAN.md`.

## Problem

The overnight `[auto:agy]` lane drafts skill-card icons via Imagen/Gemini, but **aesthetic/frame fitness can't be
judged unattended** — the 2026-06-14 and 2026-06-20 batches both came out *frame-inconsistent* (each card a different
template) and were rejected by a human. There is no automated reject→refine→regenerate loop, so every miss costs a
full manual round-trip. WS4 closes that loop.

## Engine capabilities (corrected 2026-06-20)

**Both `agy` and `codex` can generate images** in this setup, each via its **own in-session Imagen 3 / Gemini Image**
(per `PROMPT.agy.md` and `PROMPT.codex.md:23` — independent of the sandbox network). So `GEN_ENGINE` is selectable
(agy default, codex available). The **vision judge** stays on claude/agy (a model that scores an *existing* PNG's frame
match); codex's confirmed role is *generation* + *text prompt-refinement*. Stage map:

| Stage | Engine (capability) | Why |
| --- | --- | --- |
| 1. Generate (primary) | **`GEN_ENGINE` = agy \| codex** (own in-session Imagen 3/Gemini) | both can draft cards; pick per task |
| 2. Vision judge (frame/aesthetic fit) | **claude `--print`** (vision) — `agy` alt | scores an existing PNG's frame match vs the peers |
| 3. Prompt refinement (critique → better prompt) | **codex `--print`** (text) | author a stricter generation prompt from the verdict |
| 4. Generate (deterministic offline fallback) | **FLUX local** (`python agent.py`, MPS) | repo-owned, offline; weak at text-heavy cards (`FLUX_FALLBACK=0` to skip) |
| 5. Integrity verify | `make check` / `test_image_assets` | dimensions/naming/file non-empty |
| 6. Final adopt | **human** (or auto if judge=PASS ∧ integrity=green) | aesthetic sign-off stays human by default |

Realizes "codex 적합성 리뷰 → 재생성 → 최종 생성": codex (or agy) generates, claude vision-judges, codex refines the
prompt, and codex/agy can also be the final generator (FLUX is only the offline deterministic fallback).

**`GEN_ENGINE=codex` trusts the generator and skips the claude vision-judge** — codex output promotes directly (no
review step), per request. The deterministic integrity gate (`test_image_assets`) still runs at the end. agy stays
judged (agy output goes through the vision-judge loop).

## Loop

```
bible      = frame spec (the existing consistent set: covering_noise/packet_shot/patch_protocol)
targets    = [emp_pulse, glitch_blink, memory_resonance, nanoshield_projector, signal_overdrive, system_intrusion]
prompt[t]  = bible.base(t)
for attempt in 1..MAX_TRIES:
    generate(prompt[t]) for each unresolved t  -> outputs/agy/skills/attempt-<n>/<t>.png   (agy; FLUX on agy failure)
    verdict = claude_vision_judge(attempt dir, bible)   # JSON: per-t {pass, critique}
    promote passing t -> resources/neo-seoul/skills/<t>.png ; drop from unresolved
    if unresolved empty: break
    prompt[t] = codex_refine(bible, verdict.critique[t]) for each unresolved t
if unresolved after MAX_TRIES:
    FLUX-local fallback generate(prompt[t]) ; re-judge ; else leave for human + Blocker note
integrity: make check (test_image_assets green) ; otherwise revert promotion
```

Frame bible (the consistent peers): vertical TCG card, fixed neon border + footer band, KANJI/KANA side strip,
role band, name subtitle in brackets, central illustration only varying per skill. **A draft fails if its frame /
typography / footer deviates from the peer set** — uniformity across the 6 is the pass bar, not individual prettiness.

## Boundaries

- agy still obeys `PROMPT.agy.md` (Imagen only, staging→resources cp, no FLUX). The **FLUX fallback is driven by the
  orchestrator, not the agy lane** (agy is forbidden FLUX) — keeps lane isolation intact.
- Generation drafts to `outputs/agy/skills/attempt-<n>/` (gitignored provenance); only judge-passing icons `cp` to
  `resources/`. Rejected batches kept under `outputs/agy/skills/rejected-batch<n>/`.
- Orchestrator is **opt-in / human-launched** (burns real generation + multi-engine quota); not part of the nightly
  drain. Final aesthetic adoption defaults to human unless `AUTO_ADOPT=1`.

## Status / next

- `scripts/overnight/image-regen.sh` (first version) + `make image-regen` target.
- Validation = one live run on the 6 skill icons (burns agy/FLUX) → human spot-check → adopt → unblocks the
  `[blocked] [auto:claude]` skill/icon integrity invariant (every `combat.skills[].id` has an icon).
