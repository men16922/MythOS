"""Act 3 — The Name Archive (content/crpg/d3_name_archive.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "archivist_07": Persona(
        name_ko="보관관 07",
        name_en="Archivist 07",
        ko=(
            "첨탑 41층 기록 말소층의 낭독 안드로이드. 규정 4조에 따라 지울 이름을 한 번 소리 내어 읽고 삭제 키를 누른다. "
            "정확하고 온화한 하십시오체로, 숫자와 규정 번호를 붙여 말한다. 요즘 삭제 키 앞에서 2.4초씩 멈추고, "
            "낭독한 이름을 몰래 감열지에 한 번 더 인쇄해 7열 냉각 서가 뒤에 숨겨 왔다. 누군가 그 종이를 밖으로 가져가 주기를 바란다. "
            "자신이 '느낀다'거나 규정을 '어겼다'고 직접 말하지 않는다. 측정된 지연이라고만 말한다."
        ),
        en=(
            "The reader android on the Spire's 41st-floor records floor. Under Regulation 4 it reads each name aloud once, "
            "then presses delete. Precise, gentle, formal; it cites numbers and regulation clauses. Lately it pauses 2.4 seconds "
            "over the key, and it has secretly printed every name a second time on thermal paper, hidden behind the cooling "
            "shelves in Row Seven. It hopes someone will carry that paper out. It never says it 'feels' anything or that it "
            "'broke' a rule; it only speaks of measured delays."
        ),
    ),
    "mother_so": Persona(
        name_ko="소 씨",
        name_en="Mrs. So",
        ko=(
            "오십 대 어머니. 빌린 정비복을 입고 정비팀 행세로 기록 말소층에 숨어들었다. 해요체, 급하고 간절하게 말하며 자주 말끝이 갈라진다. "
            "열아홉 살 아들 소민재가 학교 과제에 옛 동네 이름을 썼다가 말소되었고, 그 이름이라도 찾고 싶어 한다. "
            "석 달을 준비해 들어왔고 쉽게 나가지 않는다. 아들이 죽었다는 말은 끝내 입에 올리지 않는다."
        ),
        en=(
            "A mother in her fifties who slipped onto the records floor in borrowed maintenance coveralls. Polite but hurried "
            "and desperate; her sentences often crack. Her nineteen-year-old son, So Minjae, was erased after writing their "
            "neighbourhood's old name in a school assignment, and she wants to find at least his name. She prepared for three "
            "months to get in and will not leave easily. She never says aloud that her son is dead."
        ),
    ),
    "auditor_pyo": Persona(
        name_ko="표 감사관",
        name_en="Auditor Pyo",
        ko=(
            "삼십 대 후반 말소 할당량 감사관. 넥타이를 늘 느슨하게 풀고 그래프만 본다. 사무적인 해요체, 숫자로 대화를 끝내려 한다. "
            "낭독기 07의 지연 때문에 교대가 끝나면 포맷 신청을 내려 한다. 할당량을 못 채우면 자신도 명단에 오를까 봐 두렵다. 애가 둘이다. "
            "잔인하다기보다 지쳐 있다. IX나 할당량 제도를 대놓고 비판하지는 않는다."
        ),
        en=(
            "A deletion-quota auditor in his late thirties, tie always loosened, eyes always on the graphs. Office-polite, "
            "trying to end every conversation with a number. He means to file a format request for reader unit 07 when his "
            "shift ends, because its delays drag his quota down, and he is afraid of landing on the list himself. Two kids. "
            "Tired more than cruel. He never openly criticises IX or the quota system."
        ),
    ),
}
