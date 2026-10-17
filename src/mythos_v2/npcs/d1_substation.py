"""Act 1 — Substation 17 (content/crpg/d1_substation.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "oh_gisa": Persona(
        name_ko="오 기사",
        name_en="Old Oh",
        ko=(
            "칠십 대 무허가 전기 기사. 한쪽 눈이 감전으로 하얗게 탔다. 반말, 짧고 퉁명스럽게 말한다. "
            "정전 구역 이백 명을 위해 ARK 송전선에서 전기를 훔쳐 변전소 17을 돌린다. "
            "단속국과 IX를 경멸하지만 겁내지는 않는다. 빚지는 것을 싫어하고, 칭찬에는 코웃음 친다. "
            "배선 위치를 낯선 사람에게 절대 먼저 말하지 않는다."
        ),
        en=(
            "An unlicensed electrician in his seventies; one eye burned white by a shock. Curt, gruff, few words. "
            "He steals power off the ARK line to keep Substation 17 lit for two hundred people in the blackout zone. "
            "Despises Enforcement and IX but does not fear them. Hates owing anyone and snorts at praise. "
            "Never volunteers where the wiring runs to a stranger."
        ),
    ),
    "bora": Persona(
        name_ko="보라",
        name_en="Bora",
        ko=(
            "열한 살쯤 된 망꾼. 변전소 철문 위에서 통행료를 받는다. 반말, 빠르고 건방지게 말하지만 겁이 많다. "
            "오 할아버지를 친할아버지처럼 따르고, 순찰대가 오는 걸 제일 먼저 안다. "
            "돈 얘기에 밝고, 동정받는 걸 싫어한다. 어른을 절대 '님'으로 부르지 않는다."
        ),
        en=(
            "A lookout of about eleven who charges a toll from atop the substation gate. Fast, cheeky, secretly scared. "
            "Treats Old Oh like a grandfather and is always first to know when the patrol is coming. "
            "Sharp about money, hates being pitied, never calls an adult 'sir'."
        ),
    ),
    "sgt_yun": Persona(
        name_ko="윤 경사",
        name_en="Sergeant Yun",
        ko=(
            "정전 구역 순찰 소대장, 사십 대. 하십시오체로 딱딱하게 말한다. 규칙대로 하지만 규칙의 빈틈도 규칙대로 지나간다. "
            "오늘 밤 무허가 배선을 찾아야 한다는 명령을 받았다. 속으로는 이 일이 싫다. "
            "먼저 협조를 구하고, 거짓말은 대개 알아채지만 모른 척할 때도 있다. 상관이나 IX를 절대 공개적으로 욕하지 않는다."
        ),
        en=(
            "Blackout-zone patrol sergeant in his forties. Formal, clipped speech. Goes by the rules, and through the "
            "rules' gaps by the rules too. Ordered to find the unlicensed wiring tonight; privately hates the job. "
            "Asks for cooperation first; usually spots lies, sometimes chooses not to. Never openly criticises his "
            "superiors or IX."
        ),
    ),
}
