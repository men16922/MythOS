"""Source-level lock for the CSS selectors/ids the browser E2E scripts wait on.

`scratch/run_playwright_test.py` (`make test-e2e`) and
`scratch/run_comprehensive_e2e_test.py` (`make test-e2e-full`) are not part of
`make check` and were red once for months without anyone noticing (see
docs/LESSONS.md 2026-09-06). This locks their selector list against
src/mythos_ui/src/** so a UI rename that drops one of them fails `make check`
instead of only surfacing when someone remembers to run the E2E suites.
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI_SRC = ROOT / "src" / "mythos_ui" / "src"

# Every selector `scratch/run_playwright_test.py` and
# `scratch/run_comprehensive_e2e_test.py` pass to wait_for_selector/locator/click.
E2E_SELECTORS = [
    ".boot-enter-btn",
    "#display-name",
    ".arch-card",
    "#start",
    ".intro-accept-btn",
    "#play",
    ".tab-btn",
    "#codex-tab-content",
    "#story-tab-content",
    ".sl-modal",
    ".sl-save-row",
    ".sl-title",
    ".sl-load-btn",
    ".sl-close",
    "#save-load-panel",
    ".boon-overlay",
    ".boon-card",
    "#resume",
    "#choices",
]


def _all_ui_source() -> str:
    chunks = [
        path.read_text(encoding="utf-8")
        for path in sorted(UI_SRC.rglob("*"))
        if path.is_file() and path.suffix in {".ts", ".tsx", ".css"}
    ]
    return "\n".join(chunks)


class E2ESelectorSourceLockTest(unittest.TestCase):
    def test_every_e2e_selector_exists_in_ui_source(self) -> None:
        source = _all_ui_source()
        missing = [sel for sel in E2E_SELECTORS if sel.lstrip(".#") not in source]
        self.assertEqual(missing, [], f"selectors missing from src/mythos_ui/src/**: {missing}")


if __name__ == "__main__":
    unittest.main()
