from __future__ import annotations

import logging
import re
from typing import Any

from mythos_core import LoopState
from mythos_runtime.progression import determine_autonomy_level
from mythos_runtime.scenario import ScenarioConfig

logger = logging.getLogger("mythos.ending_resolver")


class EndingResolver:
    @staticmethod
    def calculate_scores(loop: LoopState, clue_count: int) -> dict[str, int]:
        """
        Calculate Humanity, Insight, Resilience, and Dominance scores
        based on active flags and clue counts.
        """
        flags = loop.state.get("flags", [])

        # Helper to compute metric score, handling numeric suffixes (e.g. humanity_5)
        def _score_for_metric(metric_name: str) -> int:
            score = 0
            metric_lower = metric_name.lower()
            for flag in flags:
                if metric_lower in flag.lower():
                    # Check for pattern like metric_5, metric_plus_3, metric+2
                    match = re.search(
                        r"\b" + re.escape(metric_lower) + r"\w*[_\-+]+(\d+)\b", flag.lower()
                    )
                    if not match:
                        match = re.search(re.escape(metric_lower) + r"\w*(\d+)", flag.lower())

                    if match:
                        try:
                            score += int(match.group(1))
                        except ValueError:
                            score += 1
                    else:
                        score += 1
            return score

        humanity = _score_for_metric("humanity")
        insight = _score_for_metric("insight") + clue_count
        resilience = _score_for_metric("resilience")
        dominance = _score_for_metric("dominance")

        return {
            "Humanity": humanity,
            "Insight": insight,
            "Resilience": resilience,
            "Dominance": dominance,
        }

    @classmethod
    def resolve_ending(
        cls,
        loop: LoopState,
        scenario: ScenarioConfig,
        clue_count: int,
    ) -> tuple[str | None, str]:
        """
        Evaluate scenario endings against loop metrics and flags.
        Returns:
            tuple[ending_id, ending_label]
            If no ending condition is met, returns (None, "Archived Loop").
        """
        endings = scenario.endings
        if not endings:
            return None, "Archived Loop"

        scores = cls.calculate_scores(loop, clue_count)

        # Calculate autonomy level from config
        autonomy_level = 1
        if hasattr(scenario, "autonomy_config") and scenario.autonomy_config:
            autonomy_level = determine_autonomy_level(scenario.autonomy_config, clue_count)

        # Context namespace for condition evaluation
        eval_namespace: dict[str, Any] = {
            "Humanity": scores["Humanity"],
            "Insight": scores["Insight"],
            "Resilience": scores["Resilience"],
            "Dominance": scores["Dominance"],
            "Stability": loop.stability,
            "Tension": loop.tension,
            "Autonomy": autonomy_level,
            "flags": set(loop.state.get("flags", [])),
            "__builtins__": {},  # Strict sandboxing
        }

        logger.debug(
            f"Resolving ending for loop={loop.loop_id}. "
            f"Metrics: {scores}, stability={loop.stability}, tension={loop.tension}, autonomy={autonomy_level}"
        )

        for ending in endings:
            ending_id = ending.get("id")
            title = ending.get("title") or "Unnamed Ending"
            condition = ending.get("condition")
            if not condition:
                continue

            processed_cond = cls._preprocess_condition(condition)
            try:
                # Evaluate expression safely using restricting globals
                result = eval(processed_cond, eval_namespace)
                if bool(result):
                    logger.info(f"Ending condition matched: ending_id={ending_id} ('{title}')")
                    return ending_id, title
            except Exception as e:
                logger.error(
                    f"Failed to evaluate ending condition for ending_id={ending_id}: "
                    f"condition='{condition}', processed='{processed_cond}'. Error: {e}"
                )

        return None, "Archived Loop"

    @staticmethod
    def _preprocess_condition(cond: str) -> str:
        """
        Convert condition syntax (like &&, ||, and contains) to python equivalents.
        """
        # Replace logical operators
        cond = re.sub(r"\b&&\b", " and ", cond)
        cond = cond.replace("&&", " and ")

        cond = re.sub(r"\b\|\|\b", " or ", cond)
        cond = cond.replace("||", " or ")

        # Convert "flags contains flag_name" to "'flag_name' in flags"
        cond = re.sub(r'\bflags\s+contains\s+["\']([^"\']+)["\']', r'"\1" in flags', cond)
        cond = re.sub(r"\bflags\s+contains\s+(\w+)", r'"\1" in flags', cond)

        return cond
