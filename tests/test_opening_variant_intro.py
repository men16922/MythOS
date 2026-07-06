import json
import unittest

from mythos_api.app import _localized_scenario_prose
from mythos_runtime.scenario import PROJECT_ROOT, load_scenario
from mythos_runtime.scenario_directives import available_opening_variants

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


class OpeningVariantIntroTest(unittest.TestCase):
    """B2 variant openings own a per-variant session intro (boot cinematic).

    Every authored opening variant must ship a KO intro block with at least one
    cinematic shot whose image really exists (the SPA keys the intro carousel off
    ``ui_copy.session_intro_variants[<variant>]``), plus an EN i18n overlay so EN
    sessions don't fall back to Korean copy.
    """

    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.resources_dir = PROJECT_ROOT / "resources" / "neo-seoul"
        self.variants = available_opening_variants("neo-seoul")

    def test_every_variant_has_ko_intro_with_existing_shot_images(self) -> None:
        self.assertTrue(self.variants, "no opening variants authored — B2 regression?")
        intro_variants = self.scenario.ui_copy.get("session_intro_variants")
        assert isinstance(intro_variants, dict), "ui_copy.session_intro_variants missing"
        for variant in sorted(self.variants):
            entry = intro_variants.get(variant)
            assert isinstance(entry, dict), f"variant '{variant}' has no session intro"
            for field in ("kicker", "title", "body"):
                self.assertTrue(entry.get(field), f"variant '{variant}' intro missing {field}")
            shots = entry.get("cinematic_shots") or []
            self.assertTrue(
                isinstance(shots, list) and shots,
                f"variant '{variant}' intro has no cinematic shots",
            )
            for shot in shots:
                image_rel = shot.get("image")
                self.assertTrue(image_rel, f"variant '{variant}' shot missing image path")
                image_path = self.resources_dir / image_rel
                self.assertTrue(image_path.exists(), f"shot image not found: {image_path}")
                self.assertEqual(
                    image_path.read_bytes()[:8],
                    PNG_MAGIC,
                    f"shot image is not a real PNG: {image_path}",
                )

    def test_every_variant_has_en_overlay(self) -> None:
        i18n_path = self.resources_dir / "i18n" / "en.json"
        overlay = json.loads(i18n_path.read_text(encoding="utf-8"))
        variant_overlay = overlay.get("session_intro_variants")
        self.assertIsInstance(variant_overlay, dict, "en.json session_intro_variants missing")
        for variant in sorted(self.variants):
            entry = variant_overlay.get(variant)
            assert isinstance(entry, dict), f"variant '{variant}' has no EN intro overlay"
            self.assertTrue(entry.get("title"), f"variant '{variant}' EN overlay missing title")
            shots = entry.get("cinematic_shots") or []
            self.assertTrue(
                isinstance(shots, list) and shots,
                f"variant '{variant}' EN overlay has no shot text",
            )
            for shot in shots:
                # EN shots are text-only; an image key here would clobber the
                # language-neutral base image on merge.
                self.assertNotIn("image", shot, f"variant '{variant}' EN shot carries image")

    def test_en_merge_localizes_text_and_keeps_base_image(self) -> None:
        prose = _localized_scenario_prose(self.scenario, "en")
        merged = prose.ui_copy.get("session_intro_variants")
        assert isinstance(merged, dict), "merged session_intro_variants missing"
        ko_variants = self.scenario.ui_copy["session_intro_variants"]
        for variant in sorted(self.variants):
            entry = merged[variant]
            self.assertNotEqual(
                entry.get("title"),
                ko_variants[variant]["title"],
                f"variant '{variant}' EN title not applied by merge",
            )
            for i, shot in enumerate(entry["cinematic_shots"]):
                self.assertEqual(
                    shot.get("image"),
                    ko_variants[variant]["cinematic_shots"][i]["image"],
                    f"variant '{variant}' shot image lost in EN merge",
                )
