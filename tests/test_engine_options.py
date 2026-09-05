"""Per-engine sampler translation.

The bug this replaces was invisible: the runtime posted six sampler options in
an envelope Ollama's OpenAI-compatible endpoint discards, and nothing anywhere
said so — not an error, not a warning, not a different output. These tests pin
the measured facts (experiments/results/*-option-passthrough, *-option-matrix)
so the same silence cannot come back.
"""

from __future__ import annotations

import unittest

from mythos_narrative.engine_options import (
    KNOWN_ENGINES,
    LLAMACPP,
    MLX,
    OLLAMA,
    VLLM,
    SamplerSpec,
    dropped_for,
    render,
)

FULL = SamplerSpec(
    temperature=0.4, max_output_tokens=2048, top_p=0.85, top_k=30, repetition_penalty=1.3
)


class NoEngineGetsTheDiscardedEnvelopeTest(unittest.TestCase):
    """The whole defect in one assertion, for every engine."""

    def test_nothing_is_ever_nested_under_extra_body_options(self) -> None:
        for engine in (*KNOWN_ENGINES, "some-future-engine"):
            with self.subTest(engine=engine):
                extra = render(FULL, engine).get("extra_body", {})
                self.assertNotIn(
                    "options",
                    extra,
                    "extra_body['options'] is the shape Ollama's compat layer silently drops",
                )

    def test_the_output_cap_always_travels_as_max_tokens(self) -> None:
        """Measured: the only delivery form that caps output on the compat endpoint."""
        for engine in (*KNOWN_ENGINES, "some-future-engine"):
            with self.subTest(engine=engine):
                rendered = render(FULL, engine)
                self.assertEqual(rendered["max_tokens"], 2048)
                self.assertNotIn("num_predict", rendered)
                self.assertNotIn("num_predict", rendered.get("extra_body", {}))


class OllamaTest(unittest.TestCase):
    def test_repetition_becomes_a_penalty_that_actually_arrives(self) -> None:
        """repeat_penalty never reached the model; frequency_penalty was measured to."""
        rendered = render(FULL, OLLAMA)
        self.assertNotIn("repeat_penalty", rendered)
        self.assertNotIn("extra_body", rendered)
        self.assertAlmostEqual(rendered["frequency_penalty"], 0.6)

    def test_penalty_off_stays_off(self) -> None:
        spec = SamplerSpec(temperature=0.4, max_output_tokens=64, repetition_penalty=1.0)
        self.assertNotIn("frequency_penalty", render(spec, OLLAMA))

    def test_the_penalty_stays_inside_the_openai_range(self) -> None:
        spec = SamplerSpec(temperature=0.4, max_output_tokens=64, repetition_penalty=5.0)
        self.assertLessEqual(render(spec, OLLAMA)["frequency_penalty"], 2.0)

    def test_top_k_is_reported_as_dropped_rather_than_posted_into_the_void(self) -> None:
        self.assertIn("top_k", dropped_for(FULL, OLLAMA))
        self.assertNotIn("top_k", render(FULL, OLLAMA))

    def test_repetition_is_not_reported_dropped_when_it_is_translated(self) -> None:
        self.assertNotIn("repetition_penalty", dropped_for(FULL, OLLAMA))


class OtherEnginesTest(unittest.TestCase):
    def test_vllm_carries_the_knobs_ollama_cannot(self) -> None:
        extra = render(FULL, VLLM)["extra_body"]
        self.assertEqual(extra["top_k"], 30)
        self.assertEqual(extra["repetition_penalty"], 1.3)
        self.assertEqual(dropped_for(FULL, VLLM), [])

    def test_llamacpp_matches_vllm_shape(self) -> None:
        self.assertEqual(render(FULL, LLAMACPP), render(FULL, VLLM))

    def test_mlx_stays_minimal_and_says_what_it_lost(self) -> None:
        rendered = render(FULL, MLX)
        self.assertNotIn("extra_body", rendered)
        self.assertEqual(sorted(dropped_for(FULL, MLX)), ["repetition_penalty", "top_k"])

    def test_an_unknown_engine_gets_only_the_universally_accepted_fields(self) -> None:
        rendered = render(FULL, "who-knows")
        self.assertEqual(set(rendered), {"temperature", "max_tokens", "top_p"})


class JsonModeTest(unittest.TestCase):
    def test_json_object_is_requested_top_level_where_it_is_honoured(self) -> None:
        spec = SamplerSpec(temperature=0.1, max_output_tokens=1536, json_object=True)
        for engine in KNOWN_ENGINES:
            with self.subTest(engine=engine):
                self.assertEqual(render(spec, engine)["response_format"], {"type": "json_object"})

    def test_json_is_not_requested_when_not_asked_for(self) -> None:
        self.assertNotIn("response_format", render(FULL, OLLAMA))


class DirectorWiringTest(unittest.TestCase):
    def test_the_provider_no_longer_hand_builds_the_discarded_envelope(self) -> None:
        from pathlib import Path

        source = Path("src/mythos_narrative/director.py").read_text(encoding="utf-8")
        self.assertNotIn('"options": {', source)
        self.assertNotIn('"num_predict"', source)
        self.assertNotIn('"repeat_penalty"', source)
        # All five call sites route through the adapter.
        self.assertEqual(source.count("**_sampler("), 5)


if __name__ == "__main__":
    unittest.main()
