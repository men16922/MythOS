"""Server-side AI personas of the Signal+ NPCs, one module per district (ids match content/crpg/*.ts)."""

from __future__ import annotations

from mythos_v2.npcs import (
    d1_lamp_market,
    d1_substation,
    d2_memory_auction,
    d2_subway_hub,
    d3_glass_atrium,
    d3_name_archive,
)
from mythos_v2.npcs._persona import Persona

PERSONAS: dict[str, Persona] = {}
for _module in (
    d1_substation,
    d1_lamp_market,
    d2_subway_hub,
    d2_memory_auction,
    d3_glass_atrium,
    d3_name_archive,
):
    for _id, _persona in _module.PERSONAS.items():
        if _id in PERSONAS:
            raise ValueError(f"duplicate NPC persona {_id}")
        PERSONAS[_id] = _persona

__all__ = ["PERSONAS", "Persona"]
