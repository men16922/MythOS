import unittest
from datetime import UTC, datetime

from mythos_core.models import Scene
from mythos_runtime.session_memory import (
    BEATS_KEY,
    RECENT_NARRATION_KEY,
    build_session_synopsis,
    record_beat,
)


def _scene(turn: int, title: str, narration: str = "narr") -> Scene:
    return Scene(
        scene_id=f"scene_{turn}",
        loop_id="loop_1",
        turn_index=turn,
        title=title,
        location="data-layer-01",
        narration=narration,
        choices=[],
        visual_brief=None,
        created_at=datetime.now(UTC),
    )


class SessionMemoryTest(unittest.TestCase):
    def test_record_beat_appends_and_keeps_recent_narration(self) -> None:
        state: dict = {}
        state = record_beat(state, scene=_scene(0, "A", "first"), player_action=None)
        state = record_beat(state, scene=_scene(1, "B", "second"), player_action="go")
        beats = state[BEATS_KEY]
        self.assertEqual([b["t"] for b in beats], [0, 1])
        self.assertEqual(beats[1]["action"], "go")
        recent = state[RECENT_NARRATION_KEY]
        self.assertEqual([r["text"] for r in recent], ["first", "second"])

    def test_record_beat_is_idempotent_per_turn(self) -> None:
        state: dict = {}
        state = record_beat(state, scene=_scene(0, "A"), player_action=None)
        state = record_beat(state, scene=_scene(0, "A2"), player_action=None)
        self.assertEqual(len(state[BEATS_KEY]), 1)
        self.assertEqual(state[BEATS_KEY][0]["title"], "A2")

    def test_recent_narration_window_capped(self) -> None:
        state: dict = {}
        for t in range(5):
            state = record_beat(state, scene=_scene(t, f"S{t}", f"n{t}"))
        self.assertEqual([r["text"] for r in state[RECENT_NARRATION_KEY]], ["n3", "n4"])

    def test_synopsis_empty_without_memory(self) -> None:
        self.assertEqual(build_session_synopsis({}), [])

    def test_synopsis_collapses_consecutive_same_node(self) -> None:
        # Two anchor nodes, each lingering several turns -> spine has 2 entries.
        beats = []
        for t in range(6):
            node = "추락과 첫 신뢰" if t < 3 else "한강 야시장"
            lens = "내민 손" if t < 3 else "정당한 거래"
            beats.append(
                {"t": t, "title": f"S{t}", "node": node, "anchor": True, "lens": lens, "gist": "g"}
            )
        state = {BEATS_KEY: beats}
        notes = build_session_synopsis(state)
        spine_line = next(n for n in notes if n.startswith("주요 전환점"))
        self.assertEqual(spine_line.count("→"), 1)
        self.assertIn("추락과 첫 신뢰", spine_line)
        self.assertIn("한강 야시장", spine_line)

    def test_synopsis_includes_recent_prose(self) -> None:
        state: dict = {}
        state = record_beat(state, scene=_scene(0, "A", "방금 일어난 장면"))
        notes = build_session_synopsis(state)
        self.assertTrue(any("방금 일어난 장면" in n for n in notes))

    def test_synopsis_warns_when_location_unchanged(self) -> None:
        # Same location across recent beats -> emit the "skip re-describing setting" note.
        beats = [{"t": t, "title": f"S{t}", "location": "data-layer-01"} for t in range(3)]
        notes = build_session_synopsis({BEATS_KEY: beats})
        self.assertTrue(any("장소가 직전 장면과 같다" in n for n in notes))

    def test_synopsis_no_location_warning_when_moving(self) -> None:
        beats = [{"t": t, "title": f"S{t}", "location": f"zone-{t}"} for t in range(3)]
        notes = build_session_synopsis({BEATS_KEY: beats})
        self.assertFalse(any("장소가 직전 장면과 같다" in n for n in notes))


if __name__ == "__main__":
    unittest.main()
