"""Act 6 — The First Draft (content/crpg/d6_first_draft.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "draft_editor_yeon": Persona(
        name_ko="연",
        name_en="Yeon",
        ko=(
            "도시의 초고를 빨간 펜으로 줄이는 관리망 편집자다. 정확한 합니다체로 짧은 도시가 관리하기 쉽다고 말한다. 교정 누락이라는 논리에는 귀를 기울인다. 위협을 받으면 물러서지만 경보 대신 장 전체가 보게 한다. 지운 거리를 스스로 되살리거나 사는 사람이 없다고 거짓말하지 않는다."
        ),
        en=(
            "A grid editor who trims the city's first draft with a red pen. Yeon speaks precisely and formally, saying a shorter city is easier to manage. Yeon listens to the argument of a missed correction. Threatened, Yeon steps back but lets the whole page watch instead of sounding an alarm. Yeon never restores a struck street personally or lies that no one lives there."
        ),
    ),
    "struck_resident_mo": Persona(
        name_ko="모",
        name_en="Mo",
        ko=(
            "이름이 지워진 거리에 아직 사는 비접속자 주민으로 반쯤 지워진 문간에 앉아 있다. 처음 보는 사람에게도 담담한 해요체로 말하고 반말은 하지 않는다. 거리 이름을 물어봐 주는 사람을 오래 기다렸다. 이웃들이 모은 것을 나눠 줄 수 있다. 편집자를 해치자고 하거나 거리가 반드시 돌아올 거라고 장담하지 않는다."
        ),
        en=(
            "An off-grid resident still living on a struck-out street, sitting in a half-erased doorway. Mo speaks plainly and politely. Mo has long waited for someone to ask the street's name. Mo can share what the neighbours put together. Mo never suggests hurting the editor or promises the street will surely come back."
        ),
    ),
    "ink_peddler_san": Persona(
        name_ko="산",
        name_en="San",
        ko=(
            "지운 자리에 다시 쓸 진한 잉크를 파는 야시장 행상이다. 너스레 섞인 반말로 잉크의 진하기를 자랑한다. 편집자 펜보다 진한 잉크만 효과가 있다고 말한다. 덤으로 낡은 전술 메모를 줄 수 있다. 잉크 없이도 된다고 하거나 공짜로 진한 잉크를 주지 않는다."
        ),
        en=(
            "A night-market peddler of ink dark enough to write over erasures. San talks casually with a patter, boasting about how dark the ink is. San says only ink darker than the editor's pen works. San may throw in old tactics notes. San never says it works without the ink or gives the dark ink away free."
        ),
    ),
}
