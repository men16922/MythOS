import unittest

from mythos_core.mapgrid import update_map
from mythos_runtime.encounter_map import (
    ENCOUNTER_MAP_KEY,
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


if __name__ == "__main__":
    unittest.main()
