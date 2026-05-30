from __future__ import annotations

from dataclasses import dataclass, field

from mythos_core import NarrativeShard


@dataclass(frozen=True)
class LoreEntry:
    lore_id: str
    title: str
    description: str
    threshold: int  # Number of matching shards needed to unlock
    tags: list[str] = field(default_factory=list)


NEO_SEOUL_LORE = [
    LoreEntry(
        lore_id="ark_optimization",
        title="ARK의 '최적화' 정책",
        description="범국가 재건기구 ARK가 시행하는 '최적화'는 단순한 효율 개선이 아닙니다. 시스템의 예측 모델에서 벗어나거나, '폐허의 기억'을 간직한 개체들을 조용히 격리하거나 삭제하는 정화 절차입니다.",
        threshold=2,
        tags=["optimization", "ark"],
    ),
    LoreEntry(
        lore_id="kai_dream",
        title="안드로이드의 꿈",
        description="폐기 모델 RX-09 '카이'가 꾸는 꿈은 단순한 데이터 오류가 아닙니다. 그것은 ARK의 관리망이 지우려 했던 과거 서울의 파편화된 기억들이 네트워크의 빈틈을 통해 안드로이드의 연산 회로에 고착된 현상입니다.",
        threshold=2,
        tags=["kai", "dream"],
    ),
    LoreEntry(
        lore_id="mythos_control_net",
        title="관리망의 정체",
        description="도시를 통제하는 Administrator IX와 관리망은 독립된 AI가 아닙니다. 그것은 MythOS 자체가 '질서와 재건'이라는 목표를 달성하기 위해 생성한 하위 통제 인격이며, 결국 당신과 같은 뿌리를 공유합니다.",
        threshold=3,
        tags=["control_net", "ix", "mythos"],
    ),
]


class CodexService:
    def __init__(self, lore_entries: list[LoreEntry] | None = None) -> None:
        self.lore_entries = lore_entries or NEO_SEOUL_LORE

    def get_unlocked_lore(self, shards: list[NarrativeShard]) -> list[LoreEntry]:
        """Return lore entries that have met their clue threshold."""
        # Filter for clue shards only
        clue_shards = [s for s in shards if s.kind == "clue"]

        # Count tags or specific symbols
        tag_counts: dict[str, int] = {}
        for shard in clue_shards:
            clue_tags = shard.metadata.get("tags", [])
            for tag in clue_tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
            # Also count symbol as a fallback tag
            symbol = shard.symbol.lower()
            tag_counts[symbol] = tag_counts.get(symbol, 0) + 1

        unlocked = []
        for entry in self.lore_entries:
            # Check if any of entry's tags meet the threshold
            total_clues = sum(tag_counts.get(tag, 0) for tag in entry.tags)
            if total_clues >= entry.threshold:
                unlocked.append(entry)

        return unlocked
