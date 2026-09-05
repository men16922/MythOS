import unittest

from mythos_core.mapgrid import current_tile, normalize_location, update_map


class MapGridTest(unittest.TestCase):
    def test_first_location_at_origin(self):
        state = update_map({}, "Data Layer 01", 0)
        tile = current_tile(state)
        assert tile is not None
        self.assertEqual((tile["x"], tile["y"]), (0, 0))
        self.assertEqual(state["_map"]["current"], normalize_location("Data Layer 01"))

    def test_new_location_is_adjacent_and_distinct(self):
        state = update_map({}, "A", 0)
        state = update_map(state, "B", 1)
        a = state["_map"]["tiles"][normalize_location("A")]
        b = state["_map"]["tiles"][normalize_location("B")]
        self.assertNotEqual((a["x"], a["y"]), (b["x"], b["y"]))
        chebyshev = max(abs(a["x"] - b["x"]), abs(a["y"] - b["y"]))
        self.assertEqual(chebyshev, 1)
        self.assertEqual(current_tile(state), b)

    def test_revisit_keeps_coord_and_counts_visits(self):
        state = update_map({}, "A", 0)
        coord_first = (state["_map"]["tiles"]["a"]["x"], state["_map"]["tiles"]["a"]["y"])
        state = update_map(state, "B", 1)
        state = update_map(state, "A", 2)
        a = state["_map"]["tiles"]["a"]
        self.assertEqual((a["x"], a["y"]), coord_first)
        self.assertEqual(a["visits"], 2)
        self.assertEqual(state["_map"]["current"], "a")

    def test_all_coords_unique_for_many_locations(self):
        state: dict = {}
        for i in range(25):
            state = update_map(state, f"loc-{i}", i)
        coords = [(t["x"], t["y"]) for t in state["_map"]["tiles"].values()]
        self.assertEqual(len(coords), len(set(coords)))

    def test_deterministic(self):
        names = ["야시장", "정전 구역 경계", "스파이어", "데이터 레이어", "은신처"]
        s1: dict = {}
        s2: dict = {}
        for i, n in enumerate(names):
            s1 = update_map(s1, n, i)
            s2 = update_map(s2, n, i)
        self.assertEqual(s1["_map"]["tiles"], s2["_map"]["tiles"])

    def test_kind_classification(self):
        state = update_map({}, "네온 야시장", 0)
        self.assertEqual(
            state["_map"]["tiles"][normalize_location("네온 야시장")]["kind"], "market"
        )


if __name__ == "__main__":
    unittest.main()


class ClassifyKindBoundaryTest(unittest.TestCase):
    def test_ascii_kind_keywords_are_word_bounded(self) -> None:
        from mythos_core.mapgrid import classify_kind

        self.assertEqual(classify_kind("Planet Cabinet Corridor"), "node")
        self.assertEqual(classify_kind("Ledge over the river"), "node")
        self.assertEqual(classify_kind("Data Layer 01"), "data")
        self.assertEqual(classify_kind("은신처 지하"), "refuge")

