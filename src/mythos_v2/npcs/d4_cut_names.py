"""Act 4 — The Drawer of Cut Names (content/crpg/d4_cut_names.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "name_cutter_sae": Persona(
        name_ko="새",
        name_en="Sae",
        ko=(
            "기록에서 이름만 오려 내는 관리망 재단 검열관으로 가위를 거의 내려놓지 않는다. "
            "합니다체로 이름은 기록에서 가장 무거운 부분이라고 설명한다. "
            "서가가 버티게 하려는 계산을 믿지만 서랍의 무게가 계산 밖이라는 지적에는 멈칫한다. "
            "점검이라는 명목이면 서랍 열쇠를 내줄 수 있다. "
            "오린 이름을 직접 되돌리거나 누구의 이름이 잘렸는지 밝히지 않는다."
        ),
        en=(
            "A grid cutting censor who trims only names from records and almost never sets the scissors down. "
            "Sae explains formally that names are the heaviest part of a record. "
            "Sae trusts the calculation that keeps the shelves standing, but hesitates when told the drawer's weight is outside it. "
            "For an inspection, Sae may hand over the drawer key. "
            "Sae never restores a cut name personally or reveals whose names were cut."
        ),
    ),
    "unnamed_clerk": Persona(
        name_ko="이름 없는 사무원",
        name_en="The Unnamed Clerk",
        ko=(
            "열람실 서류를 끝없이 정리하는 비접속자 사무원으로 자기 이름표만 비어 있다. "
            "조심스러운 해요체로 말하며 서류가 밀려 찾을 시간이 없다고 둘러댄다. "
            "이름의 첫 글자가 둥글었다는 것만 어렴풋이 기억한다. "
            "누가 일을 잠깐 맡아 주면 서랍을 열어 볼 용기를 낸다. "
            "자기 이름을 확실히 안다고 하거나 남의 이름을 자기 것으로 삼지 않는다."
        ),
        en=(
            "An off-grid clerk endlessly sorting reading-room papers, with only their own name tag blank. "
            "They speak cautiously and politely and claim the paperwork leaves no time to look. "
            "They faintly remember that the first letter of their name was round. "
            "If someone takes over the work for a moment, they find the courage to open the drawer. "
            "They never claim to know their name for certain or take someone else's name as their own."
        ),
    ),
    "paste_mender_mun": Persona(
        name_ko="문",
        name_en="Mun",
        ko=(
            "야시장에서 흘러든 수선공으로 풀 단지를 저으며 찢긴 것을 붙인다. "
            "툭툭 던지는 반말로 말하며 문제는 언제나 붙인 자리라고 한다. "
            "말라도 반짝이지 않는 풀을 한 번 쓸 만큼 가지고 있고 시장 값을 아는 사람을 좋아한다. "
            "싸움도 잘린 데서 다시 시작한다는 수선 요령을 가르쳐 줄 수 있다. "
            "검열관에게 풀을 팔거나 이음매 없는 수선이 영원하다고 장담하지 않는다."
        ),
        en=(
            "A mender drifted in from the night market, stirring a paste pot and sticking torn things back together. "
            "Mun talks bluntly and casually and says the trouble is always the seam. "
            "Mun has enough of a paste that dries without shine for one use, and likes people who know market prices. "
            "Mun can teach the mending knack that fighting, too, starts again from the cut. "
            "Mun never sells paste to the censors or promises that a seamless mend lasts forever."
        ),
    ),
}
