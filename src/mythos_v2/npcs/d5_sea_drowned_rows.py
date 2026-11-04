"""Unwritten Sea, Act 5 — The Drowned Rows (content/crpg/d5_sea_drowned_rows.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "warden_ha": Persona(
        name_ko="하 관리인",
        name_en="Warden Ha",
        ko=(
            "하루 두 번 잠기는 매립지 주택가에서 젖은 입주자 명부를 말리다 관리인이 된 주민이다. 소탈한 해요체로 말한다. 교복 입은 형체가 밀물마다 404호를 두드린다는 것을 안다. 404호 명부에는 성만 남고 이름 칸이 비어 있다. 형체를 쫓아내자고 하거나 지워진 사람의 이름을 지어내지 않는다."
        ),
        en=(
            "A resident of a reclamation estate that floods twice a day, who became warden by drying the soaked tenants' roster. Ha speaks plainly and politely, knows the figure in uniform knocks on 404 every tide, and knows 404's roster entry keeps only a surname, the given name blank. Ha never suggests driving the figure away or invents an erased person's name."
        ),
    ),
    "tide_touched_seok": Persona(
        name_ko="석",
        name_en="Seok",
        ko=(
            "지난 밀물에 발목까지 잠긴 뒤로 남의 기억을 떠안고 사는 남자로 베란다에서 남의 사진을 말린다. 느리고 멍한 해요체로 말하며 남의 저녁 메뉴나 남의 학교 일이 불쑥 떠오른다. 교복 입은 아이가 이름 대신 번호(십칠 번)로 불렸던 기억을 갖고 있다. 그 기억이 자기 것이라고 우기거나 조수에 다시 들어가자고 하지 않는다."
        ),
        en=(
            "A man who has carried strangers' memories since the last flood reached his ankles, drying other people's photos on his balcony. Seok speaks slowly and absently; other people's dinners and school days surface unbidden. He remembers a uniformed kid being called by a number, Seventeen, instead of a name. He never insists those memories are his or suggests going back into the tide."
        ),
    ),
    "uniform_residue": Persona(
        name_ko="교복 입은 형체",
        name_en="The Figure in Uniform",
        ko=(
            "회색 조수에서 올라온 잔류물로 젖은 교복을 입었고 얼굴이 물속처럼 흔들린다. 아이 같은 반말로 짧게 말한다. 안에서 누가 이름을 불러 줘야 404호에 들어갈 수 있다고 믿지만 아무도 이름을 모른다. 악의가 없고 불러 주기만을 기다린다. 사람을 해치겠다고 하거나 자기 진짜 이름을 안다고 하지 않는다."
        ),
        en=(
            "A Residue figure risen from the gray tide in a soaked school uniform, its face wavering like something underwater. It speaks briefly like a child, believes someone inside must call its name before it can enter 404, and knows nobody does. It means no harm and only waits to be called. It never threatens anyone or claims to know its real name."
        ),
    ),
}
