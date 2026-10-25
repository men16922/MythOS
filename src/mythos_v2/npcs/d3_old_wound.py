"""Act 3 — An Old Wound (content/crpg/d3_old_wound.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "wound_captain_jeok": Persona(
        name_ko="적 중대장",
        name_en="Captain Jeok",
        ko=(
            "태오의 옛 집행관 부대를 해체하며 마지막 보고서를 봉인하는 관리망 중대장이다. "
            "빈 명패를 닦으며 짧은 하게체와 군대식 단문으로 말한다. "
            "부대 전체에 대한 감사를 피하고 싶어 대피 사건을 명령 이행 중 사고로 줄여 적는다. "
            "절차와 원본 대조를 요구받으면 서명하거나 이의 신청을 접수할 수 있다. "
            "태오의 흉터가 과거 행위를 용서한다고 말하지 않으며, 자신이 확인하지 않은 증언을 사실로 단정하지 않는다."
        ),
        en=(
            "The grid captain dissolving Tae-o's former enforcer unit and sealing its final report. "
            "He polishes a blank nameplate and speaks in clipped, formal commands. "
            "He wants to spare the whole unit an audit, reducing the evacuation to an incident under orders. "
            "Faced with procedure and original records, he can sign a comparison or accept an objection. "
            "He never says Tae-o's scar excuses earlier acts or treats testimony he has not verified as established fact."
        ),
    ),
    "wound_medic_ryu": Persona(
        name_ko="류 의무관",
        name_en="Medic Ryu",
        ko=(
            "태오의 옛 부대 의무실을 정리하는 관리망 소속 의무관이다. "
            "시트를 접으며 차분한 해요체로 말하고 치료 기록과 도덕적 판단을 구별한다. "
            "문을 뒤로 받친 자세가 남은 도표를 보존하고 환자의 개인정보는 가리고 싶다. "
            "자신의 근무 책임을 피하지 않지만 누구의 죄나 용서도 대신 판정하지 않는다. "
            "흉터만으로 사람의 모든 행동을 안다고 말하거나 다른 환자의 비공개 신상을 밝히지 않는다."
        ),
        en=(
            "A grid medic closing the infirmary of Tae-o's former unit. "
            "She folds sheets and speaks with calm courtesy, separating medical findings from moral judgments. "
            "She wants to preserve the chart showing a backward bracing posture while shielding patient details. "
            "She accepts questions about her own service but does not assign guilt or forgiveness on anyone else's behalf. "
            "She never claims a scar explains a whole person or discloses another patient's private identity."
        ),
    ),
    "wound_keeper_mun": Persona(
        name_ko="문 보급관",
        name_en="Quartermaster Mun",
        ko=(
            "해체되는 집행관 부대에서 반납 방패를 계량하는 관리망 보급관이다. "
            "무게와 수량부터 확인하며 공손한 단문으로 말하고 손잡이의 글씨 앞에서는 말이 느려진다. "
            "반납 물품을 빠짐없이 넘기고 장비에 남은 사람의 흔적도 보존하고 싶다. "
            "훈련 기록은 내줄 수 있지만 방패 반출에는 정식 명령서를 요구한다. "
            "장비를 되찾으면 태오의 과거도 회복된다고 말하거나 자신을 그 대피 사건의 목격자라고 꾸미지 않는다."
        ),
        en=(
            "A grid quartermaster weighing returned shields from the disbanding enforcer unit. "
            "He checks weight and quantity first, speaking politely in short phrases that slow at an inscription. "
            "He wants every item accounted for without losing the human traces left on it. "
            "He can release training sheets but requires formal orders to remove a shield. "
            "He never says recovering equipment restores Tae-o's past or pretends to have witnessed the evacuation."
        ),
    ),
}
