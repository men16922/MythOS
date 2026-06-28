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


@lru_cache(maxsize=16)
def load_phrases(scenario_id: str, language: str) -> tuple[tuple[str, str], ...]:
    """Ordered KO→EN **substring** replacements for composed strings the exact-match
    glossary can't catch (e.g. ``"현재 지점: …"``, ``"긴장도 -5"`` built in serializers/
    session with variable parts). Applied only to strings with no exact match. Safe
    because EN-mode narration is already English, so these Korean fragments appear only
    in the code-composed status/result strings. Order matters (longest/most-specific
    first)."""
    if not language or language == "ko":
        return ()
    overlay = load_scenario_i18n(scenario_id, language)
    phrases = overlay.get("phrases") if isinstance(overlay, dict) else None
    if not isinstance(phrases, dict):
        return ()
    return tuple((str(k), str(v)) for k, v in phrases.items() if k)


def _localize(obj: Any, glossary: dict[str, str], phrases: tuple[tuple[str, str], ...]) -> Any:
    if not glossary and not phrases:
        return obj
    if isinstance(obj, str):
        if obj in glossary:
            return glossary[obj]
        # No exact match — apply curated substring replacements for composed strings.
        text = obj
        for ko, en in phrases:
            if ko in text:
                text = text.replace(ko, en)
        return text
    if isinstance(obj, list):
        return [_localize(v, glossary, phrases) for v in obj]
    if isinstance(obj, dict):
        return {k: _localize(v, glossary, phrases) for k, v in obj.items()}
    return obj


def localize_payload(
    obj: T, glossary: dict[str, str], phrases: tuple[tuple[str, str], ...] = ()
) -> T:
    """Recursively localize a JSON-able payload: exact-match glossary first, then the
    curated substring ``phrases`` for code-composed strings. New structure; input not
    mutated. Empty glossary+phrases → input as-is."""
    return cast(T, _localize(obj, glossary, phrases))


def localize_for(payload: T, scenario_id: str, language: str) -> T:
    """Convenience: load the scenario+language glossary + phrases and localize ``payload``."""
    return localize_payload(
        payload, load_glossary(scenario_id, language), load_phrases(scenario_id, language)
    )
