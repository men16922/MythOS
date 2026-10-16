"""Token usage reporting of the GM backends (no network): the OpenAI-compatible and Gemini adapters hand the billed
tokens of the call they just made to ``take_last_usage``; ``build_overview`` turns tokens into an estimated cost
only when a price is configured."""

from __future__ import annotations

import unittest
from datetime import UTC, date, datetime
from types import SimpleNamespace
from typing import Any, ClassVar
from unittest import mock

from mythos_v2.admin import build_overview
from mythos_v2.api import V2Settings, _env_price
from mythos_v2.llm import GeminiTextLLM, OpenAICompatTextLLM, Usage, set_last_usage, take_last_usage

KW: dict[str, Any] = {"max_tokens": 50, "temperature": 0.5, "timeout": 5.0}


class UsageHelpersTest(unittest.TestCase):
    def test_take_clears_and_bad_values_become_zero(self) -> None:
        set_last_usage(12, 5)
        self.assertEqual(take_last_usage(), Usage(12, 5))
        self.assertIsNone(take_last_usage())
        set_last_usage(
            None, True
        )  # a backend that reports nothing / a bool must not poison the counters
        self.assertEqual(take_last_usage(), Usage(0, 0))


class GeminiUsageTest(unittest.TestCase):
    def _client(self, meta: object) -> Any:
        response = SimpleNamespace(text=" hello ", usage_metadata=meta)
        models = SimpleNamespace(generate_content=lambda **_kw: response)
        return SimpleNamespace(models=models)

    def test_prompt_and_output_include_thinking_tokens(self) -> None:
        meta = SimpleNamespace(
            prompt_token_count=100, candidates_token_count=20, thoughts_token_count=7
        )
        llm = GeminiTextLLM(client=self._client(meta))
        self.assertEqual(llm.complete("s", "u", **KW), "hello")
        self.assertEqual(take_last_usage(), Usage(100, 27))

    def test_cap_gets_thinking_headroom(self) -> None:
        seen: dict[str, Any] = {}
        response = SimpleNamespace(text="ok", usage_metadata=None)

        def generate(**kw: Any) -> object:
            seen.update(kw)
            return response

        client = SimpleNamespace(models=SimpleNamespace(generate_content=generate))
        with mock.patch.dict("os.environ", {"GEMINI_THINKING_HEADROOM": "500"}):
            GeminiTextLLM(client=client).complete("s", "u", **KW)
        self.assertEqual(seen["config"]["max_output_tokens"], 50 + 500)
        with mock.patch.dict("os.environ", {"GEMINI_THINKING_HEADROOM": "0"}):
            GeminiTextLLM(client=client).complete("s", "u", **KW)
        self.assertEqual(seen["config"]["max_output_tokens"], 50)

    def test_missing_metadata_is_zero_not_an_error(self) -> None:
        llm = GeminiTextLLM(client=self._client(None))
        self.assertEqual(llm.complete("s", "u", **KW), "hello")
        self.assertEqual(take_last_usage(), Usage(0, 0))


class OpenAICompatUsageTest(unittest.TestCase):
    def test_reads_prompt_and_completion_tokens(self) -> None:
        response = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=" ok "))],
            usage=SimpleNamespace(prompt_tokens=33, completion_tokens=4),
        )
        client = SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **_kw: response))
        )
        llm = OpenAICompatTextLLM(base_url="http://x", model="m")
        with mock.patch("openai.OpenAI", return_value=client):
            self.assertEqual(llm.complete("s", "u", **KW), "ok")
        self.assertEqual(take_last_usage(), Usage(33, 4))


class CostTest(unittest.TestCase):
    NOW = datetime(2026, 10, 11, 12, 0, tzinfo=UTC)
    USAGE: ClassVar[list[tuple[date, str, str, int, int, int]]] = [
        (date(2026, 10, 11), "narrate", "llm", 2, 1_000_000, 500_000)
    ]

    def _day(self, price: tuple[float, float] | None) -> dict[str, Any]:
        data = build_overview(
            [], [], [], self.USAGE, now=self.NOW, days=1, server={}, gm_price=price
        )
        row: dict[str, Any] = data["gm_daily"][-1]
        return row

    def test_no_price_means_tokens_only(self) -> None:
        row = self._day(None)
        self.assertEqual((row["prompt_tokens"], row["output_tokens"]), (1_000_000, 500_000))
        self.assertIsNone(row["est_cost_usd"])

    def test_price_per_million_tokens(self) -> None:
        # 1.0 M prompt × $0.30 + 0.5 M output × $2.50 = $1.55
        self.assertEqual(self._day((0.30, 2.50))["est_cost_usd"], 1.55)

    def test_price_env_needs_both_numbers(self) -> None:
        both = {"MYTHOS_GM_PRICE_IN_PER_M": "0.3", "MYTHOS_GM_PRICE_OUT_PER_M": "2.5"}
        with mock.patch.dict("os.environ", both):
            self.assertEqual(_env_price(), (0.3, 2.5))
            self.assertEqual(V2Settings.from_env().gm_price, (0.3, 2.5))
        only_in = {"MYTHOS_GM_PRICE_IN_PER_M": "0.3", "MYTHOS_GM_PRICE_OUT_PER_M": ""}
        with mock.patch.dict("os.environ", only_in):
            self.assertIsNone(_env_price())
        negative = {"MYTHOS_GM_PRICE_IN_PER_M": "-1", "MYTHOS_GM_PRICE_OUT_PER_M": "2"}
        with mock.patch.dict("os.environ", negative):
            self.assertIsNone(_env_price())


if __name__ == "__main__":
    unittest.main()
