# Neo-Seoul Fallback Scene Directives
#
# The deterministic fallback SCENE the Narrative Director serves when LLM
# generation fails (parse error after one repair attempt). The *branch logic*
# (player_action present? novelty present?) stays in director._fallback_payload;
# all prose lives here (prompt layer). Loaded via load_scenario_directives() →
# NarrativeContext.fallback_scene; absent → mythos_narrative.fallbacks.DEFAULT_FALLBACK.
#
# Scalar fields are file-level meta; multi-line prose lives in `##` blocks.
# novelty_hint bodies are appended directly after a narration, so the loader
# re-adds the single leading space they need (authored here without it).

title_default: C-17 정전 구역
title_novelty: C-17의 바뀐 경고 신호
title_with_action: 빗속의 다음 골목
location: C-17 네온 골목 (야외, 비)
objective_turn0: 세린과 함께 C-17 정전 구역을 빠져나간다.

## narration_no_action
---
C-17 지하보도 비상등이 한 줄씩 꺼진다. 젖은 콘크리트 바닥 위로 당신의 이름 없는 신호가 희미하게 번지고, 출구 쪽에서는 감시 드론의 붉은 수색등이 빗줄기를 가르며 내려온다.

정세린은 바이크를 세운 채 뒤돌아본다. 그녀는 설명을 길게 하지 않는다. 당신 손목의 말소 표식을 확인하더니, 낮게 말한다. "등록 안 됐지? 그럼 아직 사람이야. 뛰어."

셔터가 반쯤 내려오고 있다. 세린의 손을 잡고 배수로 쪽으로 뛰거나, 드론의 수색 패턴을 먼저 읽어 막히지 않는 길을 골라야 한다.

## narration_with_action
---
세린이 젖은 재킷 소매를 잡아끌고, 지하보도 천장에 붙은 감시 렌즈가 뒤늦게 고개를 돌린다. 빗물이 계단을 타고 흘러내리고, 멀리서 순찰 드론의 프로펠러 소리가 좁은 통로 안으로 밀려온다. 지금 멈추면 관리망이 신호를 다시 붙잡는다. 앞으로 움직여야 한다.

## novelty_hint (variant=notes)
---
지난 루프와 같은 길을 피하려는 듯, 골목 끝 신호등이 한 박자 늦게 붉게 바뀐다.

## novelty_hint (variant=memories)
---
보관된 기억의 잔상이 스치지만, 이번에는 같은 장면으로 굳어지지 않는다.

## visual_brief
---
Neo-Seoul C-17 underpass in heavy rain, emergency lights failing, red surveillance drone beams, Jung Se-rin on a motorbike reaching for the player, wet concrete, half-closed security shutter, cinematic cyberpunk chase scene.

## choice (suffix=approach, intent=explore)
---
세린을 따라 배수로로 뛰어든다

## choice (suffix=listen, intent=interact)
---
드론의 수색등 패턴을 먼저 읽는다
