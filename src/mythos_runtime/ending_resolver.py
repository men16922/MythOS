import ast
import logging
import re
from typing import Any

from mythos_core import LoopState
from mythos_runtime.progression import determine_autonomy_level
from mythos_runtime.scenario import ScenarioConfig

logger = logging.getLogger("mythos.ending_resolver")


class ASTConditionEvaluator:
    """
    Safely evaluate simple boolean and comparison conditions from AST.
    Prevents arbitrary code execution by only allowing whitelisted AST node types.
    """

    def __init__(self, namespace: dict[str, Any]) -> None:
        self.namespace = namespace

    def evaluate(self, expression: str) -> bool:
        try:
            tree = ast.parse(expression, mode="eval")
            return bool(self._eval_node(tree.body))
        except Exception as e:
            raise ValueError(f"AST evaluation error: {e}") from e

    def _eval_node(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return self._eval_node(node.body)
        elif isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Name):
            if node.id in self.namespace:
                return self.namespace[node.id]
            raise NameError(f"Name '{node.id}' is not defined in allowed namespace")
        elif isinstance(node, ast.Compare):
            left = self._eval_node(node.left)
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator)
                if not self._eval_compare(left, op, right):
                    return False
                left = right
            return True
        elif isinstance(node, ast.BoolOp):
            values = [self._eval_node(val) for val in node.values]
            if isinstance(node.op, ast.And):
                return all(values)
            elif isinstance(node.op, ast.Or):
                return any(values)
            raise NotImplementedError(f"Boolean operator {type(node.op)} is not supported")
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            if isinstance(node.op, ast.Not):
                return not operand
            elif isinstance(node.op, ast.USub):
                return -operand
            elif isinstance(node.op, ast.UAdd):
                return +operand
            raise NotImplementedError(f"Unary operator {type(node.op)} is not supported")
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            elif isinstance(node.op, ast.Sub):
                return left - right
            elif isinstance(node.op, ast.Mult):
                return left * right
            elif isinstance(node.op, ast.Div):
                return left / right
            raise NotImplementedError(f"Binary operator {type(node.op)} is not supported")
        else:
            raise TypeError(f"AST node type {type(node)} is not allowed or supported")

    def _eval_compare(self, left: Any, op: ast.cmpop, right: Any) -> bool:
        if isinstance(op, ast.Gt):
            return bool(left > right)
        elif isinstance(op, ast.GtE):
            return bool(left >= right)
        elif isinstance(op, ast.Lt):
            return bool(left < right)
        elif isinstance(op, ast.LtE):
            return bool(left <= right)
        elif isinstance(op, ast.Eq):
            return bool(left == right)
        elif isinstance(op, ast.NotEq):
            return bool(left != right)
        elif isinstance(op, ast.In):
            return bool(left in right)
        elif isinstance(op, ast.NotIn):
            return bool(left not in right)
        raise NotImplementedError(f"Comparison operator {type(op)} is not supported")


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
                # Evaluate expression safely using ASTConditionEvaluator
                result = ASTConditionEvaluator(eval_namespace).evaluate(processed_cond)
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
