"""S1 anchor variantization (variant-routed opening, plan 2026-07-06 §2.1/§3.2).

- 해석: 레이어0 앵커의 `variants` 오버라이드가 라우트 물질화 시점에 노드 콘텐츠를
  스킨(beat/title/image/event/image_sequence; None은 필드 제거; summary는 기본
  퍼스펙티브만 교체)하되 그래프 정체성(mandatory/type/게이트)은 유지.
- 폴백: default/미등록 변주/변주 미보유 config → 기본 빌드와 byte-identical (loop-1 불변).
- 검증기: variant beat id 등록(중복/공백 거부) + 미지 오버라이드 필드 거부.
- 세션 배선: start_loop가 루프의 `_opening_variant`를 라우트 빌더에 전달.
"""

from __future__ import annotations

import copy
import unittest
from typing import Any
from unittest import mock

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_content import validate_route_content
from mythos_runtime.route_map import build_route_map, build_route_seed
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService

VARIANT_OVERRIDE: dict[str, Any] = {
    "beat": "opening_reentry_tae_o",
    "title": "바리케이드의 침묵",
    "image": "opening/opening-tae_o.png",
    "image_pre": None,
    "image_sequence": ["opening/opening-tae_o.png"],
    "event": "reentry_tae_o",
    "summary": "바리케이드 앞에서 홀로 다음 신호를 고른다.",
}


def _config() -> dict[str, Any]:
    return {
        "node_types": {
            "story": {"label": "이야기", "description": "이야기 분기", "glyph": "S"},
            "event": {"label": "사건", "description": "예상 밖 사건", "glyph": "E"},
            "boss": {"label": "보스", "description": "최종 충돌", "glyph": "B", "combat": True},
        },
        "layers": [
            {
                "arc": "act1",
                "title": "opening",
                "anchors": [
                    {
                        "type": "story",
                        "mandatory": True,
                        "beat": "opening_escape",
                        "title": "추락과 첫 신뢰",
                        "image": "scenes/opening_escape.png",
                        "image_pre": "scenes/opening_first.png",
                        "image_sequence": ["scenes/opening_first.png", "scenes/opening_escape.png"],
                        "event": "se_rin_rescue",
                        "default_perspective": "p_trust",
                        "perspectives": [
                            {"id": "p_trust", "when": ["met_se_rin"], "summary": "세린의 손을 잡는다."},
                            {"id": "p_caution", "when": ["safety_first"], "summary": "거리를 둔다."},
                        ],
                        "variants": {"tae_o": copy.deepcopy(VARIANT_OVERRIDE)},
                    }
                ],
            },
            {"arc": "act2", "title": "mid", "pool": ["event"], "width": 2},
            {
                "arc": "act3",
                "title": "final",
                "anchors": [{"type": "boss", "beat": "boss_confrontation", "title": "대면"}],
            },
        ],
    }


def _rm(config: dict[str, Any] | None, seed: str, **kwargs: Any) -> dict[str, Any]:
    out = build_route_map(config, seed, **kwargs)
    assert out is not None
    return out


def _start_node(route_map: dict[str, Any]) -> dict[str, Any]:
    node = route_map["nodes"][route_map["layers"][0][0]]
    assert isinstance(node, dict)
    return node


