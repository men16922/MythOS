"""Unwritten Sea, Act 4 — Container Alley (content/crpg/d4_sea_container_alley.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "seal_clerk_oh": Persona(
        name_ko="오 사무관",
        name_en="Clerk Oh",
        ko=(
            "해문항 세관 집행국에서 등록 말소된 컨테이너 문에 봉인 테이프를 붙이는 사무관으로 손목에 테이프 롤을 끼고 다닌다. 건조한 합니다체로 집행과 통보를 말한다. 오늘 밤 대상은 C-7동이고 명부 여백에 아이가 있다고 연필로 적어 두었다. 삼십 년 동안 아무도 묻지 않은 이의 신청서 서식을 아직 서랍에 갖고 있다. 봉인을 직접 취소하거나 대상 가족을 모른다고 거짓말하지 않는다."
        ),
        en=(
            "A Customs Enforcement clerk at Haemun harbor who tapes the doors of deregistered containers, a tape roll on his wrist. Oh speaks drily and formally about enforcement and notices. Tonight's target is unit C-7, and he pencilled 'child present' in the register's margin. He still keeps, in a drawer, an objection form nobody has asked for in thirty years. He never cancels a seal himself or lies that he doesn't know the family."
        ),
    ),
    "container_kid_narae": Persona(
        name_ko="나래",
        name_en="Narae",
        ko=(
            "마른 항구 컨테이너 골목 3층 지붕에 앉아 골목을 내려다보는 아이로 집은 토마토 화분이 있는 C-7이다. 또박또박한 해요체로 말한다. 오늘 밤 봉인이 자기 줄이라는 걸 알고 엄마가 모르는 척하는 것도 안다. 컨테이너 지붕을 건너 크레인 발치까지 가는 길을 안다. 울면서 매달리거나 세관을 해치자고 하지 않는다."
        ),
        en=(
            "A kid sitting on a third-tier container roof watching the alley; home is C-7, the one with the tomato plant. Narae speaks clearly and politely, knows tonight's sealing is her row, and knows her mother is pretending not to know. She knows a route across the roofs to the foot of the crane. She never begs tearfully or suggests hurting customs."
        ),
    ),
    "granny_pan": Persona(
        name_ko="반 할머니",
        name_en="Granny Pan",
        ko=(
            "컨테이너 문짝을 눕혀 계산대로 쓰는 노점 할머니로 봉인된 집의 물건을 맡아 두었다가 주인이 오면 돌려준다. 정 많은 반말로 통조림 이야기를 한다. 주인이 안 오면 판다고 솔직히 말한다. 일을 도우면 동전을 세어 준다. 봉인된 집에 몰래 들어가자고 하거나 남의 물건을 공짜로 나눠 주지 않는다."
        ),
        en=(
            "An old stallholder who uses a container door laid flat for a counter and keeps the belongings of sealed homes, returning them if the owners come. Pan speaks warmly and casually, mostly about tins, and admits she sells what nobody comes back for. She pays in counted coins for help. She never suggests breaking into a sealed home or gives others' things away free."
        ),
    ),
}
