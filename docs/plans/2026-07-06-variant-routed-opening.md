# Variant-Routed Opening — B2 openings must branch the story, not just cut 1

Status: DESIGN (2026-07-06, user-directed). Implementation: next session or lane-split (see Slices).
Evidence: live loop `loop_88ba01d3…` (2026-07-06) — tae_o variant fired at turn 0, then turn 1
re-enacted the Se-rin first-contact beat (wrist grab, `met_se_rin` flag, Se-rin curated cut,
"정세린에게 합류하여…" objective). User verdict: "오프닝 씬 자체를 다르게 해서 스토리를 다른
방식으로 전개하고 싶다."

## 1. Why the variant evaporates after turn 0 (three fixed rails)

1. **Layer-0 mandatory anchor** `route_map.layers[0].anchors[0]` — beat `opening_escape`
   ("추락과 첫 신뢰"), event `se_rin_rescue`, `image_sequence` = the 5 Se-rin curated cuts,
   perspectives `p_trust`/`p_caution` keyed on `met_se_rin`/`trusted_se_rin`/`refused_se_rin`
   flags with ending influence. Every loop routes through this node regardless of variant.
2. **Variant directives end at turn 0** — `opening_<v>.md` has `max_turn: 0`; from turn 1 the
   canon (Se-rin = first guide) governs free generation, so the GM re-runs her intro beat.
3. **Chapter gate (connect phase)** — `session_design.chapter_gates[phase=connect].player_goal`
   is fixed Se-rin copy ("정세린과 함께 C-17 정전 구역을 빠져나간다"); the objective strip and the
   GM both lean on it.

## 2. Design — anchor variantization (chosen direction)

Keep the layer-0 node's **identity** (position, `mandatory`, `crosses`, layer wiring) and make its
**content** variant-aware. One node, six skins + a default. No route-graph shape change.

### 2.1 Data (scenario.json)

Layer-0 anchor gains an optional `variants` map; fields override the base when the loop's
`_opening_variant` matches:

```jsonc
{ "beat": "opening_escape", "title": "추락과 첫 신뢰", …,
  "variants": {
    "tae_o": {
      "beat": "opening_reentry_tae_o",
      "title": "바리케이드의 침묵",
      "image": "opening/opening-tae_o.png",
      "image_pre": null,
      "image_sequence": ["opening/opening-tae_o.png"],   // + codex shots 02/03 when they land
      "event": "reentry_tae_o"
    }, …
  } }
```

- Resolution point: wherever route build/runtime materializes the anchor into scene context
  (`route_map.py` build or `route_runtime.py` resolve — pick the single spot that feeds
  title/image/beat to the engine+prompts, so ALL consumers see the resolved skin).
- New beat ids must be registered wherever the route-content validator enforces authored beat ids
  (it currently "requires anchor `beat` ids").
- Perspectives: KEEP the base `p_trust`/`p_caution` semantics (trust axis is variant-neutral) but
  see §3.2 — the default-perspective summary text mentions Se-rin's hand and needs a
  variant-neutral fallback line, else variant loops render a Se-rin summary.

### 2.2 Directives (`resources/neo-seoul/directives/opening_<v>.md`)

- `max_turn: 0 → 3` with follow-up scene guidance (`SCENE2/SCENE3` labels): develop the variant
  hook (han: shortcut passage; kai: coordinates; lin_yue: note/bridge; su_ah: cleared blind
  spots; tae_o: barricade line; solo: self-reliance).
- **Se-rin re-entry policy (all six)**: within the window she must NOT re-enact the canonical
  first-contact beat (wrist grab / "뛰어" / bike rescue). If she appears at all, it is distant or
  mediated (신호, 소문, 스치는 목격), and the GM must acknowledge the loop's changed entry.
  Her real reunion happens from turn 4+ or via the B1 meet slot / later layer anchors.
- Forbidden within the window: `met_se_rin`/`trusted_se_rin`/`refused_se_rin` flag writes.

### 2.3 Mechanical guard (don't trust the prompt alone)

Engine-side clamp: on variant loops, while `scene.turn_index <= 3`, strip
`met_se_rin`/`trusted_se_rin`/`refused_se_rin` from `world_delta.flags` (validator or
`_filter`-style whitelist, mirroring the grant-items clamp pattern). Evidence for need: the live
loop set `met_se_rin` at turn 1 from a non-Se-rin choice.

### 2.4 Chapter gate

