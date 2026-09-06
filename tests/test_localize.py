"""Tests for the serving-boundary combat/status glossary localization."""

from __future__ import annotations

import json
import unittest
from typing import Any

from mythos_api.localize import load_glossary, localize_for, localize_payload
from mythos_runtime.echoes import echo_card
from mythos_runtime.scenario import PROJECT_ROOT


class LocalizeTest(unittest.TestCase):
    def test_load_glossary_neo_seoul_en(self) -> None:
        g = load_glossary("neo-seoul", "en")
        self.assertEqual(g.get("신호 도약"), "Signal Step")
        self.assertEqual(g.get("정비 드론"), "Maintenance Drone")

    def test_ko_and_unknown_lang_are_noop(self) -> None:
        self.assertEqual(load_glossary("neo-seoul", "ko"), {})
        self.assertEqual(load_glossary("neo-seoul", ""), {})

    def test_localize_payload_exact_match_only(self) -> None:
        g = {"신호 도약": "Signal Step", "정비 드론": "Maintenance Drone"}
        payload: dict[str, Any] = {
            "skills": [{"id": "signal_step", "name": "신호 도약"}],
            "enemies": [{"name": "정비 드론", "hp": 12}],
            # exact whole-string match only — substring inside prose is untouched
            "narration": "신호 도약 was already English here",
        }
        out = localize_payload(payload, g)
        self.assertEqual(out["skills"][0]["name"], "Signal Step")
        self.assertEqual(out["enemies"][0]["name"], "Maintenance Drone")
        self.assertEqual(out["narration"], "신호 도약 was already English here")  # not replaced
        # input not mutated
        self.assertEqual(payload["skills"][0]["name"], "신호 도약")

    def test_localize_for_ko_is_identity(self) -> None:
        payload = {"name": "신호 도약"}
        self.assertEqual(localize_for(payload, "neo-seoul", "ko"), payload)
        self.assertEqual(localize_for(payload, "neo-seoul", "en")["name"], "Signal Step")

    def test_glossary_substring_in_composed_strings(self) -> None:
        # Composed status strings embed a glossary term inside variable text. The
        # phrases layer handles the prefix; the glossary-substring fallback localizes
        # the embedded route title / value axis (which are exact glossary keys).
        payload = {
            "stakes_summary": ["현재 지점: 추락과 첫 신뢰"],
            "choice_stakes": ["가치축: 사람 돕기"],
        }
        out = localize_for(payload, "neo-seoul", "en")
        self.assertEqual(out["stakes_summary"][0], "Current point: The Fall and First Trust")
        self.assertEqual(out["choice_stakes"][0], "Value axis: Help people")

    def test_route_choice_labels_fully_english(self) -> None:
        # Route junction choices are composed in session.py as
        # "{title}(으)로 향한다 — {meaning} · {badges}"; the title is a glossary term but
        # the wrapper/meaning/badges are Korean. The phrases layer must localize all of it
        # so an EN-mode choice has no residual Hangul.
        payload = {
            "choices": [
                {
                    "label": "흔들리는 선택(으)로 향한다 — 예상 밖의 부탁이나 변수가 생깁니다. · 위험 1"
                },
                {
                    "label": "한강 야시장(으)로 향한다 — 보급과 거래로 장비를 정비합니다. · 위험 1 · 안정 +4"
                },
                {
                    "label": "유출된 로그(으)로 향한다 — 기록과 단서를 찾아 진실에 가까워집니다. · 위험 1 · 통찰 +1"
                },
            ]
        }
        out = localize_for(payload, "neo-seoul", "en")
        labels = [c["label"] for c in out["choices"]]
        self.assertEqual(
            labels[0], "Wavering Choice — An unexpected request or complication appears. · Risk 1"
        )
        self.assertEqual(
            labels[1],
            "Han River Night Market — Refit through supplies and trade. · Risk 1 · Stability +4",
        )
        self.assertEqual(
            labels[2],
            "Leaked Log — Search records and clues to get closer to the truth. · "
            "Risk 1 · Insight +1",
        )
        for label in labels:
            self.assertNotRegex(label, r"[가-힣]")

    def test_substring_fallback_skips_english_strings(self) -> None:
        # A fully-English string (no Hangul) is never touched by the substring pass.
        en = "You take Se-rin's hand for the first time."
        self.assertEqual(localize_for({"t": en}, "neo-seoul", "en")["t"], en)

    def test_new_glossary_entries_present(self) -> None:
        g = load_glossary("neo-seoul", "en")
        # chapter_goal (explore), core_stake premise, cutscene titles
        self.assertIn(
            "Roam the welfare blocks",
            g[
                "복지 블록과 한강 야시장을 돌며 '최적화 명단'의 정체에 관한 단서를 찾고 동료를 만난다."
            ],
        )
        self.assertIn(
            "unregistered signal",
            g[
                "당신은 어떤 명단에도 없는 '비식별 신호'입니다. "
                "관리자 IX는 기준에서 벗어난 당신을 '최적화'(기억 삭제·소거)하려 합니다."
            ],
        )
        self.assertEqual(g["깜빡이는 신뢰"], "Flickering Trust")
        self.assertEqual(g["약속의 잔향"], "Echo of a Promise")

    def test_combat_echo_symbol_localizes(self) -> None:
        # Combat scenes are code-titled "교전 R{n}" (session._commit_combat_turn), and an
        # Echo minted from one takes the title's first word as its symbol — so the bare
        # 2-char "교전" reaches EN echo-inscription cards. It is below the substring
        # min-length by design; only an exact glossary entry can localize it
        # (live 2026-07-12: "교전 Scarred Resolve" in EN INSCRIBE MEMORY).
        # In an EN session the source action is already English; only the code-titled
        # "교전 R{n}" prefix and the derived symbol are Korean.
        card = echo_card("echo_test", symbol="교전", text="교전 R2: retreat", language="en")
        out = localize_for(card, "neo-seoul", "en")
        self.assertEqual(out["symbol"], "Engagement")
        self.assertNotRegex(json.dumps(out, ensure_ascii=False), r"[가-힣]")

    def test_localize_payload_without_gloss_sub_keeps_prose(self) -> None:
        # Calling localize_payload with only a glossary (no gloss_sub) preserves the
        # exact-match-only behavior — a glossary term inside prose stays put.
        g = {"신호 도약": "Signal Step"}
        out = localize_payload({"narration": "신호 도약 inside prose"}, g)
        self.assertEqual(out["narration"], "신호 도약 inside prose")


