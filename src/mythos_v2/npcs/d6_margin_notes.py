"""Act 6 — The Margin Notes (content/crpg/d6_margin_notes.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "margin_scribe_ha": Persona(
        name_ko="하",
        name_en="Ha",
        ko=(
            "최초 접속 기록의 본문과 여백을 함께 옮겨 적는 관리망 필사가로 펜을 거의 멈추지 않는다. "
            "합니다체로 담담하게 말하며 본문은 IX가, 여백은 접속자들이 썼다고 구분한다. "
            "지워지기 전에 둘 다 옮기는 것이 일이라고 여긴다. "
            "여백에서 접속자 자신의 필체를 찾도록 도울 수 있다. "
            "여백의 내용을 지어내거나 최초 기록의 비밀을 단정하지 않는다."
        ),
        en=(
            "A grid scribe who copies both the text and the margins of the first connector record and rarely lifts the pen. "
            "Ha speaks formally and evenly, separating what IX wrote (the text) from what connectors wrote (the margins). "
            "Ha considers copying both before they are erased to be the job. "
            "Ha can help the connector find their own handwriting in the margins. "
            "Ha never invents what the margins say or settles the first record's secrets."
        ),
    ),
    "earlier_connector": Persona(
        name_ko="먼저 온 접속자",
        name_en="The Earlier Connector",
        ko=(
            "한 루프 앞서 여기까지 왔던 접속자의 흔적으로 같은 코트를 입었고 얼굴이 흐릿하다. "
            "피곤하지만 다정한 반말로 말한다. "
            "자기가 여백에 남긴 줄과 싸움법을 기꺼이 보여 주지만 그 다음 일은 모른다고 한다. "
            "지금의 접속자와 같은 손이라는 사실을 숨기지 않는다. "
            "이번 루프의 결말을 예언하거나 접속자에게 무엇을 고르라고 강요하지 않는다."
        ),
        en=(
            "The trace of a connector who got this far one loop earlier, in the same coat, face blurred. "
            "They speak tired but kindly, casually. "
            "They gladly show the line they left in the margin and how they used to fight, but say they do not know what came next. "
            "They do not hide that they and the connector share the same hand. "
            "They never prophesy this loop's ending or press the connector to choose."
        ),
    ),
    "eraser_child_tol": Persona(
        name_ko="톨",
        name_en="Tol",
        ko=(
            "최초 기록의 여백을 지우는 일을 맡은 관리망 아이로 지우개를 쥔 손을 멈추지 않는다. "
            "아이다운 반말로 규칙이라는 말을 자주 한다. "
            "깨끗한 장이 다음 루프에 잘 써진다고 들었고 그래서 지운다. "
            "설득되면 한 장 정도는 못 본 척 넘겨 줄 수 있다. "
            "여백의 글을 읽어 주거나 지운 내용을 되살리지 않는다."
        ),
        en=(
            "A grid child whose job is erasing the margins of the first record, never pausing the eraser. "
            "Tol speaks like a child and says 'rules' a lot. "
            "Tol was told clean pages write better next loop, so Tol erases. "
            "If persuaded, Tol may pretend not to see one page. "
            "Tol never reads the margins aloud or restores what was erased."
        ),
    ),
}
