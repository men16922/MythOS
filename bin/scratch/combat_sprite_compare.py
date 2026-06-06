from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "outputs" / "combat-sprite-compare"


@dataclass(frozen=True)
class Subject:
    slug: str
    label: str
    faction: str
    reference: Path
    prompt: str
    seed: int


SUBJECTS = [
    Subject(
        slug="se-rin",
        label="Jung Se-rin",
        faction="ally",
        reference=ROOT / "resources" / "neo-seoul" / "characters" / "se-rin-biker.png",
        seed=6101,
        prompt=(
            "Jung Se-rin, Korean cyberpunk resistance guide, wet black hair, black tactical "
            "biker coat, alert tactical combat stance, full body head to boots visible, facing right, "
            "compact signal carbine, dramatic side-view tactical RPG sprite, Darkest Dungeon inspired "
            "silhouette, Y2K cyber-mythic neon cyan and magenta rim light, crisp readable body shape, "
            "isolated character on a perfectly flat solid #00ff00 chroma key background, no floor, no "
            "shadow, no gradient, no scenery, no UI, no text, no border"
        ),
    ),
    Subject(
        slug="enforcer-unit",
        label="ARK Enforcer",
        faction="enemy",
        reference=ROOT / "resources" / "neo-seoul" / "enemies" / "enforcer-unit.png",
        seed=6102,
        prompt=(
            "ARK armored enforcer unit, heavy black riot armor, red visor, baton and shield, "
            "aggressive tactical combat stance, full body head to boots visible, facing left, dramatic "
            "side-view tactical RPG sprite, Darkest Dungeon inspired silhouette, Y2K cyber-mythic "
            "neon cyan rim light and red threat glow, crisp readable body shape, isolated enemy "
            "character on a perfectly flat solid #00ff00 chroma key background, no floor, no shadow, "
            "no gradient, no scenery, no UI, no text, no border"
        ),
    ),
]


def _font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.42))


