"""Every still image DLC 2 and DLC 3 need, read from sea_art.json, through the Codex CLI image tool (no GCP billing).

    .venv/bin/python scripts/v2_assets/gen_sea_art.py [--only PREFIX] [--skip PREFIX] [--jobs 4]

Existing files are skipped, so a stopped run resumes where it left off. Rerun build_manifest.py afterwards.
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--skip", default="")
    ap.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    items = json.loads((Path(__file__).resolve().parent / "sea_art.json").read_text())["images"]
    todo = [
        (k, v)
        for k, v in items.items()
        if k.startswith(a.only) and not (a.skip and k.startswith(a.skip)) and not (RES / k).exists()
    ]
    print(f"{len(todo)} images to make", flush=True)

    def one(k: str, v: dict) -> str:
        try:
            return generate(k, v["prompt"], size=v["size"])
        except Exception as exc:  # one failed image never stops the batch; a rerun picks it up
            return f"{k}: FAILED {exc}"

    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for f in as_completed([ex.submit(one, k, v) for k, v in todo]):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
