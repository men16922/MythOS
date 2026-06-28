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

import re
from functools import lru_cache
from typing import Any, TypeVar, cast

from mythos_runtime.scenario import load_scenario_i18n

T = TypeVar("T")

_HANGUL = re.compile(r"[가-힣]")
# Glossary keys shorter than this are not applied as substrings (only exact match),
# so a short, common token can't corrupt a longer surrounding string.
_GLOSS_SUBSTR_MIN_LEN = 3


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
def _glossary_substrings(scenario_id: str, language: str) -> tuple[tuple[str, str], ...]:
    """Glossary entries usable as **substring** replacements (longest key first), for
    composed strings that embed a glossary term inside variable text (e.g. the route
    title in ``"현재 지점: 추락과 첫 신뢰"`` or the value axis in ``"가치축: 시민/관계"``).
    Applied only to strings that still contain Hangul after exact-match + phrases, so
    already-English strings are never touched. Keys below ``_GLOSS_SUBSTR_MIN_LEN`` are
    excluded so a short common token can't mis-replace inside a longer string."""
    gloss = load_glossary(scenario_id, language)
    items = [(k, v) for k, v in gloss.items() if len(k) >= _GLOSS_SUBSTR_MIN_LEN]
    items.sort(key=lambda kv: len(kv[0]), reverse=True)
    return tuple(items)


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


def _localize(
    obj: Any,
    glossary: dict[str, str],
    phrases: tuple[tuple[str, str], ...],
    gloss_sub: tuple[tuple[str, str], ...],
) -> Any:
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
        # Still-Korean leftovers are composed strings embedding a glossary term
        # (e.g. a route title / value axis inside "현재 지점: …" / "가치축: …"). EN-mode
        # narration is already English, so a Hangul remainder here is one of those —
        # localize the embedded glossary terms by substring (longest first).
        if gloss_sub and _HANGUL.search(text):
            for ko, en in gloss_sub:
                if ko in text:
                    text = text.replace(ko, en)
        return text
    if isinstance(obj, list):
        return [_localize(v, glossary, phrases, gloss_sub) for v in obj]
    if isinstance(obj, dict):
        return {k: _localize(v, glossary, phrases, gloss_sub) for k, v in obj.items()}
    return obj


def localize_payload(
    obj: T,
    glossary: dict[str, str],
    phrases: tuple[tuple[str, str], ...] = (),
    gloss_sub: tuple[tuple[str, str], ...] = (),
) -> T:
    """Recursively localize a JSON-able payload: exact-match glossary first, then the
    curated substring ``phrases``, then glossary terms as substrings for any still-Korean
    composed string. New structure; input not mutated. Empty glossary+phrases → input as-is."""
    return cast(T, _localize(obj, glossary, phrases, gloss_sub))


def localize_for(payload: T, scenario_id: str, language: str) -> T:
    """Convenience: load the scenario+language glossary + phrases and localize ``payload``."""
    return localize_payload(
        payload,
        load_glossary(scenario_id, language),
        load_phrases(scenario_id, language),
        _glossary_substrings(scenario_id, language),
    )
