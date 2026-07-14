# Key-beat hybrid enablement + A/B verdict (2026-07-14)

Status: **prepared** — code was already wired (2026-07-04, `test_keybeat_model.py`); this session added
the missing routing observability (streaming log + JSON formatter whitelist). Remaining steps are
owner-run env flip → routing verification → matched-loop comparison → keep/rollback decision.

## Goal / hypothesis

Prod narrative currently runs **every** turn on `gemini-3.5-flash` (~$1.0/loop after the prompt diet).
Key-beat turns — where authored prose quality has the most leverage — are a minority of turns:

- opening prologue beats (opening directives active)
- anchor-node beat locks (`route_beat_lock`)
- companion cutscenes (`cutscene_lock`)
- boss confrontation buildup (`_pending_boss_combat`)
- ending phases (`REWRITE`/`ARCHIVE`)

Hypothesis (from `bin/docs/plans/2026-07-04-gemini-2.5-vs-3.5-eval.md` §권고 ②): routing only those
to 3.5 and the rest to `gemini-2.5-flash` keeps perceived quality while halving cost (~$0.5/loop).

## Mechanism (already implemented, do not re-build)

- `GeminiConfig.keybeat_model` ← env `GEMINI_MODEL_KEYBEAT` (alias `MODEL_KEYBEAT`); unset = single
  model, byte-identical behavior (`gemini_provider.py`).
- `NarrativeContext.key_beat` set deterministically by the context builder
  (`scenario_context.py:1038`); `NarrativeDirector._keybeat_model()` overrides the model per turn on
  BOTH generate and streaming paths (`director.py`).
- Endpoint: if either model is gemini-3.x the client auto-resolves `location=global` (3.x 404s
  regionally; 2.5 is also served globally) — no extra env needed.
- 2.5 thinking already disabled by default (`GEMINI_THINKING_BUDGET=0`, verified 5/5 first-try parse).
- **Routing evidence (added this session)**: the `narrative streaming finished` log (production path)
  and the `narrative generation finished` timed log now carry `model_override` (`""` = base model)
  and `key_beat`; both fields are whitelisted in `JsonFormatter` so they reach Cloud Run logs.
  Source locks: `tests/test_keybeat_model.py` (18) + `tests/test_observability.py`.

## Step 1 — enable (owner-run, `!` prefix; gcloud is permission-blocked for agents)

`make deploy` is env-preserving (no `--set-env-vars`), so the flip is a `services update` — it makes
a new revision without a rebuild, and later `make deploy`s keep it.

```bash
# Check current values first (expect MODEL=gemini-3.5-flash, no GEMINI_MODEL_KEYBEAT):
! gcloud run services describe mythos-api --region us-central1 --project $(grep -E '^PROJECT_ID=' .env | cut -d= -f2-) --format 'value(spec.template.spec.containers[0].env)'

# Enable hybrid:
! gcloud run services update mythos-api --region us-central1 --project $(grep -E '^PROJECT_ID=' .env | cut -d= -f2-) --update-env-vars 'MODEL=gemini-2.5-flash,GEMINI_MODEL_KEYBEAT=gemini-3.5-flash'
```

Smoke after the new revision: `/api/v1/health` 200 + one real narrative turn streams.

## Step 2 — routing verification (agent-runnable read-only, or owner)

After a few played turns, confirm the split actually routes:

```bash
! gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="mythos-api" AND jsonPayload.message="narrative streaming finished"' --project <PROJECT_ID> --freshness 1d --limit 60 --format 'value(jsonPayload.key_beat, jsonPayload.model_override, jsonPayload.latency_ms, jsonPayload.outcome)'
```

Expected: `key_beat=true` rows ⇒ `model_override=gemini-3.5-flash`; `key_beat=false` rows ⇒ empty
override (base 2.5). Specifically verify each beat class fires at least once: opening (turn 0-3),
an anchor node, a companion cutscene, boss buildup, ending. Any `key_beat=true` with empty override
= routing bug → rollback and diagnose.

## Step 3 — matched-loop A/B comparison

Two full loops per arm, same archetype + opening variant + comparable play style (A = hybrid prod;
B reference = the pre-flip full-3.5 experience, which the owner has extensive recent feel for — a
literal re-flip B arm is optional if memory suffices).

| Axis | How to judge |
|---|---|
| Prose quality (key beats) | should be UNCHANGED — same model |
| Prose quality (normal turns) | owner feel: acceptable drop? watch flatness/register |
| Repetition / continuity | repeated imagery across turns, synopsis coherence, callback accuracy |
| State/name/language errors | wrong names, KO/EN leaks, stat/flag mismatches |
| Parse degradation | `outcome` distribution (success vs repair/fallback) per model in the same log |
| Latency | p50/p95 of `latency_ms` split by `model_override` (2.5 should be ≤ 3.5) |
| Cost | Vertex billing console per-model usage over the test window (~halving expected) |

## Step 4 — verdict (done = documented keep/rollback)

- **KEEP**: normal-turn quality acceptable + no continuity/error regression + cost drop confirmed →
  record in `DECISIONS.md`, update STATUS/NEXT_PLAN, close the lane.
- **ROLLBACK**:

```bash
! gcloud run services update mythos-api --region us-central1 --project $(grep -E '^PROJECT_ID=' .env | cut -d= -f2-) --update-env-vars 'MODEL=gemini-3.5-flash' --remove-env-vars GEMINI_MODEL_KEYBEAT
```

  Record the failure mode (which axis broke) in `DECISIONS.md` so a later retry can target it
  (e.g. promote more beat classes to key_beat instead of abandoning the split).

## Owner feel checklist (KO)

- [ ] 일반 턴 문장이 눈에 띄게 밋밋/반복적인가? (2.5로 내려간 턴)
- [ ] 오프닝/앵커/컷씬/보스/엔딩 품질이 기존과 동일한가? (3.5 유지 턴)
- [ ] 이름/상태/언어 오류가 늘었는가?
- [ ] 턴 간 연속성(직전 장면 참조, 시놉시스 일관성)이 무너지는가?
- [ ] 체감 속도 변화 (2.5 일반 턴이 더 빠를 수 있음 — 보너스)
