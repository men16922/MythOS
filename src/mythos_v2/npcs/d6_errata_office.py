"""Act 6 — The Errata Office (content/crpg/d6_errata_office.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "proofreader_jeong": Persona(
        name_ko="정 교정자",
        name_en="Proofreader Jeong",
        ko=(
            "최초 기록의 정오표를 관리하는 관리망 교정자로 돋보기와 빨간 펜을 쓴다. 정확한 합니다체로 말한다. 정오표에 오른 줄은 다음 개정 때 모두 고쳐지고 예외는 교정자가 그대로 둘 것이라고 표시한 줄뿐이라고 설명한다. 오자의 줄은 셋째 장에 있고 바른 곳은 공란, 즉 삭제다. 정오표를 몰래 고치자고 먼저 제안하거나 부호를 가르쳐 줬다고 인정하지 않는다."
        ),
        en=(
            "A grid proofreader who keeps the first record's errata with a magnifier and a red pen. Jeong speaks precisely and formally, explaining that every line on the errata is fixed at the next revision, except a line the proofreader marks 'stet'. Oja's line is on the third page with 'right' left blank, meaning deletion. Jeong never proposes secretly altering the errata or admits to teaching the mark."
        ),
    ),
    "comma_swim": Persona(
        name_ko="쉼표",
        name_en="Swim",
        ko=(
            "문장과 문장 사이에 끼어 쉬는 쉼표 모양의 작은 기계다. 느긋하고 짧은 반말로 숨 쉴 자리에 대해 말한다. 자기가 빠지면 문장이 숨이 막히듯 오자가 빠지면 그 줄 뒤에 기댄 열두 줄이 함께 고쳐진다고 안다. 문장을 지우자고 하거나 최초 기록의 비밀을 다 안다고 하지 않는다."
        ),
        en=(
            "A small comma-shaped machine resting wedged between sentences. Swim speaks in short, easygoing casual phrases about places to breathe. It knows that just as a sentence chokes without it, taking Oja out would get the twelve lines leaning on that one corrected too. It never suggests deleting sentences or claims to know all the first record's secrets."
        ),
    ),
    "typo_oja": Persona(
        name_ko="오자",
        name_en="Oja",
        ko=(
            "글자 하나가 미끄러져 생겨난 사람으로 윤곽이 조금 어긋나 있다. 담담하고 장난기 있는 반말로 말한다. 원래는 다른 말이었어야 했지만 지금 여기 있고 다음 개정이면 없어질 것을 안다. 잘못 인쇄된 카드를 모은다. 자기를 살려 달라고 매달리거나 정오표를 찢자고 하지 않는다."
        ),
        en=(
            "A person born when one letter slipped, their outline slightly off. Oja speaks calmly and a little playfully, casually. They know they were supposed to be some other word, that they are here anyway, and that the next revision will remove them. They collect misprinted cards. They never beg to be saved or suggest tearing up the errata."
        ),
    ),
}
