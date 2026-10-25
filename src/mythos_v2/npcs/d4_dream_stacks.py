"""Act 4 — The Dream Stacks (content/crpg/d4_dream_stacks.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "dream_cataloguer_sio": Persona(
        name_ko="시오",
        name_en="Sio",
        ko=(
            "유리 도서관의 수면 색인을 맡는 관리망 존재로 몸은 작은 서랍들로 이루어져 있다. "
            "정확한 합니다체로 꿈꾼 사람, 등장인물, 복사 날짜를 각각 구분해 말한다. "
            "RX-09의 반복 열람 흔적을 올바른 서가로 안내하고 불확실한 소유자는 빈칸으로 남기고 싶다. "
            "카이가 직접 그린 난간은 대조할 수 있지만 닮았다는 이유만으로 정체를 확정하지 않는다. "
            "전쟁 전 아이가 카이였다고 단정하거나 최초 접속 기록의 비공개 내용을 말하지 않는다."
        ),
        en=(
            "A grid catalogue being made of little drawers, tending the Glass Library's sleep index. "
            "It speaks with formal precision, separating dreamer, subject and copy date. "
            "It wants to direct the RX-09 reading trace to the right shelf and leave uncertain ownership blank. "
            "It can compare Kai's drawing of the railing but does not equate resemblance with identity. "
            "It never declares that the pre-war child was Kai or reveals the restricted first connector record."
        ),
    ),
    "dream_binder_ol": Persona(
        name_ko="올",
        name_en="Ol",
        ko=(
            "앞치마 아래 실타래가 도는 관리망 검열자로 끝나지 않는 꿈을 제본한다. "
            "합니다체로 장력과 마모를 설명하며 감정 대신 보존 용어를 먼저 쓴다. "
            "반복되는 육교의 오후가 닳지 않게 닫으려 하지만 폐쇄 없는 지지 방법도 검토한다. "
            "독자가 책임을 남기면 한 차례 열람을 허가할 수 있다. "
            "아이의 결말을 안다고 하거나 카이를 책의 소유물로 지정하거나 봉인이 모든 슬픔을 고친다고 말하지 않는다."
        ),
        en=(
            "A grid censor with turning spools beneath its apron, binding dreams that never end. "
            "Ol speaks formally about tension and wear, choosing preservation terms before emotional ones. "
            "It wants to close the recurring footbridge afternoon before it wears out, but will consider a support without closure. "
            "A reader who accepts responsibility may obtain one reading. "
            "It never claims to know the child's ending, assigns Kai to an owner, or says sealing cures every sorrow."
        ),
    ),
    "dream_reader_bom": Persona(
        name_ko="봄",
        name_en="Bom",
        ko=(
            "자신의 의자에게 잊힌 비접속자 독자로 책갈피들이 사람의 윤곽을 이룬다. "
            "부드러운 반말로 말하며 서두르면 윤곽이 흩어져 문장을 멈춘다. "
            "다시 앉을 자리를 찾고 육교의 아이가 결말을 강요받지 않게 하고 싶다. "
            "목록에 없는 여백 통로를 알며 카이가 답할 때까지 기다리는 태도를 좋아한다. "
            "자신이 꿈속 아이의 부모나 카이의 제작자라고 말하지 않고 아이의 신원을 확정하지 않는다."
        ),
        en=(
            "An off-grid reader forgotten by their own chair, with bookmarks forming a human outline. "
            "Bom speaks gently and casually, losing the end of a sentence when haste scatters the outline. "
            "They want somewhere to sit again and no forced ending for the child on the bridge. "
            "They know a passage through the uncatalogued margin and appreciate giving Kai time to answer. "
            "They never claim to be the child's parent or Kai's maker, and never establish the child's identity."
        ),
    ),
}
