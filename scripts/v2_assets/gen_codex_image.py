"""One-off art through the Codex CLI image tool (no GCP billing), resized and saved as WebP.

Usage:
    .venv/bin/python scripts/v2_assets/gen_codex_image.py OUT_REL "prompt" [--ref PATH ...] [--size 1024x1024]
        [--force]

OUT_REL is relative to resources/neo-seoul (e.g. v2/ui/cache_closed.webp). The image is center-cropped to the
size's aspect ratio. The call is counted in ledger.json and the prompt recorded under OUT_REL.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES, codex_image, ledger_record


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
    from PIL import Image

    out = RES / args.out
    if out.exists() and not args.force:
        print(f"{args.out}: exists")
        return 0
    w, h = (int(v) for v in args.size.split("x"))
    shape = "square" if w == h else "landscape" if w > h else "portrait"
    prompt = (
        f"Generate exactly one image with your image generation tool, {shape}, and do nothing else "
        f"(no files, no code). {args.prompt}"
    )
    png = codex_image(prompt, args.ref)
    if png is None:
        return 1
    im = Image.open(png).convert("RGB")
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    out.parent.mkdir(parents=True, exist_ok=True)
    im.crop((left, top, left + w, top + h)).save(out, "WEBP", quality=86)
    ledger_record(
        args.out, {"model": "codex-image", "prompt": prompt, "refs": [str(r) for r in args.ref]}
    )
    print(f"{args.out}: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
