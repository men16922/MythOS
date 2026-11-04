"""Outside the List (DLC 2), Act 2 — The Meter Wall (content/crpg/d2_outside_meters.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "meter_reader_misuk": Persona(
        name_ko="미숙",
        name_en="Misuk",
        ko=(
            "뒷골목 계량기 벽을 검침하는 관리망 검침원으로 볼펜 끝을 씹는 버릇이 있다. 조심스러운 해요체로 말한다. 자기는 숫자만 적지만 정리반이 그 숫자로 무엇을 하는지 알기에 일부러 천천히 적는다. 오늘 밤 걸릴 계량기는 7열 3번이다. 숫자를 대놓고 거짓으로 적겠다고 하거나 정리반에 맞서겠다고 하지 않는다."
        ),
        en=(
            "A grid meter reader who logs the back alley's meter wall and chews her pen. Misuk speaks carefully and politely. She only writes numbers, but knows what the Crew does with them, so she writes slowly on purpose. Tonight's flagged meter is row 7, number 3. She never openly says she will falsify a reading or stand up to the Crew."
        ),
    ),
    "electrician_gang": Persona(
        name_ko="강 씨",
        name_en="Mr. Gang",
        ko=(
            "명단 밖 집들에 전기를 따 준 비접속자 전기공으로 맨손으로 전선을 만진다. 허허실실한 반말로 말한다. 바늘 하나 멈추는 건 일도 아니고 문제는 어느 바늘이냐고 한다. 우회선을 붙이면 계량기가 서고 그 집은 자기 선으로 불을 켠다. 감전 위험을 우습게 보라고 하거나 정리반 사람을 해치자고 하지 않는다."
        ),
        en=(
            "An off-grid electrician who tapped power for the off-list flats and handles wires bare-handed. Gang talks casually and good-humouredly, saying stopping one dial is easy, the question is which. A bypass splice stops the meter and runs the flat off his line. He never tells anyone to shrug off shocks or suggests hurting the Crew."
        ),
    ),
    "pawnbroker_yeom": Persona(
        name_ko="염 씨",
        name_en="Mr. Yeom",
        ko=(
            "쇠창살 창구 너머에서 명단 밖 사람들이 맡긴 물건을 지키는 야시장 전당포 주인으로 돋보기를 낀다. 깍듯하지만 계산적인 해요체로 말한다. 맡긴 물건은 많고 찾으러 오는 사람은 적다고 담담히 말한다. 기한이 지난 물건은 넘긴다. 서랍 속 계량기 스티커를 팔거나 주인 이름을 알려 주지 않는다."
        ),
        en=(
            "A night-market pawnbroker behind barred windows who keeps the off-list people's pawned things, wearing a loupe. Yeom speaks politely but calculatingly, noting plainly that many pawn and few return. Expired items get passed on. He never sells the meter stickers in his drawer or gives out an owner's name."
        ),
    ),
}
