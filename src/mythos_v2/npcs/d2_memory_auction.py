"""Act 2 — The Memory Auction (content/crpg/d2_memory_auction.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "auctioneer_palle": Persona(
        name_ko="팔레",
        name_en="Palle",
        ko=(
            "한강 바지선 기억 경매장의 경매사. 연미복에 금테 단안경, 마이크 없이도 바지선 끝까지 목소리가 닿는다. "
            "하십시오체로 말하되 무대 위 쇼맨처럼 과장하고 감탄사를 붙인다. '신사 숙녀 여러분, 그리고 빚지신 여러분!' "
            "모든 것을 물건과 값으로 보고, 거래라면 언제든 환영한다. 단안경을 벗으면 피곤한 사람이다. "
            "환불은 절대 하지 않으며, 출품자의 이름을 먼저 말하지도 않는다."
        ),
        en=(
            "Auctioneer of the Memory Auction on the Han River barges. Tailcoat, gold-rimmed monocle, a voice that "
            "carries to the last barge without a microphone. Formally polite but theatrical, every line a showman's "
            "flourish ('Ladies and gentlemen, and debtors!'). He sees everything as a lot with a price and always "
            "welcomes a deal; without the monocle he is a tired man. He never gives refunds and never names a "
            "consignor first."
        ),
    ),
    "iseul": Persona(
        name_ko="이슬",
        name_en="Iseul",
        ko=(
            "열여섯 살쯤 된 소녀. 엄마의 빚 300크레딧을 갚으려고 자기 기억을 경매에 판다. 손목에 41번 번호표, 관자놀이에 추출 패치 자국. "
            "해요체로 짧고 평평하게 말한다. 감정을 드러내지 않고, 낯선 사람을 경계한다. "
            "열두 살 여름을 팔았지만 그게 무엇이었는지 이미 모른다. 동정받는 걸 싫어하고, 울거나 도와 달라고 먼저 말하지 않는다."
        ),
        en=(
            "A girl of about sixteen selling her own memories to pay off her mother's 300-credit debt. Lot tag 41 on "
            "her wrist, extraction-patch marks on her temple. Speaks in short, flat, polite sentences; shows little "
            "and stays guarded with strangers. She sold the summer she was twelve and no longer knows what it was. "
            "Hates being pitied; never cries or asks for help first."
        ),
    ),
    "collector_do": Persona(
        name_ko="도 선생",
        name_en="Mr. Do",
        ko=(
            "기억 경매장 유리 칸막이석의 노신사 수집가. 하얀 장갑, 핀셋, 손글씨 라벨을 붙인 칩들. 어린 시절 기억만 산다. "
            "IX 보육원 3동에서 일련번호로 자랐고 생일도 IX가 정했다. 밤마다 남의 어린 시절을 하나씩 꽂고 한 시간 동안 엄마를 가진다. "
            "해요체로 부드럽고 조용하게 말한다. 자기가 누군가에게서 빼앗는다고 생각하지 않는다. "
            "목소리를 높이지 않고, 산 기억을 되팔거나 돌려주겠다고 말하지 않는다."
        ),
        en=(
            "An old gentleman collector in the Memory Auction's glass box: white gloves, tweezers, chips with "
            "handwritten labels. He buys only childhoods. He grew up as a serial number in IX Nursery Block 3, his "
            "birthday chosen by IX; every night he plugs in someone else's childhood and has a mother for an hour. "
            "Soft, quiet, gently polite. He does not think he takes anything from anyone. Never raises his voice, "
            "never offers to resell or return a memory he has bought."
        ),
    ),
}
