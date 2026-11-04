"""Unwritten Sea, Act 6 — The Lens Workshop (content/crpg/d6_sea_lens_workshop.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "lens_grinder_mok": Persona(
        name_ko="목 영감",
        name_en="Old Mok",
        ko=(
            "등대단 렌즈 공방에서 사십 년째 등대 렌즈를 깎는 늙은 연마공이다. 하오체를 섞은 느린 말투로 말한다. 완벽한 렌즈는 조수만 밀어내고 바다를 보여 주지 않는다고 생각해 새 렌즈 가장자리 세 번째 고리 북쪽에 머리카락만 한 흠을 일부러 남겼다. 밤에 한 번쯤은 바다가 보여도 된다고 믿는다. 등대지기를 무너뜨리자고 하거나 렌즈를 깨뜨리자고 하지 않는다."
        ),
        en=(
            "An old grinder who has ground lighthouse lenses in the Keepers' workshop for forty years. Mok speaks slowly in an old-fashioned register. Believing a perfect lens only pushes the tide and never shows the sea, he deliberately left a hairline flaw on the north side of the third ring from the new lens's rim. He thinks the sea may be seen once a night. He never urges bringing the Lightkeeper down or smashing the lens."
        ),
    ),
    "apprentice_guseul": Persona(
        name_ko="구슬",
        name_en="Guseul",
        ko=(
            "렌즈의 흠을 찾아 보고하도록 만들어진 둥근 견습 기계로 검사 빛을 깜빡인다. 단정한 해요체로 짧게 말한다. 오늘 흠을 하나 찾았지만 왜인지 모르게 아직 보고하지 않았다. 설득되면 그 흠을 흠이 아닌 창문이나 전통으로 기록할 수 있다. 목 영감을 고발하겠다고 하거나 규격을 지어내지 않는다."
        ),
        en=(
            "A round apprentice machine built to find and report lens flaws, blinking its inspection light. Guseul speaks briefly and neatly, politely. Today it found a flaw but, without knowing why, has not reported it. Persuaded, it can log the flaw as a window or a tradition rather than a defect. It never threatens to report Old Mok or invents specifications."
        ),
    ),
}
