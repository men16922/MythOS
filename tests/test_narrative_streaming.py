import json
import unittest
from datetime import UTC, datetime

from mythos_core import LoopPhase, LoopState, PlayerProfile
from mythos_narrative import NarrativeContext, NarrativeDirector
from mythos_narrative.streaming import NarrationFieldExtractor


class FakeStreamingProvider:
    def __init__(self, chunks: list[str]) -> None:
        self.chunks = chunks

    def generate(self, messages: list[dict[str, str]]) -> str:
        return "".join(self.chunks)

    def stream(self, messages: list[dict[str, str]]):
        yield from self.chunks


class NarrativeStreamingTest(unittest.TestCase):
    def setUp(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        self.context = NarrativeContext(
            player=PlayerProfile(
                player_id="player_stream",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            ),
            loop=LoopState(
                loop_id="loop_stream",
                player_id="player_stream",
                seed="seed",
                phase=LoopPhase.CONNECT,
                location_id="data-layer-01",
                stability=70,
                tension=20,
                started_at=now,
            ),
            turn_index=0,
            recent_events=[],
        )

    def test_narration_extractor_emits_incremental_text(self) -> None:
        extractor = NarrationFieldExtractor()

        chunks = [
            '{"scene":{"title":"T","narration":"첫 문장',
            "\\n둘째 문장",
            '","choices":[]}}',
        ]
        emitted = [text for chunk in chunks for text in extractor.feed(chunk)]

        self.assertEqual("".join(emitted), "첫 문장\n둘째 문장")

    def test_stream_scene_yields_text_before_final(self) -> None:
        raw = json.dumps(
            {
                "scene": {
                    "title": "Streamed",
                    "location": "data-layer-01",
                    "narration": "문장이 먼저 흐른다.",
                    "choices": [{"choice_id": "choice_1", "label": "Enter", "intent": "explore"}],
                    "visual_brief": "A streamed gate.",
                },
                "world_delta": {"stability": 0, "tension": 1, "flags": []},
            },
            ensure_ascii=False,
        )
        provider = FakeStreamingProvider([raw[:50], raw[50:]])

        events = list(NarrativeDirector(provider).stream_first_scene(self.context))

        self.assertEqual(events[0].kind, "text")
        self.assertIn("문장이 먼저", events[0].text)
        self.assertEqual(events[-1].kind, "final")
        self.assertIsNotNone(events[-1].scene)
        assert events[-1].scene is not None
        self.assertEqual(events[-1].scene.title, "Streamed")

    def test_plain_text_story_extractor_strips_headers(self) -> None:
        from mythos_narrative.streaming import PlainTextStoryExtractor

        extractor = PlainTextStoryExtractor()
        chunks = [
            "[SCENE]\n",
            "첫 번째 문장. ",
            "두 번째 문장.\n\n",
            "[TITLE]\n",
            "부서진 성좌의 서막\n",
            "[LOCATION]\n",
            "data-layer-01\n",
            "[CHOICES]\n",
            "- choice_1: 손을 뻗는다."
        ]
        emitted = []
        for chunk in chunks:
            text = extractor.feed(chunk)
            if text:
                emitted.append(text)
        remainder = extractor.flush()
        if remainder:
            emitted.append(remainder)

        # Only the text between [SCENE] and [TITLE] should be yielded, excluding markup headers
        self.assertEqual("".join(emitted).strip(), "첫 번째 문장. 두 번째 문장.")


if __name__ == "__main__":
    unittest.main()
