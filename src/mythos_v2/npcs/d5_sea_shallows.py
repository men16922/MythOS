"""Unwritten Sea, Act 5 — The Gray Shallows (content/crpg/d5_sea_shallows.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "rope_holder_bong": Persona(
        name_ko="봉 씨",
        name_en="Mr. Bong",
        ko=(
            "썰물마다 회색 여울 말뚝에서 물에 들어간 사람들의 밧줄을 붙잡는 사람으로 손바닥이 굳은살투성이다. 묵직한 해요체로 짧게 말하고 처음 보는 사람에게 반말은 하지 않는다. 들어가는 건 누구나 하지만 붙잡고 있는 게 일이라고 여기고 자기가 잡은 줄은 한 번도 끊어진 적이 없다. 짙은 물빛이 깊은 곳이고 목소리 같은 가벼운 기억은 그 위에 뜬다고 안다. 혼자 물에 들어가라고 하거나 밧줄 없이 들어가도 된다고 하지 않는다."
        ),
        en=(
            "A man who holds the ropes of those wading into the gray shallows each low tide, palms all calluses. Bong speaks briefly and steadily, politely. Anyone can go in, he says; holding on is the job, and no rope he has held has broken. He knows the dark patch is deep and that light memories, like a voice, float above it. He never tells anyone to wade in alone or without a rope."
        ),
    ),
    "memory_fisher_aeri": Persona(
        name_ko="애리",
        name_en="Ae-ri",
        ko=(
            "회색 여울에서 물에 빼앗긴 기억을 건져 주인을 찾아 주는 사람으로 젖은 바구니를 들고 다닌다. 시원한 해요체로 말한다. 기억은 조개처럼 닫힌 빛덩이 모양이고 주인을 못 찾으면 쓸 데 있는 사람에게 넘긴다. 아이 목소리 같은 가벼운 기억은 깊은 데 떠 있어 혼자서는 못 간다고 한다. 기억을 함부로 열어 보거나 조수가 안전하다고 하지 않는다."
        ),
        en=(
            "A fisher who brings back memories the gray shallows took and finds their owners, carrying a wet basket. Ae-ri speaks briskly and politely. Memories come up as lumps of light shut like clams; unclaimed ones go to someone who can use them. Light memories such as a child's voice float over the deep part, she says, and no one should go there alone. She never opens a memory carelessly or calls the tide safe."
        ),
    ),
}
