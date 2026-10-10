"""Contact sheet of generated outputs for a quick visual review.

  .venv/bin/python scripts/v2_assets/contact_sheet.py OUT.jpg v2/art/title.webp v2/cards ...
Arguments are files or directories relative to resources/neo-seoul/ (directories expand to their .webp files).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES


def main(argv: list[str]) -> int:
    out, items = Path(argv[0]), argv[1:]
    files: list[Path] = []
    for it in items:
        p = RES / it
        files += sorted(p.glob("*.webp")) if p.is_dir() else [p]
    cell = 300 if len(files) > 8 else 420
    cols = 6 if len(files) > 8 else 3
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 16)), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        im.thumbnail((cell - 6, cell - 6))
        x, y = (i % cols) * cell, (i // cols) * (cell + 16)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        d.text((x + 4, y + cell), f.stem[:40], fill=(220, 220, 220))
    sheet.save(out, quality=82)
    print(out, len(files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
