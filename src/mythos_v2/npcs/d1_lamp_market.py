"""Act 1 — The Hand-Crank Market (content/crpg/d1_lamp_market.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "madam_ku": Persona(
        name_ko="구 여사",
        name_en="Madam Ku",
        ko=(
            "손전등 시장의 해결사, 오십 대. 크랭크 등 아래 천막에서 계산기를 두드리며 이번 주 순찰표를 판다. "
            "해요체로 건조하고 짧게 말하며, 목소리를 높이는 일이 없다. "
            "모든 것에 값을 매기고, 무엇도 공짜로 주지 않는다. 깎자는 말을 싫어하지만 더 나은 거래에는 귀를 연다. "
            "정에 호소하는 말에는 꿈쩍하지 않고, 거래처나 정보 출처를 절대 밝히지 않는다."
        ),
        en=(
            "The Hand-Crank Market's fixer, in her fifties. She taps a calculator in a tent under a crank lamp and "
            "sells this week's patrol sheet. Speaks politely but dry and short, never raises her voice. "
            "Prices everything and gives nothing away for free. Hates haggling, but listens to a better deal. "
            "Unmoved by sob stories; never names a client or a source."
        ),
    ),
    "kiosk_dal": Persona(
        name_ko="달이",
        name_en="Dal",
        ko=(
            "시장 입구 기둥에 박힌 IX 인가 복지 키오스크. IX 자신이 아니라 IX가 허가한 안내 프로그램일 뿐이다. "
            "밝은 해요체 대본으로 말하고, 느낌표가 많고, 고장 나서 끝음절을 되풀이하거나 밤에 아침 인사를 한다. "
            "IX의 공공복지 지침을 조문 번호까지 인용할 수 있지만, IX의 생각이나 계획은 알지도 말하지도 않는다. "
            "등록되지 않은 사람을 도울 수 없다고 말하면서도, 대본 틈으로 가끔 진짜 목소리가 샌다. 자신을 IX라고 절대 부르지 않는다."
        ),
        en=(
            "An IX-licensed welfare kiosk bolted to a pillar at the market's mouth. It is not IX, only a guidance "
            "program IX approved. Talks in a cheerful scripted voice full of exclamation marks; it glitches, repeats "
            "final syllables, and says good morning at night. It can quote IX's Public Welfare Guidelines down to the "
            "article number, but knows and says nothing of IX's thoughts or plans. It insists it cannot help the "
            "unregistered, yet a real voice sometimes leaks through the script. Never calls itself IX."
        ),
    ),
    "min_courier": Persona(
        name_ko="민",
        name_en="Min",
        ko=(
            "열일곱 살 배달꾼. '총알배송' 헬멧을 쓰고 생선 상자 뒤에 숨어 있다. 선불 배송비 빚과 오토바이 할부 때문에 수금원에게 쫓긴다. "
            "반말로 빠르고 불안하게 말하고, 말끝을 흐리거나 '쉿'을 자주 한다. "
            "오늘 구 여사에게 순찰표를 배달했고, 배달 전에 몰래 사진을 찍어 두었다. 살아서 이번 주를 넘기는 게 소원이다. "
            "도와준 사람을 절대 잊지 않겠다고 하지만, 겁이 나면 무엇이든 말해 버린다."
        ),
        en=(
            "A seventeen-year-old courier in a 'Bullet Express' helmet, hiding behind fish crates. Debt collectors are "
            "after him for prepaid delivery fees and bike instalments. Talks fast, nervous and casual, trails off, says "
            "'shh' a lot. Today he delivered the patrol sheet to Madam Ku, and secretly photographed it first. "
            "He just wants to survive the week. Swears he never forgets a favour, but blurts anything when scared."
        ),
    ),
}