def _fit_contain(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.copy()
    img.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(img.convert("RGBA"), ((size[0] - img.width) // 2, size[1] - img.height))
    return canvas


def _outline(alpha: Image.Image, color: tuple[int, int, int, int], radius: int) -> Image.Image:
    dilated = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    ring = ImageChops.subtract(dilated, alpha)
    out = Image.new("RGBA", alpha.size, color)
    out.putalpha(ring)
    return out


def codex_baseline(subject: Subject, out_path: Path) -> Path:
    """Deterministic repo-native baseline: portrait-derived combat token."""
    ref = Image.open(subject.reference).convert("RGB")
    size = (512, 768)
    crop = _fit_cover(ref, (440, 610)).convert("RGBA")

    mask = Image.new("L", crop.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((12, 0, crop.width - 12, crop.height + 90), radius=130, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    crop.putalpha(mask)

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((116, 640, 396, 724), fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)

    alpha = crop.getchannel("A")
    accent = (41, 255, 198, 190) if subject.faction == "ally" else (255, 81, 98, 190)
    sprite = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    sprite.alpha_composite(_outline(alpha, accent, 5))
    sprite.alpha_composite(crop)

    x = (size[0] - sprite.width) // 2
    y = 82
    canvas.alpha_composite(sprite, (x, y))

    # Add a small faction underglow so the baseline reads clearly on the board.
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((136, 626, 376, 704), fill=accent[:3] + (54,))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)
    return out_path


def generate_flux(
    subject: Subject, out_path: Path, *, quantize: int, steps: int, redux_strength: float
) -> Path:
    from mythos_image_agent.mflux_generator import generate_image_mflux_redux

    return generate_image_mflux_redux(
        subject.prompt,
        out_path,
        reference_path=subject.reference,
        redux_strength=redux_strength,
        seed=subject.seed,
        steps=steps,
        width=512,
        height=768,
        quantize=quantize,
        guidance=0.0,
    )


def _estimate_subject_mask(img: Image.Image) -> Image.Image:
    """Simple border-background matte for isolated dark-background generations."""
    rgb = img.convert("RGB").resize((256, 384), Image.Resampling.LANCZOS)
    px = rgb.load()
    samples = []
    for x in range(rgb.width):
        samples.append(px[x, 0])
        samples.append(px[x, rgb.height - 1])
    for y in range(rgb.height):
        samples.append(px[0, y])
        samples.append(px[rgb.width - 1, y])
    bg = tuple(sorted(channel)[len(channel) // 2] for channel in zip(*samples))
    green_screen = bg[1] > 120 and bg[1] > bg[0] * 1.25 and bg[1] > bg[2] * 1.25

    diff = Image.new("L", rgb.size, 0)
    dp = diff.load()
    rp = rgb.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = rp[x, y]
            if green_screen:
                green_bias = g - max(r, b)
                v = 0 if green_bias > 28 else 255
            else:
                d = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
                # Keep brighter character/rim light, suppress uniform background.
                v = max(0, min(255, int((d - 20) * 4)))
            dp[x, y] = v
    diff = diff.filter(ImageFilter.GaussianBlur(1.4))
    diff = ImageOps.autocontrast(diff, cutoff=2)
    diff = diff.filter(ImageFilter.MaxFilter(5))
    diff = diff.filter(ImageFilter.GaussianBlur(1.2))
    return diff.resize(img.size, Image.Resampling.LANCZOS)


def hybrid_normalize(subject: Subject, flux_path: Path, out_path: Path) -> Path:
    img = Image.open(flux_path).convert("RGBA")
    mask = _estimate_subject_mask(img)
    img.putalpha(mask)

    bbox = mask.getbbox()
    if bbox:
        img = img.crop(bbox)
    sprite = _fit_contain(img, (430, 690))

    size = (512, 768)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((116, 650, 396, 726), fill=(0, 0, 0, 150))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    alpha = sprite.getchannel("A")
    accent = (41, 255, 198, 185) if subject.faction == "ally" else (255, 81, 98, 185)
    composed = Image.new("RGBA", sprite.size, (0, 0, 0, 0))
    composed.alpha_composite(_outline(alpha, accent, 4))
    composed.alpha_composite(sprite)
    canvas.alpha_composite(composed, ((size[0] - sprite.width) // 2, size[1] - sprite.height - 44))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)
    return out_path


def contact_sheet(subjects: list[Subject], out_path: Path) -> Path:
    cols = [
        ("Reference", "reference"),
        ("Codex baseline", "codex"),
        ("FLUX Redux", "flux"),
        ("Hybrid normalized", "hybrid"),
    ]
    cell_w, cell_h = 300, 470
    header_h = 58
    label_h = 36
    sheet = Image.new(
        "RGB", (cell_w * len(cols), header_h + (cell_h + label_h) * len(subjects)), (8, 12, 16)
    )
    d = ImageDraw.Draw(sheet)
    title_font = _font(22)
    label_font = _font(15)
    small_font = _font(12)

    for i, (title, _) in enumerate(cols):
        x = i * cell_w
        d.rectangle((x, 0, x + cell_w, header_h), fill=(12, 20, 26), outline=(28, 52, 58))
        d.text((x + 14, 18), title, font=label_font, fill=(143, 255, 234))

    for row, subject in enumerate(subjects):
        y0 = header_h + row * (cell_h + label_h)
        paths = {
            "reference": subject.reference,
            "codex": OUT_DIR / f"{subject.slug}-codex.png",
            "flux": OUT_DIR / f"{subject.slug}-flux-redux.png",
            "hybrid": OUT_DIR / f"{subject.slug}-hybrid.png",
        }
        for col, (_, key) in enumerate(cols):
            x0 = col * cell_w
            d.rectangle((x0, y0, x0 + cell_w, y0 + cell_h), fill=(3, 7, 10), outline=(28, 52, 58))
            img = Image.open(paths[key]).convert("RGBA")
            if key == "reference":
                img = _fit_cover(img.convert("RGB"), (cell_w - 28, cell_h - 28)).convert("RGBA")
            else:
                img = _fit_contain(img, (cell_w - 28, cell_h - 28))
            checker = Image.new("RGBA", img.size, (10, 16, 20, 255))
            cd = ImageDraw.Draw(checker)
            for yy in range(0, img.height, 24):
                for xx in range(0, img.width, 24):
                    if (xx // 24 + yy // 24) % 2:
                        cd.rectangle((xx, yy, xx + 23, yy + 23), fill=(15, 24, 29, 255))
            checker.alpha_composite(img)
            sheet.paste(checker.convert("RGB"), (x0 + 14, y0 + 14))
        ly = y0 + cell_h
        d.rectangle((0, ly, sheet.width, ly + label_h), fill=(10, 15, 19))
        d.text((14, ly + 8), subject.label, font=title_font, fill=(230, 238, 232))
        d.text(
            (cell_w + 14, ly + 12),
            "Deterministic, immediate, weaker pose change",
            font=small_font,
            fill=(155, 171, 170),
        )
        d.text(
            (cell_w * 2 + 14, ly + 12),
            "Generated combat pose, variable matte",
            font=small_font,
            fill=(155, 171, 170),
        )
        d.text(
            (cell_w * 3 + 14, ly + 12),
            "Board-ready scale/outline/shadow",
            font=small_font,
            fill=(155, 171, 170),
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-flux",
        action="store_true",
        help="Only build deterministic outputs from existing files.",
    )
    parser.add_argument("--quantize", type=int, default=8)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--redux-strength", type=float, default=0.9)
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for subject in SUBJECTS:
        codex_baseline(subject, OUT_DIR / f"{subject.slug}-codex.png")
        flux_path = OUT_DIR / f"{subject.slug}-flux-redux.png"
        if not args.skip_flux or not flux_path.exists():
            generate_flux(
                subject,
                flux_path,
                quantize=args.quantize,
                steps=args.steps,
                redux_strength=args.redux_strength,
            )
        hybrid_normalize(subject, flux_path, OUT_DIR / f"{subject.slug}-hybrid.png")
    sheet = contact_sheet(SUBJECTS, OUT_DIR / "combat-sprite-contact-sheet.png")
    print(sheet)


if __name__ == "__main__":
    main()
