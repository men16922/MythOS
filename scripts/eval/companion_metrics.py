"""Deterministic companion measurements for a --promotion narrative eval run.

RUBRIC.md requires `repetition_compliance` and `length_compliance` alongside the
judge scores but defines no threshold for either, so a promotion run has to state
its rule and apply it uniformly. This module measures the mechanically decidable
part of both axes over the hash-frozen promotion bank, so the pass/fail flags in a
companion-metrics file can be audited against numbers instead of recollection.

`cost_per_loop_usd` is deliberately NOT produced here: the narrative provider does
not log token usage, so per-loop cost cannot be derived from a banked transcript or
from Cloud Logging. It stays an operator-supplied figure.

Usage:
    .venv/bin/python scripts/eval/companion_metrics.py            # promotion bank
    .venv/bin/python scripts/eval/companion_metrics.py --lane development
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from typing import Any

from narrative_judge import load_golden, load_split_paths

# Serving-boundary limits from mythos_narrative.schemas.
MAX_NARRATION_CHARS = 2200
MAX_CHOICES = 4

# Only sentences long enough to be a real narrative beat count as reuse; short
# fragments ("You freeze.") recur legitimately.
MIN_SENTENCE_CHARS = 40

_SENTENCE = re.compile(r"[^.!?]+[.!?]+")


def _sentences(text: str) -> list[str]:
    found = (match.strip() for match in _SENTENCE.findall(text or ""))
    return [sentence for sentence in found if len(sentence) >= MIN_SENTENCE_CHARS]


def measure_length(scenes: list[dict[str, Any]]) -> dict[str, Any]:
    """Narration/choice size against the limits the serving boundary enforces."""
    lengths = [len(scene.get("narration") or "") for scene in scenes] or [0]
    too_many_choices = sum(1 for scene in scenes if len(scene.get("choices") or []) > MAX_CHOICES)
    return {
        "narration_chars_mean": round(sum(lengths) / len(lengths), 1),
        "narration_chars_max": max(lengths),
        "scenes_over_narration_cap": sum(1 for n in lengths if n > MAX_NARRATION_CHARS),
        "scenes_over_choice_cap": too_many_choices,
    }


def measure_repetition(scenes: list[dict[str, Any]]) -> dict[str, Any]:
    """Cross-scene reuse of titles, locations, and whole narration sentences."""
    titles = [scene.get("title") or "" for scene in scenes]
    locations = [scene.get("location") or "" for scene in scenes]

    title_counts = Counter(title for title in titles if title)
    repeated_title_scenes = sum(count for count in title_counts.values() if count > 1)

    streak = sum(1 for a, b in zip(locations, locations[1:]) if a and a == b)

    sentence_counts: Counter[str] = Counter()
    for scene in scenes:
        # Count each sentence once per scene: cross-scene reuse is the signal,
        # and a scene that repeats its own line is a different (rarer) fault.
        for sentence in set(_sentences(scene.get("narration") or "")):
            sentence_counts[sentence] += 1
    reused = [count for count in sentence_counts.values() if count > 1]

    scene_count = max(1, len(scenes))
    return {
        "unique_titles": len(title_counts),
        "scenes_with_repeated_title": repeated_title_scenes,
        "repeated_title_pct": round(100 * repeated_title_scenes / scene_count, 1),
        "consecutive_same_location": streak,
        "location_streak_pct": round(100 * streak / max(1, len(scenes) - 1), 1),
        "sentences_reused_across_scenes": len(reused),
        "worst_sentence_reuse": max(reused, default=0),
    }


def measure(transcript: dict[str, Any]) -> dict[str, Any]:
    scenes = transcript["scenes"]
    return {
        "scenes": len(scenes),
        "length": measure_length(scenes),
        "repetition": measure_repetition(scenes),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lane", default="promotion", choices=("promotion", "development"))
    args = parser.parse_args(argv)

    measured = {}
    for path in load_split_paths(args.lane):
        transcript = load_golden(path)
        measured[transcript["name"]] = measure(transcript)
    print(json.dumps(measured, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
