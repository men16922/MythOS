import unittest

from mythos_runtime.scenario import PROJECT_ROOT, load_scenario


class ScenarioAssetsTest(unittest.TestCase):
    def test_neo_seoul_assets_exist(self) -> None:
        scenario = load_scenario("neo-seoul")
        resources_dir = PROJECT_ROOT / "resources" / "neo-seoul"
        
        # 1. Check character_map images
        for char_id, path_rel in scenario.character_map.items():
            full_path = resources_dir / path_rel
            self.assertTrue(full_path.exists(), f"Character image not found: {full_path}")
            
        # 2. Check concept_map images
        for concept_id, path_rel in scenario.concept_map.items():
            full_path = resources_dir / path_rel
            self.assertTrue(full_path.exists(), f"Concept image not found: {full_path}")
            
        # 3. Check bestiary images
        bestiary = scenario.combat.get("bestiary", {})
        for enemy_id, enemy_data in bestiary.items():
            image_rel = enemy_data.get("image")
            if image_rel:
                # If path starts with enemies/ it's relative to resources_dir
                full_path = resources_dir / image_rel
                self.assertTrue(full_path.exists(), f"Bestiary base image not found: {full_path} for {enemy_id}")
            
            combat_images = enemy_data.get("combat_images", {})
            for pose, path_rel in combat_images.items():
                full_path = resources_dir / path_rel
                self.assertTrue(full_path.exists(), f"Bestiary combat image '{pose}' not found: {full_path} for {enemy_id}")

        # 4. Check allies images
        allies = scenario.combat.get("allies", {})
        for ally_id, ally_data in allies.items():
            image_rel = ally_data.get("image")
            if image_rel:
                full_path = resources_dir / image_rel
                self.assertTrue(full_path.exists(), f"Ally base image not found: {full_path} for {ally_id}")
            
            combat_images = ally_data.get("combat_images", {})
            for pose, path_rel in combat_images.items():
                full_path = resources_dir / path_rel
                self.assertTrue(full_path.exists(), f"Ally combat image '{pose}' not found: {full_path} for {ally_id}")
