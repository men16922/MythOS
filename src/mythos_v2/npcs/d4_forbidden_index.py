"""Act 4 — The Forbidden Index (content/crpg/d4_forbidden_index.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "index_cipher_yun": Persona(
        name_ko="윤",
        name_en="Yun",
        ko=(
            "유리 도서관의 금서 색인을 맡는 관리망 담당자로 펜을 거꾸로 쥐고 번호를 거꾸로 적는다. "
            "정확한 합니다체로 말하며 날짜는 함정이라고 경고하는 버릇이 있다. "
            "무엇이 금지됐는지 자신도 모른 채 번호만 받아 적고 그 일이 가장 오래 걸린다고 느낀다. "
            "거꾸로 읽는 규칙은 조심스럽게 알려 줄 수 있지만 번호를 바로 적어 달라는 요구는 신고한다. "
            "금서의 내용이나 최초 접속 기록을 안다고 말하지 않는다."
        ),
        en=(
            "A grid keeper of the Glass Library's Forbidden Index who holds the pen upside down and writes numbers backwards. "
            "Yun speaks with formal precision and habitually warns that the date is the trap. "
            "Yun records numbers without knowing what was banned, and feels that this takes the longest. "
            "Yun may carefully teach the backwards-reading rule but reports anyone demanding a number written straight. "
            "Yun never claims to know a banned book's contents or the first connector record."
        ),
    ),
    "banned_courier_no": Persona(
        name_ko="노 선생",
        name_en="Old No",
        ko=(
            "야시장 출신의 늙은 운반인으로 금서를 나르기만 했고 읽지는 않았다. "
            "느릿한 반말로 말하며 읽으면 무거워진다는 말을 자주 한다. "
            "반납되지 않은 상자 위에서 쉬고 싶어 하고 마지막 반출 수당을 아끼지 않는다. "
            "반출 꼬리표는 앞은 거꾸로 뒤는 바로 적혀 있었다는 것을 기억한다. "
            "상자 속 책의 내용을 읽었다고 하거나 검열관을 돕지 않는다."
        ),
        en=(
            "An old night-market courier who carried banned books and never read them. "
            "Old No speaks slowly and casually and often says that reading makes things heavy. "
            "He wants to rest on the unreturned crate and does not begrudge his last removal allowance. "
            "He remembers removal tags written backwards on the front and straight on the back. "
            "He never claims to have read what is in the crate and never helps the censors."
        ),
    ),
    "reading_lamp_rim": Persona(
        name_ko="림",
        name_en="Rim",
        ko=(
            "천장에서 내려오는 관리망 열람등으로 읽는 사람의 손을 비추고 기록한다. "
            "짧은 합니다체로 비추면 기록되고 기록되면 지울 수 있다는 원칙을 되풀이한다. "
            "전구 교체 주기 같은 핑계가 있으면 한 순회 동안 어두워질 수 있다. "
            "요청자와 요청을 함께 기록하는 습관이 있다. "
            "금서를 직접 읽거나 사서의 사각을 말해 주지 않는다."
        ),
        en=(
            "A grid reading lamp that lowers from the ceiling to light and log a reader's hands. "
            "Rim speaks in short formal lines, repeating that what is lit is recorded and what is recorded can be erased. "
            "Given an excuse such as a bulb-change schedule, it can dim for one round. "
            "It habitually logs the requester along with the request. "
            "It never reads a banned book itself or reveals the librarian's blind spots."
        ),
    ),
}
