"""Post-process raw sprite PNGs into game-ready WebPs + preview sheets.

    .venv/bin/python scripts/v2_assets/sprites/process.py [key ...] [--preview DIR]

For every raw <key>-<pose>.png in RAW_DIR: verify real alpha (transparent corners), mirror when listed in
specs.FLIP, trim to the alpha bounding box (ignoring faint alpha noise), fit into the sprite's canvas
(512x768, bosses 768x768) bottom-aligned with a small margin and horizontally centred, and save
resources/neo-seoul/v2/sprites/<key>-<pose>.webp (alpha, q85). Raws that fail the alpha check are
reported and skipped. --preview writes one dark-background contact sheet per key for spot-checks.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageStat

sys.path.insert(0, str(Path(__file__).resolve().parent))
from specs import BY_KEY, FLIP, OUT_DIR, SPRITES, out_path, raw_path

BOTTOM = 18
TOP = 16
SIDE = 14
ALPHA_NOISE = 24  # alpha below this does not count toward the bounding box


def corner_alpha(im: Image.Image) -> float:
    a = im.getchannel("A")
    w, h = a.size
    k = max(8, min(w, h) // 40)
    boxes = [(0, 0, k, k), (w - k, 0, w, k), (0, h - k, k, h), (w - k, h - k, w, h)]
    vals = [ImageStat.Stat(a.crop(b)).mean[0] for b in boxes]
    return max(vals)


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    a = im.getchannel("A").point(lambda v: 255 if v >= ALPHA_NOISE else 0)
    # drop isolated specks: a light open (min then max) before the bbox
    a = a.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    return a.getbbox()


def process_one(key: str, pose: str) -> str:
    src = raw_path(key, pose)
    s = BY_KEY[key]
    im = Image.open(src).convert("RGBA")
    ca = corner_alpha(im)
    if ca > 8:
        return f"FAIL {key}-{pose}: not transparent (corner alpha {ca:.0f})"
    if f"{key}-{pose}" in FLIP or key in FLIP:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    # zero faint alpha haze so it does not show as a smudge after scaling
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 6 else v)
    im = Image.merge("RGBA", (r, g, b, a))
    bb = content_bbox(im)
    if not bb:
        return f"FAIL {key}-{pose}: empty"
    crop = im.crop(bb)
    cw, ch = s.canvas
    scale = min((cw - 2 * SIDE) / crop.width, (ch - TOP - BOTTOM) / crop.height)
    nw, nh = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((cw - nw) // 2, ch - BOTTOM - nh))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dst = out_path(key, pose)
    canvas.save(dst, "WEBP", quality=85, method=6, alpha_quality=90)
    edge = "".join(
        tag
        for tag, hit in (
            ("L", bb[0] <= 2),
            ("T", bb[1] <= 2),
            ("R", bb[2] >= im.width - 2),
            ("B", bb[3] >= im.height - 2),
        )
        if hit
    )
    warn = f" EDGE-TOUCH[{edge}]" if edge else ""
    return f"ok   {key}-{pose}: raw {im.size} bbox {bb} -> {nw}x{nh} ({dst.stat().st_size // 1024} KB){warn}"


def preview(key: str, out_dir: Path) -> Path | None:
    s = BY_KEY[key]
    tiles = []
    for pose in s.all_poses:
        p = out_path(key, pose)
        if p.exists():
            tiles.append((pose, Image.open(p).convert("RGBA")))
    if not tiles:
        return None
    cw, ch = s.canvas
    tw, th = cw // 2, ch // 2
    sheet = Image.new("RGB", (tw * len(tiles), th + 18), (16, 18, 26))
    d = ImageDraw.Draw(sheet)
    for i, (pose, im) in enumerate(tiles):
        bg = Image.new("RGBA", (cw, ch), (16, 18, 26, 255))
        bg.alpha_composite(im)
        sheet.paste(bg.convert("RGB").resize((tw, th)), (i * tw, 18))
        d.text((i * tw + 4, 2), f"{key}:{pose}", fill=(200, 220, 230))
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / f"{key}.jpg"
    sheet.save(dst, quality=88)
    return dst


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="*")
    ap.add_argument("--preview", type=Path)
    a = ap.parse_args()
    keys = a.keys or [s.key for s in SPRITES]
    for key in keys:
        for pose in BY_KEY[key].all_poses:
            if raw_path(key, pose).exists():
                print(process_one(key, pose))
        if a.preview:
            p = preview(key, a.preview)
            if p:
                print("preview", p)


if __name__ == "__main__":
    main()
