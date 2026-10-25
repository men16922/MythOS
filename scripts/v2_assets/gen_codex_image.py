"""One-off art through the Codex CLI image tool (no GCP billing), resized and saved as WebP (or PNG).

Usage:
    .venv/bin/python scripts/v2_assets/gen_codex_image.py OUT_REL "prompt" [--ref PATH ...] [--size 1024x1024]
        [--force]

OUT_REL is relative to resources/neo-seoul (e.g. v2/ui/cache_closed.webp). The image is center-cropped to the
size's aspect ratio. An OUT_REL ending in .png is saved as PNG (companion portraits under characters/), anything
else as WebP. The call is counted in ledger.json and the prompt recorded under OUT_REL.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES, codex_image, ledger_record


def generate(
    out_rel: str,
    prompt: str,
    refs: Sequence[Path] = (),
    size: str = "1024x1024",
    force: bool = False,
) -> str:
    """Generate one image into resources/neo-seoul/<out_rel>. Returns a one-line status."""
    from PIL import Image

    out = RES / out_rel
    if out.exists() and not force:
        return f"{out_rel}: exists"
    w, h = (int(v) for v in size.split("x"))
    shape = "square" if w == h else "landscape" if w > h else "portrait"
    full = (
        f"Generate exactly one image with your image generation tool, {shape}, and do nothing else "
        f"(no files, no code). {prompt}"
    )
    png = codex_image(full, refs)
    if png is None:
        return f"{out_rel}: FAILED"
    im = Image.open(png).convert("RGB")
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    out.parent.mkdir(parents=True, exist_ok=True)
    im = im.crop((left, top, left + w, top + h))
    if out.suffix.lower() == ".png":
        im.save(out, "PNG", optimize=True)
    else:
        im.save(out, "WEBP", quality=86)
    ledger_record(out_rel, {"model": "codex-image", "prompt": full, "refs": [str(r) for r in refs]})
    return f"{out_rel}: ok"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("out")
    ap.add_argument("prompt")
    ap.add_argument("--ref", action="append", default=[], type=Path)
    ap.add_argument("--size", default="1024x1024")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    line = generate(args.out, args.prompt, args.ref, args.size, args.force)
    print(line)
    return 1 if line.endswith("FAILED") else 0


if __name__ == "__main__":
    raise SystemExit(main())
