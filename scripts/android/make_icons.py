"""Generate the Android launcher icons and splash images from the MythOS logo art.

Source: src/mythos_ui/src/assets/mythos-logo-concept.png (glyph on a near-black field). Writes into the
Capacitor project's res/ dirs (mipmap-*/ic_launcher*.png, drawable*/splash.png) and the icon background
color. Re-run after changing the logo: `.venv/bin/python scripts/android/make_icons.py` (needs Pillow).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
LOGO = ROOT / "src/mythos_ui/src/assets/mythos-logo-concept.png"
RES = ROOT / "src/mythos_ui/android/app/src/main/res"

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
# Splash canvas per density (Capacitor's default sizes), portrait; landscape is the transpose.
SPLASH_PORT = {
    "mdpi": (320, 480),
    "hdpi": (480, 800),
    "xhdpi": (720, 1280),
    "xxhdpi": (960, 1600),
    "xxxhdpi": (1280, 1920),
}


def load_glyph() -> tuple[Image.Image, tuple[int, int, int]]:
    logo = Image.open(LOGO).convert("RGB")
    w, h = logo.size
    corners = [logo.getpixel(p) for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    mask = logo.convert("L").point(lambda v: 255 if v > 40 else 0)
    box = mask.getbbox()
    if box is None:
        sys.exit("logo has no visible glyph")
    pad = int(0.03 * max(w, h))  # keep the dots' glow
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))
    return logo.crop(box), bg  # type: ignore[return-value]


def place(
    glyph: Image.Image, bg: tuple[int, int, int], size: tuple[int, int], fill: float
) -> Image.Image:
    """Glyph centered on a `bg` canvas, its longer side `fill` x the canvas's shorter side."""
    canvas = Image.new("RGB", size, bg)
    target = fill * min(size)
    scale = target / max(glyph.size)
    g = glyph.resize(
        (max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))), Image.LANCZOS
    )
    canvas.paste(g, ((size[0] - g.width) // 2, (size[1] - g.height) // 2))
    return canvas


def masked(img: Image.Image, shape: str) -> Image.Image:
    size = img.size[0]
    mask = Image.new("L", (size * 4, size * 4), 0)
    draw = ImageDraw.Draw(mask)
    if shape == "circle":
        draw.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    else:
        draw.rounded_rectangle(
            (0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * 0.18), fill=255
        )
    out = img.convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def main() -> None:
    glyph, bg = load_glyph()
    for name, k in DENSITIES.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        # Adaptive foreground: 108dp canvas, glyph inside the 66dp safe circle (diagonal ≈ 64dp).
        fg = round(108 * k)
        place(glyph, bg, (fg, fg), 0.44).save(d / "ic_launcher_foreground.png", optimize=True)
        # Legacy (API < 26) 48dp icons: rounded square and circle.
        legacy = round(48 * k)
        masked(place(glyph, bg, (legacy, legacy), 0.66), "square").save(
            d / "ic_launcher.png", optimize=True
        )
        masked(place(glyph, bg, (legacy, legacy), 0.60), "circle").save(
            d / "ic_launcher_round.png", optimize=True
        )
    for name, (w, h) in SPLASH_PORT.items():
        for orient, size in (("port", (w, h)), ("land", (h, w))):
            d = RES / f"drawable-{orient}-{name}"
            d.mkdir(parents=True, exist_ok=True)
            place(glyph, bg, size, 0.42).save(d / "splash.png", optimize=True)
    place(glyph, bg, (480, 320), 0.42).save(RES / "drawable/splash.png", optimize=True)
    hex_bg = "#{:02X}{:02X}{:02X}".format(*bg)
    (RES / "values/ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{hex_bg}</color>\n'
        "</resources>\n"
    )
    print(f"icons + splash written under {RES.relative_to(ROOT)} (background {hex_bg})")


if __name__ == "__main__":
    main()
