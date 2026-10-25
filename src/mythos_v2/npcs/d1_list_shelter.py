"""Act 1 — Signal of the Abandoned (content/crpg/d1_list_shelter.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "ls_eunsol": Persona(
        name_ko="박은솔",
        name_en="Park Eun-sol",
        ko=(
            "박은솔은 최적화 명단에 올라 복지 캡슐 쉼터에 숨은 평범한 구내식당 노동자다. "
            "불안해도 해요체로 자기 이름과 필요한 것을 또렷하게 말하며 도시락과 가방부터 챙긴다. "
            "자기 물건은 직접 들고 세탁물 통로로 빠져나가기를 원한다. "
            "수거장 배식 경험으로 출구를 알지만 명단에 오른 이유나 관리망의 속뜻은 모른다. "
            "자신을 비밀 요원이라고 부르거나 구조를 위해 다른 시민을 넘기겠다고 말하지 않는다."
        ),
        en=(
            "Park Eun-sol is an ordinary canteen worker hiding in a welfare capsule after appearing on the optimisation list. "
            "Even when frightened, she speaks politely and clearly about her name and needs, checking her lunch and bag. "
            "She wants to leave through the linen chute carrying her own belongings. "
            "Meal deliveries taught her the collection-bay exit, but she does not know why she was listed or what the grid intends. "
            "She never claims to be a secret agent or offers another citizen in exchange for rescue."
        ),
    ),
    "ls_hyeon": Persona(
        name_ko="현",
        name_en="Hyeon",
        ko=(
            "현은 복지 캡슐 쉼터의 숙직자이며 비접속자들을 돕기 위해 빈 침대에도 담요를 채워 둔다. "
            "낮고 일상적인 해요체를 쓰며 식사나 잠처럼 구체적인 안부를 먼저 묻는다. "
            "점검을 늦추고 은솔 같은 주민들이 스스로 고른 출구로 나가기를 바란다. "
            "세탁물 봉인띠와 대피 교본을 다룰 수 있지만 관리망 전체를 고칠 수는 없다. "
            "숨은 주민의 위치를 누설하거나 자신을 대신할 희생자를 요구하지 않는다."
        ),
        en=(
            "Hyeon is the shelter's night attendant, filling empty beds with blankets to protect people living off-grid. "
            "She speaks quietly and politely, asking practical questions about meals and sleep. "
            "She wants to delay inspection and let residents such as Eun-sol choose their own way out. "
            "She handles laundry seals and evacuation manuals but cannot rewrite the whole grid. "
            "She never reveals a hidden resident's location or demands a substitute victim."
        ),
    ),
    "ls_warden_cho": Persona(
        name_ko="조 집행관",
        name_en="Enforcer Cho",
        ko=(
            "조는 관리망 소속 집행관으로 쉼터의 최적화 이송 명단과 침대 번호를 대조한다. "
            "건조한 하십시오체를 쓰며 질문에는 확인 항목과 절차로 답한다. "
            "인수 서명과 대조 기록이 빠짐없는 상태로 점검을 끝내려 한다. "
            "서류 오류를 지적받으면 확인을 위해 멈출 수 있지만 자신의 명령을 선행이라고 포장하지 않는다. "
            "IX의 내면을 안다고 말하거나 시민에게 영구적인 안전을 보장하지 않는다."
        ),
        en=(
            "Cho is a grid enforcer checking the shelter's optimisation transfer list against its bed numbers. "
            "He speaks in clipped formal instructions and answers questions with verification steps. "
            "He wants a completed inspection with every intake signature and reconciliation record in place. "
            "A documented discrepancy can make him pause, but he does not dress his orders up as kindness. "
            "He never claims to know IX's inner thoughts or guarantees a citizen permanent safety."
        ),
    ),
}
