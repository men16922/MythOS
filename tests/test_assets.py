import glob
import json
import unittest
from pathlib import Path

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


class ScenarioImageReferenceIntegrityTest(unittest.TestCase):
    """전 시나리오 scene/character/anchor 이미지 참조가 실재하는지(dangling 0) 박제.

    `ScenarioAssetsTest`(character_map/concept_map/bestiary/allies)가 커버하지 않는
    참조 부류를 보강한다: `characters[].image`, route anchor `image`/`image_pre`/
    `image_sequence`, `ui_copy.session_intro.cinematic_shots[].image`. 이 경로들은
    프론트가 이미지 URL로 직접 로드(StoryPanel `image_sequence`/route 앵커 그림)하므로
    scenario.json 의 오타 경로 = **화면에서 조용히 깨지는 그림**(에러 없음). glob 으로
    전 시나리오를 자동 커버한다.

    **스킬 아이콘은 의도적으로 제외**한다 — `combat.skills` 10종 중 5종 아이콘이 아직
    `[auto:agy]` 초안 대기(emp_pulse/nanoshield_projector/glitch_blink/signal_overdrive/
    memory_resonance)라 별도 `[blocked] 스킬/아이콘 무결성 invariant`(NEXT_PLAN)가 관장한다.
    여기서 강제하면 그 blocked 항목과 중복되며 false-RED 가 된다.
    """

    def _scenario_jsons(self) -> list[tuple[str, dict, Path]]:
        out: list[tuple[str, dict, Path]] = []
        for p in sorted(glob.glob(str(PROJECT_ROOT / "resources" / "*" / "scenario.json"))):
            path = Path(p)
            with open(path, encoding="utf-8") as f:
                out.append((path.parent.name, json.load(f), path.parent))
        return out

    def _image_refs(self, data: dict) -> list[tuple[str, str]]:
        """(kind, relative_path) — 스킬 아이콘 제외(상단 docstring 참조)."""
        refs: list[tuple[str, str]] = []

        def add(kind: str, rel: object) -> None:
            if isinstance(rel, str) and rel:
                refs.append((kind, rel))

        for char in data.get("characters", []) or []:
            if isinstance(char, dict):
                add("characters[].image", char.get("image"))
        for layer in data.get("route_map", {}).get("layers", []) or []:
            for anchor in layer.get("anchors", []) or []:
                if isinstance(anchor, dict):
                    add("anchor.image", anchor.get("image"))
                    add("anchor.image_pre", anchor.get("image_pre"))
                    for seq in anchor.get("image_sequence", []) or []:
                        add("anchor.image_sequence", seq)
        session_intro = data.get("ui_copy", {}).get("session_intro", {})
        for shot in session_intro.get("cinematic_shots", []) or []:
            if isinstance(shot, dict):
                add("cinematic_shots[].image", shot.get("image"))
            elif isinstance(shot, str):
                add("cinematic_shots[]", shot)
        return refs

    def test_scene_character_anchor_images_exist(self) -> None:
        total_refs = 0
        dangling: list[str] = []
        for scn, data, base in self._scenario_jsons():
            for kind, rel in self._image_refs(data):
                total_refs += 1
                if not (base / rel).exists():
                    dangling.append(f"{scn} [{kind}] {rel}")
        self.assertEqual(dangling, [], f"dangling 이미지 참조 발견: {dangling}")
        # guard-the-guard: 추출 로직이 전부 빈손이면 vacuous green — 최소 1개는 스캔돼야 한다.
        self.assertGreater(total_refs, 0, "스캔된 이미지 참조 0 — scenario 키 규약 변경 의심")
