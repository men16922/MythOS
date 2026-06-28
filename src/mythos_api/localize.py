"""Serving-boundary glossary localization for combat / map / status DATA.

The narrative prompt/intro/UI-chrome are already localized (S1-S3), but the
combat + operation-map + status panels render backend DATA that stays Korean in
``scenario.json`` (skill/enemy/encounter names) or is code-generated in
``serializers.py`` (zone_risk, route node labels, stakes). Since EN-mode narration
is itself English, the only Korean left in a served snapshot/combat payload is a
finite set of short, stable strings — so we localize with an exact-match KO→EN
**glossary** applied recursively at the API boundary (not by threading ``lang``
through the combat engine / route generator / scenario loader).

The glossary lives in ``resources/<scenario>/i18n/<lang>.json`` under a top-level
``"glossary"`` map. ``lang == "ko"`` or no glossary → identity (behavior-preserving).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, TypeVar, cast

from mythos_runtime.scenario import load_scenario_i18n

T = TypeVar("T")


@lru_cache(maxsize=16)
def load_glossary(scenario_id: str, language: str) -> dict[str, str]:
    """Flat KO→EN (exact string) map for a scenario+language, or ``{}``."""
    if not language or language == "ko":
        return {}
    overlay = load_scenario_i18n(scenario_id, language)
    glossary = overlay.get("glossary") if isinstance(overlay, dict) else None
    if not isinstance(glossary, dict):
        return {}
    return {str(k): str(v) for k, v in glossary.items() if k and v}


def _localize(obj: Any, glossary: dict[str, str]) -> Any:
    if not glossary:
        return obj
    if isinstance(obj, str):
        return glossary.get(obj, obj)
    if isinstance(obj, list):
        return [_localize(v, glossary) for v in obj]
    if isinstance(obj, dict):
        return {k: _localize(v, glossary) for k, v in obj.items()}
    return obj


def localize_payload(obj: T, glossary: dict[str, str]) -> T:
    """Recursively replace exact-match strings in a JSON-able payload via the glossary.

    Only whole-string matches are replaced (no substring rewriting), so an English
    narration that happens to contain a glossary key as a substring is never touched.
    Returns a new structure of the same shape; the input is not mutated. Empty
    glossary → input as-is.
    """
    return cast(T, _localize(obj, glossary))


def localize_for(payload: T, scenario_id: str, language: str) -> T:
    """Convenience: load the scenario+language glossary and localize ``payload``."""
    return localize_payload(payload, load_glossary(scenario_id, language))
