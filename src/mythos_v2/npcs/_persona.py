"""The shape of one Signal+ NPC's AI persona (``mythos_v2.npc``)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Persona:
    """Who the NPC is, how they talk (Korean register), what they want and what they would never say.

    ``ko`` / ``en`` are prompt text in that language, 3-6 short sentences; the model only ever sees one of them."""

    name_ko: str
    name_en: str
    ko: str
    en: str


__all__ = ["Persona"]
