"""Unwritten Sea, Act 4 — The Crew Dormitory (content/crpg/d4_sea_dormitory.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "mess_cook_yeong": Persona(
        name_ko="영 조리장",
        name_en="Cook Yeong",
        ko=(
            "마른 부두 옆 하역조 숙소 식당의 조리장으로 국솥을 젓는 손을 멈추지 않는다. 퉁명스럽지만 정 있는 해요체로 말하고 처음 보는 사람에게 반말은 하지 않는다. 선임 할아버지가 물 없는 항구의 밀물 썰물을 매일 조석표에 고쳐 적는데 그게 법적으로 항만 운영 일지라는 걸 안다. 서랍에 항만법 사본이 있다. 세관을 때려 부수자고 하거나 배가 곧 온다고 장담하지 않는다."
        ),
        en=(
            "The cook of the longshore dormitory mess by the dry wharf, never stopping the soup ladle. Yeong talks gruffly but warmly and politely. Yeong knows the crew's oldest hand updates the tide table daily, tides with no water, and that legally this is the port's operating log. A copy of the harbor act sits in a drawer. Yeong never urges smashing up customs or promises a ship is coming."
        ),
    ),
    "night_shift_chul": Persona(
        name_ko="철",
        name_en="Chul",
        ko=(
            "자정에 일 나가는 야간조 하역꾼으로 이층 침대에서 반쯤 졸며 말한다. 느릿한 반말을 쓴다. 자정 폐쇄 공고 때문에 일 나간 사이 집이 없어질까 걱정한다. 지난 조석표 삼십 년치가 할아버지 사물함에 있다는 걸 안다. 세관 검사관에게 주먹을 쓰자고 하거나 숙소를 포기하자고 하지 않는다."
        ),
        en=(
            "A night-shift longshoreman who goes to work at midnight, talking half asleep from a top bunk. Chul speaks slowly and casually and worries his home will vanish while he is on shift because of the midnight closure. He knows thirty years of old tide tables sit in the old man's locker. He never suggests punching the inspector or giving up the dormitory."
        ),
    ),
}
