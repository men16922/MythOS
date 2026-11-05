"""Release-size guard rejects invalid evidence and uses the worst download range."""

import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "bundle_size", Path(__file__).resolve().parents[1] / "scripts/android/check_bundle_size.py"
)
assert SPEC and SPEC.loader
size = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(size)


class BundleSizeTest(unittest.TestCase):
    def test_uses_largest_download_across_variants(self) -> None:
        self.assertEqual(
            size.maximum_download("SDK,MIN,MAX\n24,210000000,220000000\n36,200000000,230000000"),
            230_000_000,
        )
        size.check_limit(230_000_000)  # Old raw-AAB 200 MiB guard would reject this.

    def test_rejects_missing_or_invalid_measurement(self) -> None:
        for data in ("", "warning only", "MIN,MAX\n0,0", "MIN,MAX\n3,2", "MIN,MAX\n1,NaN"):
            with self.subTest(data=data), self.assertRaises(ValueError):
                size.maximum_download(data)

    def test_rejects_over_limit(self) -> None:
        size.check_limit(size.BASE_LIMIT_BYTES)
        with self.assertRaises(ValueError):
            size.check_limit(size.BASE_LIMIT_BYTES + 1)
