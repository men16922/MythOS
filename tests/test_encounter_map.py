import unittest

from mythos_core.mapgrid import update_map
from mythos_runtime.encounter_map import (
    ENCOUNTER_MAP_KEY,
    mark_encounter_alerted,
    mark_encounter_resolved,
    tick_encounter_map,
)
from mythos_runtime.scenario import load_scenario


class EncounterMapTest(unittest.TestCase):
    def setUp(self) -> None:
        self.pool = load_scenario("neo-seoul").combat
        self.state = update_map({}, "Data Layer 01", 0)

    def test_requested_encounter_spawns_near_current_tile(self) -> None:
        state, triggered = tick_encounter_map(
            self.state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
            requested=["patrol_ambush"],
        )

        self.assertIsNone(triggered)
        contacts = state[ENCOUNTER_MAP_KEY]["contacts"]
        self.assertEqual(len(contacts), 1)
        contact = next(iter(contacts.values()))
        self.assertEqual(contact["encounter_id"], "patrol_ambush")
        self.assertEqual(contact["state"], "roaming")
        self.assertGreaterEqual(len(contact["enemies"]), 1)

    def test_contact_can_move_into_player_tile_and_trigger(self) -> None:
        state = {
            **self.state,
            ENCOUNTER_MAP_KEY: {
                "contacts": {
                    "c1": {
                        "id": "c1",
                        "encounter_id": "patrol_ambush",
                        "name": "순찰 매복",
                        "x": 1,
                        "y": 0,
                        "state": "roaming",
                        "risk": 1,
                        "glyph": "●",
                        "last_turn": 0,
                    }
                }
            },
        }

        state, triggered = tick_encounter_map(
            state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
        )

        self.assertEqual(triggered, "patrol_ambush")
        self.assertEqual(state[ENCOUNTER_MAP_KEY]["contacts"]["c1"]["state"], "engaged")

    def test_no_ambient_contact_spawn_by_default(self) -> None:
        state, triggered = tick_encounter_map(
            self.state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
        )

        self.assertIsNone(triggered)
        self.assertEqual(state[ENCOUNTER_MAP_KEY]["contacts"], {})

    def test_ambient_contact_spawn_when_allowed(self) -> None:
        state, triggered = tick_encounter_map(
            self.state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
            allow_ambient=True,
        )

        self.assertIsNone(triggered)
        contacts = state[ENCOUNTER_MAP_KEY]["contacts"]
        self.assertEqual(len(contacts), 1)

    def test_resolved_encounter_marks_matching_contacts_defeated(self) -> None:
        state, _ = tick_encounter_map(
            self.state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
            requested=["patrol_ambush"],
        )

        state = mark_encounter_resolved(state, "patrol_ambush")
        contact = next(iter(state[ENCOUNTER_MAP_KEY]["contacts"].values()))
        self.assertEqual(contact["state"], "defeated")

    def test_alerted_encounter_keeps_contact_roaming_after_flee(self) -> None:
        state, _ = tick_encounter_map(
            self.state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
            requested=["patrol_ambush"],
        )

        state = mark_encounter_alerted(state, "patrol_ambush")
        contact = next(iter(state[ENCOUNTER_MAP_KEY]["contacts"].values()))
        self.assertEqual(contact["state"], "alerted")
        self.assertEqual(contact["cooldown"], 1)

    def test_alerted_contact_skips_next_collision_and_remains_on_map(self) -> None:
        state = {
            **self.state,
            ENCOUNTER_MAP_KEY: {
                "contacts": {
                    "c1": {
                        "id": "c1",
                        "encounter_id": "patrol_ambush",
                        "name": "순찰 매복",
                        "x": 0,
                        "y": 0,
                        "state": "alerted",
                        "risk": 1,
                        "glyph": "●",
                        "last_turn": 0,
                        "cooldown": 1,
                    }
                }
            },
        }

        state, triggered = tick_encounter_map(
            state,
            combat_pool=self.pool,
            seed="seed",
            turn_index=1,
        )

        contact = state[ENCOUNTER_MAP_KEY]["contacts"]["c1"]
        self.assertIsNone(triggered)
        self.assertEqual(contact["state"], "alerted")
        self.assertEqual(contact["cooldown"], 0)
        self.assertNotEqual((contact["x"], contact["y"]), (0, 0))


if __name__ == "__main__":
    unittest.main()
