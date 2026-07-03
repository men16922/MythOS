"""Manual save slots — distinct snapshot slots + real restore (load = rewind)."""

from __future__ import annotations

import unittest
from dataclasses import replace

from test_session_combat import _InMemoryStore

from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService


class ManualSaveSlotTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store)
        self.options = RuntimeOptions(fallback=True, scenario_id="neo-seoul")
        self.service.create_player("Tester", player_id="p1", traits={"stats": {"strength": 5}})
        snap = self.service.start_loop("p1", self.options)
        self.loop_id = snap.loop.loop_id

    def test_manual_saves_create_distinct_slots(self) -> None:
        # Live 2026-07-04: "세이브를 하나밖에 못 함" — manual saves shared the per-loop
        # autosave bookmark id and overwrote each other. Each manual save is now its
        # own slot; the autosave bookmark still upserts (no slot spam per turn).
        a = self.service.save_slot(self.loop_id, label="first")
        b = self.service.save_slot(self.loop_id, label="second")
        self.assertNotEqual(a.slot_id, b.slot_id)
        slots = self.service.list_save_slots("p1", limit=20)
        manual = [s for s in slots if s.metadata.get("manual")]
        self.assertEqual({s.label for s in manual}, {"first", "second"})

    def test_load_restores_the_saved_moment(self) -> None:
        saved = self.service.save_slot(self.loop_id, label="checkpoint")
        loop_before = self.store.get_loop(self.loop_id)
        assert loop_before is not None

        # Play "past" the save: mutate state as later turns would.
        mutated = replace(
            loop_before,
            stability=max(0, loop_before.stability - 30),
            tension=min(100, loop_before.tension + 40),
            state={**loop_before.state, "flags": ["something_later"]},
        )
        self.store.save_loop(mutated)

        restored = self.service.load_save_slot("p1", saved.slot_id, self.options)
        self.assertEqual(restored.loop.stability, loop_before.stability)
        self.assertEqual(restored.loop.tension, loop_before.tension)
        self.assertNotIn("something_later", restored.loop.state.get("flags", []))
        # The saved scene is re-staged as the latest scene (no scene deletions).
        latest = self.store.get_latest_scene(self.loop_id)
        assert latest is not None
        self.assertEqual(latest.title, restored.scene.title)

    def test_loading_autosave_bookmark_resumes_live_loop(self) -> None:
        # The per-loop autosave bookmark has no snapshot → load just resumes.
        slots = self.service.list_save_slots("p1", limit=20)
        bookmark = next(s for s in slots if not s.metadata.get("manual"))
        snap = self.service.load_save_slot("p1", bookmark.slot_id, self.options)
        self.assertEqual(snap.loop.loop_id, self.loop_id)


if __name__ == "__main__":
    unittest.main()
