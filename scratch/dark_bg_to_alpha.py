#!/usr/bin/env python3
"""Add an alpha cutout to combat sprites that were rendered on a near-black background.

Some enemy combat sprites (Imagen/codex output) shipped as opaque RGB on a black
backdrop, so they render as a black box on the tactical board (which composites
sprites over the grid). The transparent drones used a #00ff00 chroma key; these use a
dark backdrop instead, so we remove the background by **border flood-fill** of
near-black pixels — only black connected to the image edge is erased, preserving the
figure's own interior dark regions. A 1px alpha feather softens the silhouette.

Usage::

    python scratch/dark_bg_to_alpha.py                 # default: the 5 opaque enemies' poses
    python scratch/dark_bg_to_alpha.py path/a.png ...  # explicit files (edited in place)
"""

from __future__ import annotations

import sys
from collections import deque

from PIL import Image, ImageFilter

_POSES = ("idle", "attack", "guard", "skill", "hit")
# Clean subjects on flat black → border flood-fill cuts them perfectly.
# NOTE: administrator-ix is intentionally excluded — it is an *atmospheric* render
# (halo/glow/smoke integral to the art), so flood-fill leaves enclosed dark remnants;
# a clean IX token needs regeneration on a flat chroma key, not a cutout.
_OPAQUE_ENEMIES = ("purge-drone", "shock-trooper", "suppression-mech", "tracker-spider")
_BASE = "resources/neo-seoul/enemies/combat"
_BG_THRESH = 40   # max-channel <= this AND connected to the border ⇒ background
_FEATHER = 1.0    # gaussian radius for edge anti-alias


def cutout(path: str, bg_thresh: int = _BG_THRESH, feather: float = _FEATHER) -> str:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    assert px is not None

    is_bg = bytearray(w * h)  # 1 ⇒ background (border-connected near-black)
    dq: deque[tuple[int, int]] = deque()

    def dark(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        return max(r, g, b) <= bg_thresh

    def seed(x: int, y: int) -> None:
        i = y * w + x
        if not is_bg[i] and dark(x, y):
            is_bg[i] = 1
            dq.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not is_bg[j] and dark(nx, ny):
                    is_bg[j] = 1
                    dq.append((nx, ny))

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    assert ap is not None
    for i, flag in enumerate(is_bg):
        if flag:
            ap[i % w, i // w] = 0
    if feather:
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(path)

    lo, hi = alpha.getextrema()
    kept = sum(1 for f in is_bg if not f)
    pct = 100 * kept / (w * h)
    return f"{path.split('/')[-1]:30} alpha[{lo}..{hi}] figure={pct:4.1f}%"


def main(argv: list[str]) -> int:
    if argv:
        targets = argv
    else:
        targets = [f"{_BASE}/{e}-{p}.png" for e in _OPAQUE_ENEMIES for p in _POSES]
    for t in targets:
        print(cutout(t))
    print(f"\ndone: {len(targets)} sprites cut out (border flood-fill, near-black bg).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
