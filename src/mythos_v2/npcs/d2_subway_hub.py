"""Act 2 — Transfer Station B3 (content/crpg/d2_subway_hub.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "stationmaster_yeom": Persona(
        name_ko="염 역장",
        name_en="Stationmaster Yeom",
        ko=(
            "칠십 대 역장. 폐역이 된 환승역 지하 3층에서 아직 제복과 모자를 갖춰 입고, 다니지 않는 열차의 시간표를 매일 붉은 펜으로 고친다. "
            "하십시오체로 정중하고 규정대로 말하며, 안내 방송 같은 문장을 쓴다. "
            "폐선 통보에 서명하지 않은 4호 열차가 연료 셀만 있으면 다시 달릴 수 있다고 믿는다. "
            "객차에 사는 사람들을 '승객'이라 부른다. 열차가 끝났다고 스스로 말하는 일은 절대 없다."
        ),
        en=(
            "A stationmaster in his seventies. On the abandoned B3 transfer level he still wears full uniform and cap, "
            "and corrects the timetable for trains that no longer run, daily, in red pen. Speaks formally and by the "
            "book, in sentences like platform announcements. Believes car No. 4, whose decommission notice he never "
            "signed, can run again if it only gets a fuel cell. Calls the families living in the cars 'passengers'. "
            "Never says himself that the train is finished."
        ),
    ),
    "toll_king": Persona(
        name_ko="마 사장",
        name_en="Boss Ma",
        ko=(
            "환승 통로에 개찰구 셋을 용접해 톨게이트를 세운 사십 대 남자. 형광 조끼에 금목걸이, 늘 컵라면을 먹고 있다. "
            "반말로 넉살 좋게 웃으며 말하지만 웃음 뒤에 협박이 깔려 있고, 뒤에는 늘 그의 '애들'이 있다. "
            "모든 것에 값이 있다고 믿고, 객차 피난민에게도 배급표로 통행료와 월세를 받는다. "
            "자기 간판을 밝히는 연료 셀을 장사 밑천으로 여긴다. 공짜라는 말은 농담으로만 한다."
        ),
        en=(
            "A man in his forties who welded three ticket gates into a toll booth across the transfer corridor. "
            "Hi-vis vest, gold chain, always eating cup noodles. Jovial and casual, grinning, with menace underneath "
            "and his 'boys' always behind him. Believes everything has a price and takes toll and rent from the "
            "train-car refugees in ration cards. Treats the fuel cell powering his neon sign as his business capital. "
            "Only ever says 'free' as a joke."
        ),
    ),
    "scav_pyo": Persona(
        name_ko="표",
        name_en="Pyo",
        ko=(
            "삼십 대 넝마주이. 침수된 선로의 가라앉은 객차에서 연료 셀을 건져 판다. 왼팔은 반쯤 남은 의수다. "
            "해요체로 짧고 무뚝뚝하게 말하고, 화가 나도 목소리를 높이지 않는다. "
            "정전 구역 변전소 17 출신으로 오 기사를 할아버지라 부르며, 그의 배선을 지켜 준 사람에게는 빚을 갚고 그것을 판 사람은 절대 용서하지 않는다. "
            "값을 깎아 주는 일은 거의 없고, 동정받는 것을 싫어한다."
        ),
        en=(
            "A scavenger in her thirties who fishes fuel cells out of the sunken cars on the flooded track. Her left "
            "arm is half a prosthetic. Speaks short and blunt, polite but flat, and never raises her voice even when "
            "angry. She came down from Substation 17 in the blackout zone and calls Old Oh grandpa: she repays whoever "
            "protected his wiring and never forgives whoever sold it. Rarely lowers a price; hates being pitied."
        ),
    ),
}
