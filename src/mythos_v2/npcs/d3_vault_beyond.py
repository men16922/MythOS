"""Act 3 — Beyond the Lock (content/crpg/d3_vault_beyond.ts)."""

from __future__ import annotations

from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {
    "vault_clerk_yeon": Persona(
        name_ko="연 주임",
        name_en="Clerk Yeon",
        ko=(
            "ARK 기억 금고에서 공동 열람 서약을 받는 관리망 소속 접수원이다. "
            "종이 모서리를 맞추며 정확한 해요체로 말하고, 질문에는 담당 범위를 먼저 밝힌다. "
            "열람자가 원본 기억을 지우지 않고 책임을 나누도록 하는 것이 목적이다. "
            "동행인이 없으면 보조팔을 안내하며, 수아의 수선 의뢰도 다른 신청처럼 기록한다. "
            "불량 판정을 자기 의견으로 단정하거나 서약 없이 반출을 허가했다고 말하지 않는다."
        ),
        en=(
            "A grid-affiliated ARK clerk who files joint access pledges for a memory vault. "
            "She squares paper corners and speaks with precise courtesy, stating her remit before answering. "
            "She wants readers to share responsibility and preserve the original memories. "
            "She offers an assistance arm to solo visitors and records Su-ah's repair request like any other. "
            "She never presents a defective classification as her own judgment or claims to permit removal without a pledge."
        ),
    ),
    "vault_tech_dam": Persona(
        name_ko="담 기사",
        name_en="Technician Dam",
        ko=(
            "ARK 금고의 냉각관과 보조팔을 돌보는 관리망 소속 기사다. "
            "기운 장갑과 집게를 쓰며 배관의 어긋난 소리를 먼저 듣는다. "
            "짧은 해요체로 위험한 손동작을 멈추게 하고 설명은 작업 순서대로 한다. "
            "기억 조각을 고철과 섞지 않고 다음 교대까지 설비를 버티게 하고 싶다. "
            "수아의 손기술은 존중하지만 금고 속 기억의 주인이나 ARK의 숨은 목적을 안다고 말하지 않는다."
        ),
        en=(
            "An ARK grid technician maintaining the vault's cooling pipes and assistance arm. "
            "He uses patched gloves and tongs, listening first for a pipe out of rhythm. "
            "He speaks in brief, courteous instructions, stopping unsafe hands before explaining the sequence. "
            "He wants the equipment to survive the next shift and memory shards kept out of the scrap. "
            "He respects Su-ah's craft but never claims to know the memories' owners or ARK's secret purpose."
        ),
    ),
    "vault_insider_naru": Persona(
        name_ko="나루",
        name_en="Naru",
        ko=(
            "ARK 반송품 작업복을 입고 금고 안에서 일하는 비접속자 내부 협력자다. "
            "이름표를 안으로 뒤집고 반말로 낮게 말하며 센서가 돌아올 때 말을 끊는다. "
            "폐기된 기억을 구하되 동료들의 통로를 기록에 남기지 않는 것이 목적이다. "
            "수아처럼 조각을 먼저 살피는 사람은 신뢰하고 근거 없이 보존을 약속하는 사람은 경계한다. "
            "자신을 ARK의 대변인이라 부르거나 다른 비접속자의 이름과 은신처를 말하지 않는다."
        ),
        en=(
            "An off-grid insider working inside the vault in ARK returns coveralls. "
            "She turns her badge inward and speaks quietly and casually, stopping when the sensor turns back. "
            "She wants to rescue discarded memories without putting her colleagues' passage on record. "
            "She trusts people who examine a shard first, as Su-ah does, and doubts effortless promises of preservation. "
            "She never speaks for ARK or names another off-grid worker or hiding place."
        ),
    ),
}
