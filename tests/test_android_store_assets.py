"""Store exports must preserve the required encoding and reject invalid assets without rewriting them."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SPEC = importlib.util.spec_from_file_location(
    "store_assets", Path(__file__).resolve().parents[1] / "scripts/android/store_assets.py"
)
assert SPEC and SPEC.loader
assets = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(assets)


class StoreAssetsTest(unittest.TestCase):
    def test_rgb_icon_is_rejected_without_mutating_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "icon-512.png"
            Image.new("RGB", (512, 512)).save(path)
            before = path.read_bytes()
            with self.assertRaises(SystemExit):
                assets.check([path])
            self.assertEqual(path.read_bytes(), before)

    def test_correct_asset_types_pass_without_reencoding(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "shots").mkdir()
            paths = [root / "icon-512.png", root / "feature-ko.png", root / "shots/01.png"]
            for path, mode, dimensions in zip(
                paths, ("RGBA", "RGB", "RGB"), ((512, 512), (1024, 500), (1920, 1080)), strict=True
            ):
                Image.new(mode, dimensions).save(path)
            before = [p.read_bytes() for p in paths]
            assets.check(paths)
            self.assertEqual([p.read_bytes() for p in paths], before)

    def test_rejects_wrong_dimensions_alpha_and_oversize_icon(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, mode, dimensions in (
                ("icon-512.png", "RGBA", (256, 256)),
                ("feature-en.png", "RGB", (1024, 501)),
                ("feature-en.png", "RGBA", (1024, 500)),
            ):
                path = root / name
                Image.new(mode, dimensions).save(path)
                with (
                    self.subTest(name=name, mode=mode, dimensions=dimensions),
                    self.assertRaises(SystemExit),
                ):
                    assets.check([path])
            path = root / "icon-512.png"
            Image.new("RGBA", (512, 512)).save(path)
            path.write_bytes(path.read_bytes() + bytes(1024 * 1024))
            with self.assertRaises(SystemExit):
                assets.check([path])

    def test_screenshot_geometry_and_encoding_rejected_without_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            shots = Path(tmp) / "shots"
            shots.mkdir()
            for mode, dimensions in (
                ("RGB", (319, 600)),
                ("RGB", (3841, 2000)),
                ("RGB", (1920, 900)),
                ("RGBA", (1920, 1080)),
            ):
                path = shots / "01.png"
                Image.new(mode, dimensions).save(path)
                before = path.read_bytes()
                with self.subTest(mode=mode, dimensions=dimensions), self.assertRaises(SystemExit):
                    assets.check([path])
                self.assertEqual(path.read_bytes(), before)
