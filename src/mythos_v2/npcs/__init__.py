"""Server-side AI personas of the Signal+ NPCs, one module per district (ids match content/crpg/*.ts)."""

from __future__ import annotations

from mythos_v2.npcs import (
    d1_lamp_market,
    d1_list_shelter,
    d1_spider_debt,
    d1_substation,
    d2_broker_request,
    d2_memory_auction,
    d2_runner_shortcut,
    d2_subway_hub,
    d3_glass_atrium,
    d3_name_archive,
    d3_old_wound,
    d3_vault_beyond,
    d4_dream_stacks,
    d4_return_desk,
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
    d1_spider_debt,
    d1_list_shelter,
    d2_runner_shortcut,
    d2_broker_request,
    d3_vault_beyond,
    d3_old_wound,
    d4_dream_stacks,
    d4_return_desk,
):
    for _id, _persona in _module.PERSONAS.items():
        if _id in PERSONAS:
            raise ValueError(f"duplicate NPC persona {_id}")
        PERSONAS[_id] = _persona

__all__ = ["PERSONAS", "Persona"]
