"""이미지 자산 무결성 게이트 (Tier-2: codex/agy 콘텐츠·이미지 레인용).

존재 여부(test_assets.py)와 별개로, 커밋된 이미지가 **유효하고 비어있지 않은지**를 본다.
무인 에이전트가 누락 자산을 1×1/빈 placeholder 로 fabricate 해 게이트를 강제 green 시키는 실패를
결정론으로 차단한다(손상 PNG·과소 치수·과소 용량 검출). 미적 "적합도"는 무인 판단 불가라 사람 검수 영역.
"""
from __future__ import annotations

import unittest
from pathlib import Path

from mythos_runtime.scenario import PROJECT_ROOT

try:
    from PIL import Image

    _PIL = True
except Exception:  # pragma: no cover - pillow 는 선언된 의존성이나 방어적으로 skip
    _PIL = False

# agy 이미지 초안 레인이 쓰는 캐논 디렉터리(실험용 *-candidates/, variants/ 는 제외).
IMAGE_SUBDIRS = [
    "characters",
    "characters/combat",
    "concept",
    "enemies",
    "enemies/combat",
    "opening",
    "scenes",
    "skills",
]
SCENARIOS = ["neo-seoul", "glass-library"]

MIN_DIM = 64           # px — 1×1/썸네일 placeholder 차단
MIN_BYTES = 2048       # B  — 빈/fabricate PNG 차단(실제 아트는 훨씬 큼)
VALID_MODES = {"RGB", "RGBA", "P", "LA", "L"}


@unittest.skipUnless(_PIL, "Pillow 미설치")
class ImageAssetIntegrityTest(unittest.TestCase):
    def test_scenario_images_valid_and_nonblank(self) -> None:
        checked = 0
        for scn in SCENARIOS:
            base = PROJECT_ROOT / "resources" / scn
            if not base.exists():
                continue
            for sub in IMAGE_SUBDIRS:
                d = base / sub
                if not d.exists():
                    continue
                for png in sorted(d.glob("*.png")):
                    checked += 1
                    self._assert_valid(png)
        self.assertGreater(checked, 0, "검사한 이미지가 0 — 경로 규약 변경 의심")

    def _assert_valid(self, png: Path) -> None:
        size = png.stat().st_size
        self.assertGreaterEqual(
            size, MIN_BYTES, f"이미지가 과소(빈/fabricate 의심): {png} ({size}B < {MIN_BYTES})"
        )
        # 1) 손상 검출
        with Image.open(png) as im:
            im.verify()
        # 2) 치수·모드 (verify 후엔 재오픈 필요)
        with Image.open(png) as im:
            w, h = im.size
            self.assertGreaterEqual(
                min(w, h), MIN_DIM, f"이미지 치수 과소(placeholder 의심): {png} {im.size}"
            )
            self.assertIn(im.mode, VALID_MODES, f"예상치 못한 이미지 모드: {png} {im.mode}")


if __name__ == "__main__":
    unittest.main()
