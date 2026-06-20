# WS4 — Image regenerate-on-reject loop (agy draft → vision judge → codex prompt-refine → FLUX fallback)

Date: 2026-06-20. Status: design + first implementation. Authority for the WS4 line in `NEXT_PLAN.md`.

## Problem

The overnight `[auto:agy]` lane drafts skill-card icons via Imagen/Gemini, but **aesthetic/frame fitness can't be
judged unattended** — the 2026-06-14 and 2026-06-20 batches both came out *frame-inconsistent* (each card a different
template) and were rejected by a human. There is no automated reject→refine→regenerate loop, so every miss costs a
full manual round-trip. WS4 closes that loop.

## Hard constraint that shapes the design

`codex` **cannot** judge or generate images: it is a text/code agent with **no vision** and runs **network-blocked**
in the overnight sandbox. So the user's first sketch ("codex reviews fitness → codex regenerates as fallback") is
remapped onto capability-appropriate engines:

| Stage | Engine (capability) | Why |
| --- | --- | --- |
| 1. Generate (primary) | **agy** (Imagen/Gemini, multimodal) | the proven card generator; in-session image API |
| 2. Vision judge (frame/aesthetic fit) | **claude `--print`** (vision) — `agy` alt | only a vision model can score frame match; codex can't *see* |
| 3. Prompt refinement (critique → better prompt) | **codex `--print`** (text) | codex's real strength — author a stricter generation prompt from the verdict |
| 4. Generate (deterministic fallback) | **FLUX local** (`python agent.py`, MPS) | repo-owned, controllable, offline; replaces the impossible "codex generates" |
| 5. Integrity verify | `make check` / `test_image_assets` | dimensions/naming/file non-empty |
| 6. Final adopt | **human** (or auto if judge=PASS ∧ integrity=green) | aesthetic sign-off stays human by default |

Net: **codex = prompt-author + (structural) verifier; vision+generation = agy/claude/FLUX.** This is the only feasible
realization of "codex 적합성 리뷰 → agy 재생성 → 안 되면 최종 생성".

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
