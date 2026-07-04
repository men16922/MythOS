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

    **스킬 아이콘**(`combat.skills[].id` → `skills/<id>.png`)도 강제한다 — 2026-06-20
    기준 neo-seoul 11/11·glass-library 5/5 전 아이콘이 실재해 더는 제외 사유가 없다.
    아이콘은 액션바(`CombatControls`)에서 ID로 직접 로드하므로 누락 = 전투바 타일이
    조용히 빈칸으로 렌더된다(에러 없음). 별도 `test_skill_icons_exist`가 관장한다.
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
        for ending in data.get("endings", []) or []:
            if isinstance(ending, dict):
                add("endings[].image", ending.get("image"))
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

    def test_skill_icons_exist(self) -> None:
        """전 시나리오 `combat.skills[].id` 마다 `skills/<id>.png` 액션바 아이콘이 실재.

        아이콘 경로는 scenario.json 의 명시 필드가 아니라 ID 규약(`skills/<id>.png`)으로
        파생되므로 `_image_refs`(JSON 필드 스캔)가 잡지 못한다 → 별도 강제한다.

        존재뿐 아니라 **실제 PNG 인코딩**(매직바이트)까지 박제한다 — 확장자만 `.png`이고
        내용은 JPEG 인 파일이 과거 섞여 있었다(`signal_step`/`overload_strike`). 브라우저는
        sniffing 으로 렌더하지만 확장자를 신뢰하는 툴링이 깨지므로 포맷=확장자를 강제한다.
        """
        png_magic = b"\x89PNG\r\n\x1a\n"
        total_skills = 0
        missing: list[str] = []
        not_png: list[str] = []
        for scn, data, base in self._scenario_jsons():
            skills = data.get("combat", {}).get("skills", {}) or {}
            skill_ids = list(skills) if isinstance(skills, dict) else [
                s.get("id") for s in skills if isinstance(s, dict)
            ]
            for sid in skill_ids:
                if not sid:
                    continue
                total_skills += 1
                path = base / "skills" / f"{sid}.png"
                if not path.exists():
                    missing.append(f"{scn} [{sid}] skills/{sid}.png")
                elif path.read_bytes()[:8] != png_magic:
                    not_png.append(f"{scn} [{sid}] skills/{sid}.png")
        self.assertEqual(missing, [], f"스킬 액션바 아이콘 누락: {missing}")
        self.assertEqual(not_png, [], f"확장자만 .png 인 비-PNG 아이콘: {not_png}")
        # guard-the-guard: 스킬을 0개 스캔하면 vacuous green.
        self.assertGreater(total_skills, 0, "스캔된 스킬 0 — combat.skills 키 규약 변경 의심")