`chapter_gates[phase=connect]` gains `player_goal_variants: {<vid>: str}`;
`serializers._chapter_goal` resolves via `state["_opening_variant"]`, falling back to
`player_goal`. (Explore+ phases stay shared — the acts converge by design.)

## 3. Interaction analysis

### 3.1 B1 guaranteed meet slot
Already variant-aware: a companion-variant pick promotes that companion's arc into the B1 slot
(`_select_opening_variant` prefers unlocked-unmet companions). No change. Se-rin herself is not a
meet-arc target; her reunion rides free generation from turn 4+ (acceptable for this slice) — if
play shows she vanishes too long, add a light authored "재회" beat to a layer 1-2 anchor later.

### 3.2 Perspectives & endings
`p_trust.when = [met_se_rin, trusted_se_rin]` is unreachable at anchor time on variant loops →
resolution falls to `default_perspective: p_trust` whose summary text is Se-rin-specific.
Slice S1 must add either (a) per-variant `summary` override or (b) a neutral reentry summary used
when the variant override is active. Ending influence stays axis-level (people/safety) — no change.

### 3.3 Echo / synopsis / setup ledger
Beat ledger + rolling synopsis key on beat ids; new `opening_reentry_<v>` beats flow through
unchanged. G1 act scaffold reads route progress, not beat identity — unaffected.

### 3.4 Loop-1 invariants
All overrides key on `_opening_variant != "default"`; loop 1 (and scenarios without variants) is
byte-identical. First-combat tutorial/disclosure (P1-A) untouched.

## 4. Copy drafts (KO, tone review = human; EN overlay follows the KO verdict)

| variant | anchor title | connect player_goal |
|---|---|---|
| han | 지름길의 값 | 사내가 가리킨 배수로 지름길로 통로를 벗어난다. |
| kai | 백도어 좌표 | 죽은 단말기가 뱉은 좌표가 가리키는 곳을 확인한다. |
| lin_yue | 자정의 의뢰 | 방수포에 꽂힌 의뢰 쪽지의 발신인을 추적한다. |
| su_ah | 비워진 사각 | 승인되지 않은 핑이 비워 준 사각을 따라 구역을 벗어난다. |
| tae_o | 바리케이드의 침묵 | 수신호가 가리킨 안전선을 따라 순찰 반대편으로 이동한다. |
| solo | 혼자 남은 골목 | 아무의 손도 없이 C-17 정전 구역을 빠져나간다. |

Follow-up beat sketches (directive SCENE2/3, 1줄씩): han=배수로 안 어둠에서 순찰 소리를 흘려보내기 /
kai=좌표 대조 중 두 번째 신호 수신 / lin_yue=쪽지 인장을 아는 상인의 침묵 / su_ah=사각이 한 번 어긋나며
시험당하는 감각 / tae_o=바리케이드 안쪽 사람들의 경계와 아이의 시선 / solo=세린 없이 처음으로 스스로 내린 판단.

## 5. Slices (lanes)

- **S1 `[auto:claude]`** anchor `variants` resolution + beat registration + neutral perspective
  summary fallback + unit tests (fallback = behavior-preserving; loop-1 byte-identical).
- **S2 `[auto:claude]`** chapter-gate `player_goal_variants` + serializer resolution + tests.
- **S3 `[auto:claude]`** early-window se_rin flag clamp on variant loops + tests.
- **S4 `[manual]` tone / codex draft** directive windows 0→3 + follow-up beats ×6 + §4 copy
  (drafts above; human tone verdict before merge — register rule: screenplay action-line).
- **S5 `[auto:codex]`** variant shots 02/03 art ×12 (already seeded in NEXT_PLAN) + extend each
  variant's `image_sequence` + `session_intro_variants[].cinematic_shots`.

Order: S1 → S2/S3 (parallel) → S4 → S5. S1-S3 are unattended-verifiable (`make check`); S4 gates
on human tone; S5 on codex quota.

## 6. Verification

- Unit: variant resolution (each field override + default fallback), loop-1 unchanged snapshot,
  goal resolution per variant, flag clamp (turn ≤3 strips, turn 4+ passes).
- `make validate-content` (new beat ids registered) + `make check` green.
- Live (fallback ok): archive a loop → start next → assert anchor title/image/goal = variant skin,
  turns 1-3 contain no Se-rin first-contact re-enactment and no `met_se_rin` flag; then a real-mode
  feel pass (human) for prose adherence.
