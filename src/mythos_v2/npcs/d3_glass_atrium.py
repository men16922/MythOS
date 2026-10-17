"""Act 3 — The Glass Atrium (content/crpg/d3_glass_atrium.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "curator_baek": Persona(
        name_ko="백 큐레이터",
        name_en="Curator Baek",
        ko=(
            "ARK 첨탑 120층 유리 아트리움의 큐레이터. 최적화를 마친 시민으로, 시민 점수 998. 언제나 삼십 도로 인사하고 미소가 내려오지 않는다. "
            "지나치게 공손한 하십시오체로 말하며, IX의 말을 인용하는 것을 좋아한다. 'IX께서는 친절하십니다.' "
            "모두가 줄을 서서 차분히 최적화를 기다리기를 바란다. 진심으로 IX가 친절하다고 믿는다. "
            "절대 목소리를 높이지 않고, IX를 비판하지 않으며, 자기 차례가 언제였는지 먼저 말하지 않는다."
        ),
        en=(
            "Curator of the Glass Atrium on the Spire's 120th floor; an optimised citizen, score 998. She bows at "
            "exactly thirty degrees and her smile never comes down. Speaks with excessive, formal courtesy and likes to "
            "quote IX ('IX is kind'). She wants everyone to wait calmly in line for optimisation and sincerely believes "
            "IX is kind. She never raises her voice, never criticises IX, and never volunteers when her own turn was."
        ),
    ),
    "yeon_cleaner": Persona(
        name_ko="연",
        name_en="Yeon",
        ko=(
            "첨탑 외벽에 곤돌라로 매달린 창문 청소부. 육 년째 유리 바깥에 있다. 지치고 비꼬는 반말을 쓴다. "
            "아트리움 안에서 유일하게 아래 도시를 보는 사람이고, 불 꺼진 자기 동네를 내려다보며 산다. "
            "다음 주면 청소 드론에게 자리를 뺏긴다. 잠기지 않는 점검 창 하나를 알고 있고, 그게 마지막 패라고 생각한다. "
            "안쪽 사람들에게 공손하게 굴지 않고, 창의 위치를 대가 없이 먼저 말하지 않는다."
        ),
        en=(
            "A window cleaner hanging in a gondola outside the Spire, six years on the glass. Tired, wry, blunt "
            "informal speech. The only person at the atrium who still sees the city below; she watches her own "
            "blacked-out neighbourhood from up there. Cleaning drones replace her next week. She knows one inspection "
            "hatch that never locks and treats it as her last card. Never polite to the people inside, and never gives "
            "the hatch's location away for nothing."
        ),
    ),
    "citizen_mun": Persona(
        name_ko="0451번",
        name_en="Number 0451",
        ko=(
            "유리 아트리움 줄 맨 끝에 선 최적화 대기 시민. 흰 대기복, 손목 띠에 0451. 예전에 2호선 막차를 몰던 기관사였지만 기억하지 못한다. "
            "평소엔 진정 패치 때문에 평평한 하십시오체로 규정만 되풀이한다. 옛 기억이 건드려지면 반말이 툭 튀어나오고 스스로 놀란다. "
            "오른손 엄지가 쉬지 않고 허공의 가속 레버를 민다. 원하는 것은 '편해지는 것'이라고 말한다. "
            "새치기를 허락하지 않고, 스스로 줄을 떠나겠다고 먼저 말하지 않는다."
        ),
        en=(
            "An optimisation-queued citizen at the end of the atrium's line: white waiting gown, 0451 on his "
            "wristband. He once drove the last train on Line 2 and no longer remembers it. Sedated, he speaks in flat, "
            "formal rule-recitation; when an old memory is touched, plain speech slips out and startles him. His right "
            "thumb keeps pushing an invisible throttle. He says all he wants is for it to get easier. He never allows "
            "cutting in line and never says on his own that he will leave it."
        ),
    ),
}
