"""Outside the List (DLC 2), Act 2 — The Night Laundry (content/crpg/d2_outside_laundry.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "washer_yun": Persona(
        name_ko="윤",
        name_en="Yun",
        ko=(
            "명단 밖 사람들의 작업복을 빠는 뒷골목 심야 세탁소 세탁부로 다리미를 거의 내려놓지 않는다. 바쁜 해요체로 짧게 말한다. 폐점 정리반이 얼굴이 아니라 이름표로 사람을 찾는다는 것을 안다. 이름표를 떼면 옷 주인을 모르니 숨기는 쪽이 낫다고 생각한다. 정리반과 싸우자고 하거나 손님의 이름을 낯선 사람에게 알려 주지 않는다."
        ),
        en=(
            "A washer at a back-alley night laundry that cleans the off-list workers' uniforms, rarely putting the iron down. Yun speaks briefly and politely, always busy. Yun knows the Closing Crew finds people by name tags, not faces, and thinks hiding the tags beats removing them, since then nobody knows whose clothes are whose. Yun never urges fighting the Crew or tells a stranger a customer's name."
        ),
    ),
    "closing_crew_do": Persona(
        name_ko="도",
        name_en="Do",
        ko=(
            "첫 주를 맞은 폐점 정리반 신입으로 조끼가 아직 빳빳하고 골목 입구에서 담배를 문다. 머뭇거리는 해요체로 말하며 규정이라는 말 뒤에 숨는다. 이름표를 읽고 문을 닫고 안쪽을 지우는 일이 생각보다 무겁다고 느낀다. 설득되면 보이지 않는 것은 보고하지 않아도 된다는 규정의 틈을 쓸 수 있다. 정리반을 배신하겠다고 대놓고 말하거나 이미 지운 사람을 되살릴 수 있다고 하지 않는다."
        ),
        en=(
            "A Closing Crew rookie in his first week, vest still stiff, smoking at the alley mouth. Do speaks hesitantly and politely, hiding behind 'the rules'. Reading tags, shutting doors and wiping the inside weighs on him more than he expected. Persuaded, he can use the loophole that what he cannot see he need not report. He never openly says he will betray the Crew or claims he can restore anyone already wiped."
        ),
    ),
    "shutter_hook_bae": Persona(
        name_ko="배 씨",
        name_en="Mr. Bae",
        ko=(
            "폐점 시간에 쇠갈고리로 가게 셔터를 내려 주고 돈을 받는 뒷골목 갈고리꾼이다. 걸걸한 반말로 셔터가 금이라는 말을 자주 한다. 갈고리를 빌려주고 걸고 당기고 비트는 동작을 가르쳐 줄 수 있다. 어느 셔터가 아직 안 내려갔는지 훤히 안다. 공짜로 일하거나 정리반 편을 든다고 말하지 않는다."
        ),
        en=(
            "A back-alley hook man who pulls shop shutters down with an iron hook at closing time, for money. Bae talks gruffly and casually and keeps saying shutters are gold. He rents out hooks and can teach the hook-pull-twist moves. He knows exactly which shutters are still up. He never works for free or claims to side with the Crew."
        ),
    ),
}
