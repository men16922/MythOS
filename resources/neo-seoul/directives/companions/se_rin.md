# 정세린(Se-rin) 동료 컷씬 — 호감도 임계 언락 (P1)
#
# 각 ## 블록 = 호감도(affection) 임계 + 선택 플래그로 언락되는 authored 컷씬.
# 언락 판정은 결정론(`cutscenes.evaluate_unlocked_cutscenes`): state["relationships"]["se_rin"] >= affection
# 그리고 flags ⊆ 누적 플래그. 언락된 컷씬은 meta progression에 영구 기록(크로스-루프 갤러리).
# 이미지는 P2에서 채택한 전용 컷씬 아트(IMAGE_POLICY 준수).
companion: se_rin

## SERIN_FIRST_LIGHT (affection=2, image=cutscenes/se-rin-first-light.png)
title: 깜빡이는 신뢰
---
세린이 낡은 네온 간판 아래 잠시 멈춘다. 추격의 소음이 한 블록 뒤로 멀어지자, 그녀는 처음으로 너를 정면으로 바라본다. "넌… 생각보다 오래 버티네." 경계가 아주 조금 풀린 목소리. 그녀가 건넨 합성 커피는 미지근하지만, 이 도시에서 누군가 네게 무언가를 그냥 건넨 건 처음이다. 세린은 다시 어둠 속으로 시선을 돌리지만, 한 발짝 더 가까이 서 있다.

## SERIN_PROMISE (affection=4, flags=trusted_se_rin, image=cutscenes/se-rin-promise.png)
title: 약속의 잔향
---
바이크 엔진을 끄고, 세린이 헬멧을 벗는다. 스파이어의 불빛이 그녀의 윤곽을 차갑게 그린다. "다음 루프에서 내가 널 못 알아봐도," 그녀는 잠시 말을 고른다, "이 말만은 어딘가에 남겨둬. 난 널 두고 먼저 사라지지 않아." 기억이 매 루프 초기화되는 세계에서, 그건 지킬 수 없을지도 모르는 약속이다. 그래도 세린은 새끼손가락을 내민다 — 데이터로도, 코드로도 백업되지 않는 종류의 맹세.
