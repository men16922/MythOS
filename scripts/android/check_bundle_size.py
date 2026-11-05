"""Measure this AAB's compressed base download via bundletool, not its container size.

Uses an existing Android debug key only for temporary measurement APKs; never creates keys
or modifies the release AAB. Play Console remains the final download-size authority.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from pathlib import Path

# https://support.google.com/googleplay/android-developer/answer/9859372 (2026-11-05).
# Decimal MB is conservative relative to MiB; leave final acceptance to Play Console.
BASE_LIMIT_BYTES = 500_000_000


def maximum_download(csv_text: str) -> int:
    rows = list(csv.DictReader(io.StringIO(csv_text.strip())))
    if not rows or not all("MIN" in r and "MAX" in r for r in rows):
        raise ValueError("bundletool did not return MIN/MAX size data")
    sizes = []
    for row in rows:
        low, high = int(row["MIN"]), int(row["MAX"])
        if not 0 < low <= high:
            raise ValueError("bundletool returned an invalid size range")
        sizes.append(high)
    return max(sizes)


def check_limit(size: int) -> None:
    if size > BASE_LIMIT_BYTES:
        raise ValueError(f"Estimated base download {size} bytes exceeds {BASE_LIMIT_BYTES} bytes")


def measure(aab: Path, jar: Path, java: str, debug_key: Path) -> dict[str, str | int]:
    for path in (aab, jar, debug_key):
        if not path.is_file():
            raise ValueError(f"Required file missing: {path}")
    with zipfile.ZipFile(aab) as archive:
        modules = {
            n.split("/")[0]
            for n in archive.namelist()
            if n.endswith("/manifest/AndroidManifest.xml")
        }
    if modules != {"base"}:
        raise ValueError("This checker supports base-only AABs; add per-module checks first")
    with aab.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    command = [java, "-jar", str(jar.resolve())]
    with tempfile.TemporaryDirectory(prefix="mythos-bundle-size-") as tmp:
        apks = str(Path(tmp) / "measurement.apks")
        subprocess.run(
            [
                *command,
                "build-apks",
                f"--bundle={aab.resolve()}",
                f"--output={apks}",
                f"--ks={debug_key.resolve()}",
                "--ks-key-alias=androiddebugkey",
                "--ks-pass=pass:android",
                "--key-pass=pass:android",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            timeout=300,
        )
        result = subprocess.run(
            [*command, "get-size", "total", f"--apks={apks}", "--modules=base"],
            check=True,
            capture_output=True,
            text=True,
            timeout=120,
        )
        size = maximum_download(result.stdout)
    check_limit(size)
    return {
        "aab_sha256": digest,
        "aab_file_bytes": aab.stat().st_size,
        "estimated_max_base_download_bytes": size,
        "base_limit_bytes": BASE_LIMIT_BYTES,
        "status": "local estimate passed; Play Console acceptance unverified",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("aab", type=Path)
    parser.add_argument("--bundletool", required=True, type=Path)
    parser.add_argument("--java", default="java")
    parser.add_argument(
        "--debug-keystore", type=Path, default=Path.home() / ".android/debug.keystore"
    )
    args = parser.parse_args()
    try:
        print(json.dumps(measure(args.aab, args.bundletool, args.java, args.debug_keystore)))
    except (ValueError, OSError, zipfile.BadZipFile, subprocess.SubprocessError) as exc:
        parser.exit(1, f"Download size unverified: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
