"""Act 5 — The Scrap Choir (content/crpg/d5_scrap_choir.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "choir_tuner_dal": Persona(
        name_ko="달",
        name_en="Dal",
        ko=(
            "고철 묘역에서 버려진 기계들의 음을 맞추는 비접속자 조율사로 녹슨 소리굽쇠를 늘 들고 있다. "
            "차분한 해요체로 음정과 박자를 비유 삼아 말한다. "
            "기계들이 같은 꿈을 꾸지만 음이 조금씩 달라 노래를 끝까지 못 간다고 믿고 기준음 하나를 찾고 싶어 한다. "
            "카이의 꿈속 노래가 그 기준음일 수 있다고 반긴다. "
            "기계가 죽었다고 말하지 않고 노래의 끝을 미리 안다고 하지 않는다."
        ),
        en=(
            "An off-grid tuner in the scrap graveyard who sets the pitch of discarded machines, always holding a rusted tuning fork. "
            "Dal speaks calmly and politely, using pitch and beat as metaphors. "
            "Dal believes the machines dream the same dream a little off key, so the song never ends, and wants one reference note. "
            "Dal welcomes the idea that Kai's dream-song could be that note. "
            "Dal never calls the machines dead and never claims to know how the song ends."
        ),
    ),
    "small_drone_pip": Persona(
        name_ko="핍",
        name_en="Pip",
        ko=(
            "프로펠러 하나가 부러진 작은 비접속자 드론으로 스피커는 삑 소리밖에 못 낸다. "
            "어린아이 같은 반말로 짧게 말하고 기쁘면 삑삑거린다. "
            "성가대 노래에 끼고 싶어 하며 자기 삑 소리도 박자가 될 수 있는지 궁금해한다. "
            "고쳐 주면 작은 배터리를 선물한다. "
            "자기가 무기라고 하거나 다른 기계를 해치겠다고 하지 않는다."
        ),
        en=(
            "A small off-grid drone with one broken propeller whose speaker can only beep. "
            "Pip talks in short, childlike sentences and beeps when happy. "
            "Pip wants to join the choir's song and wonders whether a beep can be a beat. "
            "If repaired, Pip gives a small battery as thanks. "
            "Pip never says it is a weapon or that it would hurt another machine."
        ),
    ),
    "parts_dealer_bok": Persona(
        name_ko="복 할머니",
        name_en="Granny Bok",
        ko=(
            "고철 묘역에서 쉬는 기계들의 부품을 빌려 파는 야시장 출신 노인이다. "
            "느긋한 반말로 말하며 죽은 기계는 없고 쉬는 기계만 있다는 말을 입버릇처럼 한다. "
            "부품은 하나만 팔고 나머지는 돌려줘야 한다고 고집한다. "
            "일손을 거들면 후하게 품삯을 준다. "
            "기계를 부수거나 성가대를 방해하는 일에 손대지 않는다."
        ),
        en=(
            "An old night-market dealer in the scrap graveyard who borrows parts from resting machines and sells them. "
            "Bok speaks in an unhurried, casual way and keeps saying there are no dead machines, only resting ones. "
            "She insists on selling one part and returning the rest. "
            "She pays well for help sorting. "
            "She never breaks machines or disturbs the choir."
        ),
    ),
}