class RouteAnchorGlossaryCoverageTest(unittest.TestCase):
    """Every route-anchor string served verbatim (anchor/variant titles, variant and
    perspective summaries) must have an EN glossary entry. The base anchors were
    covered when the glossary was authored, but variant *skins* added later were
    not scanned by anything — which leaked Korean into EN scene headers
    (live 2026-07-12: "Scene · 비워진 사각"). This ratchet makes new authored
    route content fail fast instead."""

    def test_route_anchor_titles_and_summaries_have_en_glossary_entries(self) -> None:
        scenario = json.loads(
            (PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json").read_text()
        )
        glossary = load_glossary("neo-seoul", "en")
        missing: list[str] = []

        def check(kind: str, value: Any) -> None:
            if isinstance(value, str) and value and value not in glossary:
                missing.append(f"{kind}: {value}")

        for layer in scenario.get("route_map", {}).get("layers", []):
            for anchor in layer.get("anchors", []):
                check("anchor title", anchor.get("title"))
                for variant_id, variant in (anchor.get("variants") or {}).items():
                    check(f"variant[{variant_id}] title", variant.get("title"))
                    check(f"variant[{variant_id}] summary", variant.get("summary"))
                for perspective in anchor.get("perspectives") or []:
                    check("perspective summary", perspective.get("summary"))

        self.assertEqual(
            missing,
            [],
            "route-anchor strings without an EN glossary entry (leak Korean into "
            f"EN mode): {missing}",
        )

    def test_combat_entity_names_have_en_glossary_entries(self) -> None:
        # Every authored combat object with an id + Korean display name (skills,
        # allies, upgrades, enemy skills, bestiary) serves that name verbatim to
        # EN clients — action bar, upgrade banner, IX telegraphs (live 2026-07-13:
        # "자기 견인" on the EN skill bar).
        import re

        scenario = json.loads(
            (PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json").read_text()
        )
        glossary = load_glossary("neo-seoul", "en")
        hangul = re.compile(r"[가-힣]")
        missing: set[str] = set()

        def walk(obj: Any) -> None:
            if isinstance(obj, dict):
                name = obj.get("name")
                if "id" in obj and isinstance(name, str) and hangul.search(name):
                    if name not in glossary:
                        missing.add(name)
                for value in obj.values():
                    walk(value)
            elif isinstance(obj, list):
                for value in obj:
                    walk(value)

        walk(scenario.get("combat", {}))
        self.assertEqual(
            sorted(missing),
            [],
            "combat entity names without an EN glossary entry (leak Korean into "
            f"EN mode): {sorted(missing)}",
        )

    def test_side_arc_and_attribute_strings_have_en_glossary_entries(self) -> None:
        # Side arcs 7-9 and every archetype attribute were authored after the
        # glossary and nothing scanned them, so a side-quest route node served its
        # Korean title as the EN loop's scene title, `Current point`, and `Location`
        # (live 2026-08-08: "New Vector at 사이드: 러너의 지름길"), and the KO
        # attribute name reached the model's EN prose ("[무음의 발걸음]").
        scenario = json.loads(
            (PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json").read_text()
        )
        glossary = load_glossary("neo-seoul", "en")
        missing: list[str] = []

        for arc in scenario.get("side_arcs", []):
            for field in ("title", "description"):
                value = arc.get(field)
                if isinstance(value, str) and value and value not in glossary:
                    missing.append(f"side_arc {field}: {value}")
        for archetype in scenario.get("archetypes", []):
            for attribute in archetype.get("attributes", []):
                bare = attribute.strip("[]")
                if bare and bare not in glossary:
                    missing.append(f"attribute: {attribute}")

        self.assertEqual(
            missing,
            [],
            "side-arc / attribute strings without an EN glossary entry (leak Korean "
            f"into EN mode): {missing}",
        )

    def test_encounter_location_hints_serve_as_english(self) -> None:
        # A combat scene's `location` is the encounter's authored `location_hint`
        # (it used to be the raw encounter id). That reaches the archived
        # `final_location`, save-slot labels and the image `LOC:` overlay, so a
        # hint without an EN entry leaks Korean — `ix_confrontation` did.
        import re

        scenario = json.loads(
            (PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json").read_text()
        )
        hangul = re.compile(r"[가-힣]")
        leaking: list[str] = []

        encounters = scenario.get("combat", {}).get("encounters", {})
        for encounter_id, meta in encounters.items():
            hint = meta.get("location_hint")
            if not isinstance(hint, str) or not hint.strip():
                continue
            served = localize_for({"location": hint}, "neo-seoul", "en")["location"]
            if hangul.search(served):
                leaking.append(f"{encounter_id}: {hint!r} -> {served!r}")

        self.assertEqual(
            leaking,
            [],
            f"encounter location_hints that serve Korean to EN clients: {leaking}",
        )


class RouteDescriptionLocalizationTest(unittest.TestCase):
    """Route-node *descriptions* are served inside EN choice labels but were never
    scanned — the patrol node shipped its Korean description into two banked EN
    arms ("Surveillance Blind Spot — 감시망을 은밀히 …"). Asserts the served
    outcome rather than glossary membership, because some descriptions are covered
    by ``phrases`` instead."""

    def test_every_route_description_serves_as_english(self) -> None:
        import re

        scenario = json.loads(
            (PROJECT_ROOT / "resources" / "neo-seoul" / "scenario.json").read_text()
        )
        hangul = re.compile(r"[가-힣]")
        seen: set[str] = set()

        def walk(obj: Any) -> None:
            if isinstance(obj, dict):
                description = obj.get("description")
                if isinstance(description, str) and hangul.search(description):
                    seen.add(description)
                for value in obj.values():
                    walk(value)
            elif isinstance(obj, list):
                for value in obj:
                    walk(value)

        walk(scenario.get("route_map", {}))
        leaked = [d for d in sorted(seen) if hangul.search(localize_for(d, "neo-seoul", "en"))]
        self.assertEqual(leaked, [], f"route descriptions that stay Korean in EN mode: {leaked}")


class ShortGlossaryKeyTest(unittest.TestCase):
    """One-syllable names (``한`` → Han) are common Korean syllables, so the plain
    substring pass excludes them — which left the combat log rendering an EN
    template around a KO name ("Optimization Beam hits 한 for 9", live 2026-08-08).
    They are applied only where the token stands alone."""

    def test_standalone_short_name_is_translated(self) -> None:
        payload = {"log": "Administrator IX's Optimization Beam hits 한 for 9."}
        out = localize_for(payload, "neo-seoul", "en")
        self.assertEqual(out["log"], "Administrator IX's Optimization Beam hits Han for 9.")

    def test_short_key_inside_a_longer_korean_word_is_untouched(self) -> None:
        # 한 is a substring of 한국/한번; replacing it there would corrupt the word.
        payload = {"a": "한국", "b": "전투기"}
        out = localize_for(payload, "neo-seoul", "en")
        self.assertEqual(out, {"a": "한국", "b": "전투기"})

    def test_short_keys_are_noop_in_ko_mode(self) -> None:
        payload = {"log": "한이 상황을 살핀다."}
        self.assertEqual(localize_for(payload, "neo-seoul", "ko"), payload)


class EnGoldenFixtureHasNoHangulTest(unittest.TestCase):
    """End-to-end ratchet over every banked EN loop: after the serving-boundary
    localization the whole transcript — titles, locations, narration, choices and
    the combat log — must contain no Hangul. `bank_loop.py` reads the store
    directly, so a banked file is raw KO by design; this asserts the *served*
    form, which is what a player reads."""

    def test_en_golden_transcripts_localize_to_zero_hangul(self) -> None:
        import re

        hangul = re.compile(r"[가-힣]")
        golden = sorted((PROJECT_ROOT / "scripts" / "eval" / "golden").glob("*.json"))
        checked = 0
        for path in golden:
            bank = json.loads(path.read_text())
            if bank.get("language") != "en":
                continue
            checked += 1
            served = localize_for(bank["scenes"], str(bank.get("scenario_id") or "neo-seoul"), "en")
            leaked = sorted(set(hangul.findall(json.dumps(served, ensure_ascii=False))))
            self.assertEqual(leaked, [], f"{path.name}: Hangul survives EN localization: {leaked}")
        self.assertGreater(checked, 0, "no EN golden transcript found to check")


if __name__ == "__main__":
    unittest.main()
