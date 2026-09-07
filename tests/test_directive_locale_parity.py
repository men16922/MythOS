"""Every authored directive ships in both languages.

``load_scenario_directives`` deliberately falls back to the Korean original when a
``<stem>.en.md`` twin is missing, so a KO-only directive would silently leak Korean
into EN-default sessions. This locks the pairing: each unsuffixed ``.md`` under
``resources/<scenario>/directives/`` has its ``.en.md`` twin and vice versa.
"""

from __future__ import annotations

import unittest
from pathlib import Path

RESOURCES = Path(__file__).resolve().parents[1] / "resources"


def _directive_dirs() -> list[Path]:
    return sorted(p for p in RESOURCES.glob("*/directives") if p.is_dir())


class DirectiveLocaleParityTest(unittest.TestCase):
    def test_at_least_one_scenario_has_directives(self) -> None:
        self.assertTrue(_directive_dirs(), "no resources/<scenario>/directives/ found")

    def test_every_korean_directive_has_an_english_twin(self) -> None:
        missing: list[str] = []
        for base in _directive_dirs():
            for ko in base.rglob("*.md"):
                if ko.name.endswith(".en.md"):
                    continue
                en = ko.with_name(f"{ko.stem}.en.md")
                if not en.is_file():
                    missing.append(str(ko.relative_to(RESOURCES)))
        self.assertEqual(missing, [], f"directives without an .en.md twin: {missing}")

    def test_every_english_directive_has_a_korean_original(self) -> None:
        orphans: list[str] = []
        for base in _directive_dirs():
            for en in base.rglob("*.en.md"):
                ko = en.with_name(en.name.removesuffix(".en.md") + ".md")
                if not ko.is_file():
                    orphans.append(str(en.relative_to(RESOURCES)))
        self.assertEqual(orphans, [], f".en.md files without a Korean original: {orphans}")
