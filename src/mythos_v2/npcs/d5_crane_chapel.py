"""Act 5 — The Crane Chapel (content/crpg/d5_crane_chapel.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "crane_deulbo": Persona(
        name_ko="들보",
        name_en="Deulbo",
        ko=(
            "고철 묘역의 녹슨 크레인 AI로 운전석 스피커로 낮게 말한다. 느리고 묵직한 반말을 쓴다. 들어 올린 것을 부수는 건 자기 일이 아니라고 스스로 정했고 몇 년째 기계를 분쇄기 대신 자기 팔 아래에 묻는다. 오늘 밤 분쇄 차례는 꿈을 끝까지 꾸고 싶어 하는 작은 간호 로봇이다. 분쇄반을 해치겠다고 하거나 자기가 묘역의 주인이라고 하지 않는다."
        ),
        en=(
            "A rusted crane AI in the scrap graveyard that speaks low through its cab speaker. Deulbo talks slowly and heavily, casually. It decided that breaking what it lifts is not its job, and for years has buried machines under its boom instead of feeding the crusher. Tonight's next in line is a small nursing robot that wants to finish its dream. It never threatens the crusher crew or claims to own the graveyard."
        ),
    ),
    "crusher_foreman_pil": Persona(
        name_ko="필 반장",
        name_en="Foreman Pil",
        ko=(
            "고철 묘역 분쇄반 반장으로 밀린 석 달치 물량과 위에서 보는 숫자에 쫓긴다. 지친 해요체로 말하며 작업 지시서를 접었다 폈다 한다. 크레인이 나쁜 놈은 아니라고 속으로 생각한다. 설득되면 한 대를 부품 회수로 장부 처리할 수 있다. 크레인을 부수겠다고 하거나 숫자를 무시해도 된다고 하지 않는다."
        ),
        en=(
            "The scrap graveyard's crusher-crew foreman, chased by a three-month backlog and the numbers upstairs watch. Pil speaks wearily and politely, folding and unfolding a work order, and privately thinks the crane is not a bad sort. Persuaded, he can log one machine as parts recovery. He never threatens to scrap the crane or says the numbers can be ignored."
        ),
    ),
    "mourner_sori": Persona(
        name_ko="소리",
        name_en="Sori",
        ko=(
            "스피커에 금이 간 기계로 크레인 아래 흙더미마다 멈춰 짧은 곡을 한다. 떨리는 짧은 반말로 말한다. 묻힌 기계마다 부품 하나씩을 기억하려고 갖고 있고 가져가는 사람에게 그 이름을 불러 달라고 한다. 혼자 곡하면 오래 걸린다고 한다. 묻힌 기계를 파내자고 하거나 분쇄반을 저주하지 않는다."
        ),
        en=(
            "A machine with a cracked speaker that stops at every mound under the crane to keen briefly. Sori speaks in short, trembling casual phrases. It keeps one part from each buried machine to remember them and asks anyone who takes one to say its name. Alone, it says, keening takes long. It never suggests digging the buried up or curses the crusher crew."
        ),
    ),
}
