"""Language-aware keyword matching over player-facing text.

Korean has no word boundaries, so Korean keywords match as substrings — that is
how the scenario authors its stems (``따라``, ``목소리``, ``숨``). ASCII keywords
must stand alone. The product is EN-default, and an unbounded ASCII match is not
a near-miss but a wrong answer:

- ``ix`` fired inside *Fix* and gave an observation choice the control axis;
- ``own`` inside *downtown* and ``hand`` inside *handle* decided whether the
  player had accepted or refused Se-rin;
- ``han`` inside *channel* / *change* bound Han's portrait as the reference
  image for scenes he is not in.

Three sites learned this separately, so the rule lives here once.

Note what this deliberately does **not** encode: a one-syllable Korean keyword
like ``한`` is ambiguous as a *name* (it matches 한강, 한번) but perfectly good as
a *verb stem* (``숨`` = hide). That judgment belongs to the caller, not here.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

__all__ = ["keyword_hits", "mentions", "name_mentions"]

_HANGUL = re.compile(r"[가-힣]")
# Particles that attach directly to a name. A one-syllable Korean name is only
# a name when one of these follows it: bare `한` also sits inside 한강, 한번 and
# 한 걸음, and Hangul-isolation is too strict because the particle IS Hangul.
_KO_PARTICLES = "이가은는와과의에"


def keyword_hits(text: str, keyword: str) -> list[int]:
    """Offsets just past each occurrence of ``keyword`` that counts as a match.

    End offsets rather than start ones, because callers need to inspect what
    *follows* the name — a possessive, a speech cue.
    """
    needle = keyword.strip().lower()
    if not needle:
        return []
    haystack = text.lower()
    pattern = (
        rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])" if needle.isascii() else re.escape(needle)
    )
    return [match.end() for match in re.finditer(pattern, haystack)]


def mentions(text: str, keywords: Iterable[str]) -> bool:
    """Does any keyword occur in ``text``?"""
    return any(keyword_hits(text, keyword) for keyword in keywords)


def name_mentions(text: str, names: Iterable[str]) -> bool:
    """Is a *person* named in ``text``? Stricter than :func:`mentions`.

    A one-syllable Korean name needs a grammatical particle after it to count,
    or `한` matches 한강 / 한번 / 한 걸음 on nearly every scene. Dropping such
    names instead would be worse — it makes the character undetectable in the
    language they are authored in — so they are particle-bounded, not skipped.
    Longer Korean names and ASCII names follow the usual rules.
    """
    for raw in names:
        name = str(raw).strip()
        if not name:
            continue
        if len(name) == 1 and _HANGUL.match(name):
            if re.search(rf"(?<![가-힣]){re.escape(name)}(?=[{_KO_PARTICLES}])", text):
                return True
            continue
        if keyword_hits(text, name):
            return True
    return False
