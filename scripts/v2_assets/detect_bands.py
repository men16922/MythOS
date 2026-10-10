"""Flag images with a hard full-width horizontal step (a literal overlay band / letterbox the model drew).

  .venv/bin/python scripts/v2_assets/detect_bands.py v2/events v2/art ...   (paths relative to resources/neo-seoul/)
A natural shadow fades unevenly; an overlay band darkens every column by the same step on the same row.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES


def band_score(path: Path) -> tuple[float, int]:
    a = np.asarray(Image.open(path).convert("L").resize((640, 360))).astype(np.float32)
    h, w = a.shape
    chunks = a.reshape(h, 32, w // 32).mean(axis=2)  # (h, 32) column-chunk luminance per row
    best, best_y = 0.0, -1
    for y in range(h // 3, h - 6):
        above = chunks[y - 4 : y].mean(axis=0)
        below = chunks[y + 1 : y + 5].mean(axis=0)
        ratio = (below + 1) / (above + 1)
        dark = ratio < 0.8  # this row darkens the chunk by >20%
        frac = float(dark.mean())
        consistency = frac * (1 - float(np.std(ratio[dark])) if dark.any() else 0)
        if consistency > best:
            best, best_y = consistency, y
    return best, best_y


def main(argv: list[str]) -> int:
    files: list[Path] = []
    for it in argv:
        p = RES / it
        files += sorted(p.glob("*.webp")) if p.is_dir() else [p]
    for f in files:
        s, y = band_score(f)
        flag = "BAND?" if s > 0.6 else "     "
        print(f"{flag} {s:.2f} row={y / 360:.2f}  {f.relative_to(RES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
