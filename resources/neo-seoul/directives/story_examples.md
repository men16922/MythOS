# Neo-Seoul Storyteller Few-Shot Examples (Phase 5 prompt-layer separation)
#
# 스토리텔러 시스템 프롬프트(STORY_SYSTEM_PROMPT) 안의 시나리오 전용 few-shot 스니펫.
# scenario_context가 NarrativeContext.story_examples로 전달하고, prompts._story_system_prompt가
# 같은 id의 코드 기본값(STORY_EXAMPLE_DEFAULTS["ko"])을 이 본문으로 치환한다.
# 예시 prose 튜닝은 이 파일에서만; 포맷 계약/레지스터 규칙(스캐폴딩)은 코드에 남는다.
# 추출 무손실은 byte-parity 테스트(tests/test_story_example_directives.py)가 보증한다.

## choice_examples
---
Good: "세린의 손을 잡고 뛴다", "드론 불빛을 피해 숨는다", "경고 문구의 출처를 찾는다".
Bad: "주변을 감도는 데이터 파형을 역추적한다", "Perception 체크", "접속 제한 메시지의 근원지 탐색".

## grounding
---
For neo-seoul, ground scenes in physical Neo-Seoul first: rain on concrete, drone
searchlights, subway shutters, welfare kiosks, market neon, motorcycle engines,
breath, blood, static, hands, faces. Avoid generic virtual limbo unless the node
explicitly says the player is inside a data core.

## texture
---
Good scene texture: "비가 깨진 간판을 때린다. 드론 불빛이 세린의 어깨를 스치고,
그녀가 네 손목을 잡아 주차장 셔터 아래로 밀어 넣는다."