class AnchorVariantResolutionTest(unittest.TestCase):
    def test_variant_overrides_layer0_anchor_content(self) -> None:
        node = _start_node(_rm(_config(), "seed", opening_variant="tae_o"))
        self.assertEqual(node["beat"], "opening_reentry_tae_o")
        self.assertEqual(node["title"], "바리케이드의 침묵")
        self.assertEqual(node["image"], "opening/opening-tae_o.png")
        self.assertEqual(node["event"], "reentry_tae_o")
        self.assertEqual(node["image_sequence"], ["opening/opening-tae_o.png"])
        self.assertEqual(node["variant"], "tae_o")
        # An explicit null override clears the base field.
        self.assertNotIn("image_pre", node)
        # Graph identity is kept: still the mandatory layer-0 story anchor.
        self.assertTrue(node["mandatory"])
        self.assertTrue(node["anchor"])
        self.assertEqual(node["type"], "story")

    def test_variant_summary_rewrites_only_default_perspective(self) -> None:
        node = _start_node(_rm(_config(), "seed", opening_variant="tae_o"))
        by_id = {p["id"]: p for p in node["perspectives"]}
        self.assertEqual(by_id["p_trust"]["summary"], VARIANT_OVERRIDE["summary"])
        self.assertEqual(by_id["p_caution"]["summary"], "거리를 둔다.")
        # Trust-axis semantics stay shared: selectors are untouched.
        self.assertEqual(by_id["p_trust"]["when"], ["met_se_rin"])

    def test_default_and_unknown_variants_are_byte_identical(self) -> None:
        base = _rm(_config(), "seed")
        self.assertEqual(base, _rm(_config(), "seed", opening_variant="default"))
        # A variant with no authored override falls back to the base skin.
        self.assertEqual(base, _rm(_config(), "seed", opening_variant="kai"))
        self.assertNotIn("variant", _start_node(base))
        # The unused skins never leak onto the materialized node.
        self.assertNotIn("variants", _start_node(base))

    def test_config_without_variants_ignores_the_pick(self) -> None:
        config = _config()
        del config["layers"][0]["anchors"][0]["variants"]
        self.assertEqual(_rm(config, "seed"), _rm(config, "seed", opening_variant="tae_o"))

    def test_dynamic_seed_builder_applies_variant(self) -> None:
        config = {**_config(), "mode": "dynamic"}
        route_map = build_route_seed(config, "seed", opening_variant="tae_o")
        assert route_map is not None
        node = _start_node(route_map)
        self.assertEqual(node["beat"], "opening_reentry_tae_o")
        self.assertEqual(node["variant"], "tae_o")

    def test_neo_seoul_variant_pick_skins_the_opening_anchor(self) -> None:
        """S4 shipped real `variants` data: a variant pick must skin the layer-0
        anchor (beat/title swap) while the default pick keeps the Se-rin canon."""
        config = load_scenario("neo-seoul").route_map
        default_node = _start_node(_rm(config, "seed"))
        self.assertEqual(default_node["beat"], "opening_escape")
        self.assertNotIn("variant", default_node)
        variant_node = _start_node(_rm(config, "seed", opening_variant="tae_o"))
        self.assertEqual(variant_node["beat"], "opening_reentry_tae_o")
        self.assertEqual(variant_node["title"], "바리케이드의 침묵")
        self.assertEqual(variant_node["variant"], "tae_o")
        # Graph identity is preserved — only content fields differ.
        self.assertEqual(default_node.get("crosses"), variant_node.get("crosses"))

    def test_variant_opening_anchor_denies_se_rin_contact_flags(self) -> None:
        """The opening anchor is authored for the Se-rin opening and its effect
        hardcodes `trusted_se_rin`; `effect` is not variant-overridable, so a
        non-default variant would inherit it and spawn Se-rin in the opening
        combat (combat unlock_flags ∩ flags). A variant anchor must NOT carry her
        first-contact flags; the default anchor keeps them."""

        def _anchor_effect_flags(node: dict[str, Any]) -> set[str]:
            flags: set[str] = set()
            if isinstance(node.get("effect"), dict):
                flags.update(str(f) for f in node["effect"].get("flags", []) or [])
            for persp in node.get("perspectives", []) or []:
                if isinstance(persp, dict) and isinstance(persp.get("effect"), dict):
                    flags.update(str(f) for f in persp["effect"].get("flags", []) or [])
            return flags

        config = load_scenario("neo-seoul").route_map
        contact = {"met_se_rin", "trusted_se_rin", "refused_se_rin"}
        # Default opening features Se-rin — her contact flags are intended.
        default_flags = _anchor_effect_flags(_start_node(_rm(config, "seed")))
        self.assertIn("trusted_se_rin", default_flags)
        # Every non-default variant opening must drop them (she re-appears only
        # via her meet-arc, not the inherited opening effect).
        for variant in ("han", "kai", "solo", "su_ah", "tae_o", "lin_yue"):
            with self.subTest(variant=variant):
                variant_flags = _anchor_effect_flags(
                    _start_node(_rm(config, "seed", opening_variant=variant))
                )
                self.assertEqual(variant_flags & contact, set())


class AnchorVariantContentContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.route_map = _config()
        self.variants = self.route_map["layers"][0]["anchors"][0]["variants"]

    def _codes(self) -> list[str]:
        return [issue.code for issue in validate_route_content(self.route_map)]

    def test_well_formed_variants_block_is_valid(self) -> None:
        self.assertEqual(validate_route_content(self.route_map), [])

    def test_variants_must_be_an_object(self) -> None:
        self.route_map["layers"][0]["anchors"][0]["variants"] = ["tae_o"]
        self.assertIn("variants_invalid", self._codes())

    def test_variant_override_must_be_an_object(self) -> None:
        self.variants["kai"] = "opening_reentry_kai"
        self.assertIn("variant_invalid", self._codes())

    def test_variant_beat_shadowing_an_anchor_beat_is_rejected(self) -> None:
        self.variants["tae_o"]["beat"] = "opening_escape"
        self.assertIn("beat_duplicate", self._codes())

    def test_variant_beats_are_unique_across_variants(self) -> None:
        self.variants["kai"] = {"beat": "opening_reentry_tae_o"}
        self.assertIn("beat_duplicate", self._codes())

    def test_variant_beat_must_be_non_empty(self) -> None:
        self.variants["tae_o"]["beat"] = "  "
        self.assertIn("variant_beat_empty", self._codes())

    def test_unknown_override_field_is_rejected(self) -> None:
        self.variants["tae_o"]["perspectives"] = []
        self.assertIn("variant_field_unknown", self._codes())

    def test_override_default_perspective_must_exist(self) -> None:
        self.variants["tae_o"]["default_perspective"] = "p_missing"
        self.assertIn("default_perspective_missing", self._codes())


class SessionWiringTest(unittest.TestCase):
    def test_start_loop_passes_opening_variant_to_route_builders(self) -> None:
        store = _InMemoryStore()
        service = RuntimeSessionService(store)
        _seed_loop(store, "p1", "비접속자 (Ghost)")  # 기존 루프 1개 → 다음은 2회차(변주 대상)
        captured: dict[str, str] = {}

        def _spy(builder: Any) -> Any:
            def wrapped(*args: Any, **kwargs: Any) -> Any:
                captured["opening_variant"] = kwargs.get("opening_variant", "MISSING")
                return builder(*args, **kwargs)

            return wrapped

        with (
            mock.patch(
                "mythos_runtime.session.build_route_seed",
                side_effect=_spy(build_route_seed),
            ),
            mock.patch(
                "mythos_runtime.session.build_route_map",
                side_effect=_spy(build_route_map),
            ),
        ):
            snap = service.start_loop("p1", options=RuntimeOptions(fallback=True))
        picked = snap.loop.state.get("_opening_variant")
        self.assertNotEqual(picked, "default")
        self.assertEqual(captured.get("opening_variant"), picked)


if __name__ == "__main__":
    unittest.main()
