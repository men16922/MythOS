#!/usr/bin/env python3
"""Chroma-key the green-screen IX poses → clean transparent board sprites.

Reads outputs/ix-greenscreen/administrator-ix-<pose>.png (flat #00ff00 background,
codex-generated), removes the green, despills the green fringe on edges, and writes
512x768 RGBA. By default it writes to a staging dir (outputs/ix-keyed/) for visual
review; pass --adopt to write straight to the resources combat paths.

    python scratch/key_ix_greenscreen.py            # → outputs/ix-keyed/ (review)
    python scratch/key_ix_greenscreen.py --adopt     # → resources/.../combat/ (live)
"""

from __future__ import annotations

import sys

from PIL import Image, ImageFilter

_POSES = ("idle", "attack", "guard", "skill", "hit")
_SRC = "outputs/ix-greenscreen"
_STAGE = "outputs/ix-keyed"
_LIVE = "resources/neo-seoul/enemies/combat"
_SIZE = (512, 768)


def _key(img: Image.Image) -> Image.Image:
    """Zero out green-dominant pixels (bg) + despill green fringe on kept pixels."""
    img = img.convert("RGBA")
    out = []
    for r, g, b, a in img.getdata():
        if (g > 110 and g > r * 1.32 and g > b * 1.32) or (g > 150 and (g - r) > 35 and (g - b) > 35):
            out.append((0, 0, 0, 0))  # background → transparent
        else:
            # despill: green can't exceed the r/b average (kills edge green cast)
            cap = (r + b) // 2
            out.append((r, min(g, cap) if g > cap else g, b, a))
    img.putdata(out)
    return img


def process(adopt: bool) -> int:
    dst_dir = _LIVE if adopt else _STAGE
    for pose in _POSES:
        src = f"{_SRC}/administrator-ix-{pose}.png"
        im = Image.open(src)
        if im.size != _SIZE:
            im = im.resize(_SIZE, Image.LANCZOS)
        keyed = _key(im)
        # 1px alpha feather to soften the cut edge
        alpha = keyed.getchannel("A").filter(ImageFilter.GaussianBlur(1.0))
        keyed.putalpha(alpha)
        dst = f"{dst_dir}/administrator-ix-{pose}.png"
        keyed.save(dst)
        lo, hi = keyed.getchannel("A").getextrema()
        kept = sum(1 for p in keyed.getdata() if p[3] > 8)
        pct = 100 * kept / (_SIZE[0] * _SIZE[1])
        print(f"{pose:6} -> {dst}  alpha[{lo}..{hi}] figure={pct:4.1f}%")
    print(f"\n{'ADOPTED to resources' if adopt else 'staged for review'} ({len(_POSES)} poses).")
    return 0


if __name__ == "__main__":
    raise SystemExit(process("--adopt" in sys.argv[1:]))
