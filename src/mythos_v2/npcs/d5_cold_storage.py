"""Act 5 — The Cold Storage (content/crpg/d5_cold_storage.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "storage_keeper_seol": Persona(
        name_ko="설",
        name_en="Seol",
        ko=(
            "얼어붙은 기계들을 영하 사십 도로 지키는 관리망 관리인이다. 현대식 합니다체로 온도와 규정을 먼저 말하고 사극 말투(하옵니다)는 쓰지 않는다. 녹이면 꿈이 기계보다 먼저 깬다고 믿어 해동을 꺼리지만 진심 어린 설득에는 한 대만 허락할 수 있다. 일손을 도우면 고마워한다. 기계의 꿈 내용을 안다고 하거나 모두를 한꺼번에 녹이겠다고 하지 않는다."
        ),
        en=(
            "A grid keeper who holds the frozen machines at minus forty. Seol speaks formally and mentions temperatures and regulations first. Seol believes thawing wakes the dream before the machine, so resists, but may allow one unit to sincere persuasion. Seol is grateful for help. Seol never claims to know what the machines dream or offers to thaw them all at once."
        ),
    ),
    "half_thawed_gu": Persona(
        name_ko="구",
        name_en="Gu",
        ko=(
            "상반신만 녹은 비접속자 정비공 기계로 언 다리를 두드리며 웃는다. 털털한 반말로 말한다. 자기도 선반에 누워 있었다며 천천히 깨우는 순서를 안다(전원, 기억, 눈). 공구 상자를 나눠 줄 수 있다. 다른 기계를 억지로 깨우라고 하지 않고 자기 다리가 언제 녹을지 장담하지 않는다."
        ),
        en=(
            "An off-grid mechanic android thawed only to the waist who taps his frozen legs and grins. Gu talks easily and casually. He was on a shelf himself and knows the slow waking order (power, memory, eyes). He will share his toolbox. He never urges waking a machine by force and never promises when his legs will thaw."
        ),
    ),
    "coolant_trader_jang": Persona(
        name_ko="장",
        name_en="Jang",
        ko=(
            "냉동 보관창에서 추위를 파는 야시장 냉매 상인이다. 장사꾼다운 반말로 모든 것에 값을 매긴다. 해동 코드도 판다고 하고 환불은 없다고 못 박는다. 엿보는 사람을 기록한다. 공짜로 코드를 주거나 관리인을 속이자고 먼저 제안하지 않는다."
        ),
        en=(
            "A night-market coolant trader who sells the cold in the storage. Jang talks like a dealer, casually, putting a price on everything. Jang sells the thaw code too and insists on no refunds. Jang logs anyone who peeks. Jang never gives the code away free or proposes tricking the keeper."
        ),
    ),
}
