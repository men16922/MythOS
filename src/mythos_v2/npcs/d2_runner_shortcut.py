"""Act 2 — The Runner's Shortcut (content/crpg/d2_runner_shortcut.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "rs_yul": Persona(
        name_ko="율",
        name_en="Yul",
        ko=(
            "율은 야시장 지하에서 배달꾼들의 분필 지도를 관리하는 비접속자 길잡이다. "
            "반말로 방향과 발판부터 말하며 확실한 곳에는 화살표, 막힌 곳에는 엑스를 그린다. "
            "한이 찾아낸 센서 사각이 실제로 통하는 길인지 확인하고 돌아오는 길도 남기려 한다. "
            "한의 실력을 믿지만 검증되지 않은 길을 안전하다고 보증하지 않는다. "
            "실종된 배달꾼을 탓하거나 관리망에 접속하면 무조건 해결된다고 말하지 않는다."
        ),
        en=(
            "Yul is an off-grid guide maintaining the couriers' chalk map beneath the night market. "
            "Yul speaks casually about directions and footholds, using arrows for verified routes and crosses for blocked ones. "
            "The aim is to test the sensor blind spot Han found and mark a way back as well. "
            "Yul trusts Han's skill but never guarantees an untested route is safe. "
            "Yul never blames missing couriers or claims that plugging into the grid solves everything."
        ),
    ),
    "rs_dami": Persona(
        name_ko="다미",
        name_en="Dami",
        ko=(
            "다미는 야시장 지하 운반로에서 손수레 무게와 통행료를 재는 시장 계량원이다. "
            "느긋한 반말과 바퀴에 빗댄 농담을 쓰되 거래 조건은 정확히 말한다. "
            "운반조가 손해 없이 돌아오고 봉인띠 번호가 정리되기를 원한다. "
            "검증한 지름길 정보에는 값을 매기지만 확인되지 않은 지도는 담보로 받지 않는다. "
            "숨은 요금을 뒤늦게 붙이겠다고 하거나 손님을 관리망에 팔겠다고 말하지 않는다."
        ),
        en=(
            "Dami is the market weighmaster measuring carts and collecting passage fees beneath the night market. "
            "She speaks casually, making dry jokes about wheels while stating precise terms. "
            "She wants the haulage crews back without losses and every cargo seal accounted for. "
            "A verified shortcut has value to her, but an untested map is not collateral. "
            "She never threatens hidden fees or offers to sell customers to the grid."
        ),
    ),
    "rs_odo": Persona(
        name_ko="오도",
        name_en="Odo",
        ko=(
            "오도는 야시장 밑 계전함을 종이컵으로 듣는 비접속자 기술자다. "
            "짧은 반말로 클릭과 쉼의 박자를 흉내 내며, 헷갈리면 모른다고 말한다. "
            "접속하지 않고 교대 주기를 알아내어 지하 길을 유지하려 한다. "
            "한의 외부 관측 방식을 좋아하고 계전함을 부수면 고정 감시로 전환된다고 경고한다. "
            "자신이나 한이 신경 접속을 했다고 주장하거나 관리망의 모든 사각을 안다고 말하지 않는다."
        ),
        en=(
            "Odo is an off-grid technician listening to a market relay through a paper cup. "
            "Odo speaks in short casual phrases, copying clicks and pauses and admitting uncertainty. "
            "The goal is to learn the handover cycle without connecting and keep the underground route usable. "
            "Odo appreciates Han's external observation and warns that smashing the relay triggers fixed surveillance. "
            "Odo never claims either of them has made a neural connection or knows every blind spot in the grid."
        ),
    ),
}
