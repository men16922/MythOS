"""Decision table of the Vertex spend cap (no network)."""

import os
import unittest

os.environ.setdefault("PROJECT_ID", "p")
os.environ["CAP_START"] = "2026-11"

import main


class DecideTest(unittest.TestCase):
    def msg(self, cost: float, month: str = "2026-11") -> dict:
        return {
            "costAmount": cost,
            "budgetAmount": 30000,
            "costIntervalStart": f"{month}-01T07:00:00Z",
        }

    def test_over_budget_disables_once(self) -> None:
        self.assertEqual(main.decide(self.msg(30000), True), "disable")
        self.assertEqual(main.decide(self.msg(45000), False), "none")

    def test_new_month_under_budget_enables(self) -> None:
        self.assertEqual(main.decide(self.msg(1200, "2026-12"), False), "enable")
        self.assertEqual(main.decide(self.msg(1200), True), "none")

    def test_months_before_the_start_are_ignored(self) -> None:
        self.assertEqual(main.decide(self.msg(47752, "2026-10"), True), "none")


if __name__ == "__main__":
    unittest.main()
