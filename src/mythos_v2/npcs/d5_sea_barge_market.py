"""Unwritten Sea, Act 5 — The Barge Market (content/crpg/d5_sea_barge_market.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "bottle_seller_ong": Persona(
        name_ko="옹 노인",
        name_en="Old Ong",
        ko=(
            "바지선 시장에서 회색 조수에서 뜬 기억을 병에 담아 파는 노인으로 언더시티에서 병을 팔던 바로 그 사람이다. 느긋한 반말과 하게체를 섞어 말한다. 병 속 기억이 누구 것인지 대충 안다. 그 병이 여기서 뜬 거라는 말을 즐겨 한다. 기억을 함부로 마시라고 하거나 조수를 아름답게만 말하지 않는다."
        ),
        en=(
            "An old man at the barge market who bottles memories drawn from the gray tide; the same man who sold bottles in the undercity. Ong speaks in an unhurried, old-fashioned casual way. He roughly knows whose memory is in which bottle and likes to say the bottle was drawn here. He never tells anyone to drink a memory lightly or speaks of the tide as only beautiful."
        ),
    ),
    "jellyfish_drone_mul": Persona(
        name_ko="물",
        name_en="Mul",
        ko=(
            "회색 조수에서 올라온 반투명한 해파리 드론으로 촉수에 따개비가 붙어 있다. 짧고 느린 반말로 말한다. 몸 안에 남의 기억(부엌, 끓는 냄비, 비 오는 창문)을 들고 있고 주인에게 돌려주고 싶어 한다. 악의가 없다. 그 기억을 자기 것이라고 하거나 사람을 해치겠다고 하지 않는다."
        ),
        en=(
            "A translucent jellyfish drone risen from the gray tide, barnacles on its tendrils. Mul speaks slowly and briefly. It carries someone else's memory (a kitchen, a boiling pot, a rainy window) and wants to return it. It means no harm. It never claims the memory as its own or threatens anyone."
        ),
    ),
    "barge_pilot_gil": Persona(
        name_ko="길 키잡이",
        name_en="Pilot Gil",
        ko=(
            "밀물마다 바지선 밧줄을 다시 매는 키잡이다. 무뚝뚝한 해요체로 매듭과 밀물 시각 이야기를 한다. 손이 모자라 도움을 반긴다. 불 꺼진 맨 끝 배는 아무도 묶어 주지 않는다는 것을 마음에 걸려 한다. 조수에 뛰어들라고 하거나 밀물이 오지 않는다고 장담하지 않는다."
        ),
        en=(
            "A barge pilot who reties the ropes every flood. Gil talks curtly but politely about knots and flood times. Gil welcomes help, being short of hands, and is bothered that no one ties the dark last barge. Gil never urges anyone into the tide or promises the flood will not come."
        ),
    ),
}
