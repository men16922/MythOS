from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SCENARIO = ROOT / "resources" / "neo-seoul"
OUT_ROOT = SCENARIO
SIZE = (512, 768)


@dataclass(frozen=True)
class AssetSpec:
    slug: str
    faction: str
    source: Path
    out_dir: Path
    facing: str


SPECS = [
    AssetSpec(
        "player-noise",
        "player",
        SCENARIO / "characters" / "player-noise.png",
        SCENARIO / "characters" / "combat",
        "right",
    ),
    AssetSpec(
        "se-rin",
        "ally",
        SCENARIO / "characters" / "se-rin-biker.png",
        SCENARIO / "characters" / "combat",
        "right",
    ),
    AssetSpec(
        "kai",
        "ally",
        SCENARIO / "characters" / "kai.png",
        SCENARIO / "characters" / "combat",
        "right",
    ),
    AssetSpec(
        "maintenance-drone",
        "enemy",
        SCENARIO / "enemies" / "maintenance-drone.png",
        SCENARIO / "enemies" / "combat",
        "left",
    ),
    AssetSpec(
        "sentinel-drone",
        "enemy",
        SCENARIO / "enemies" / "sentinel-drone.png",
        SCENARIO / "enemies" / "combat",
        "left",
    ),
    AssetSpec(
        "enforcer-unit",
        "enemy",
        SCENARIO / "enemies" / "enforcer-unit.png",
        SCENARIO / "enemies" / "combat",
        "left",
    ),
    AssetSpec(
        "glitch-wraith",
        "enemy",
        SCENARIO / "enemies" / "glitch-wraith.png",
        SCENARIO / "enemies" / "combat",
        "left",
    ),
]


def _accent(faction: str) -> tuple[int, int, int, int]:
    if faction == "enemy":
        return (255, 81, 98, 210)
    if faction == "ally":
        return (125, 255, 155, 210)
    return (143, 255, 234, 210)


def _fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.42))


def _outline(alpha: Image.Image, color: tuple[int, int, int, int], radius: int) -> Image.Image:
    dilated = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    ring = ImageChops.subtract(dilated, alpha)
    out = Image.new("RGBA", alpha.size, color)
    out.putalpha(ring)
    return out


def _base_sprite(spec: AssetSpec) -> Image.Image:
    ref = Image.open(spec.source).convert("RGB")
    crop = _fit_cover(ref, (430, 635)).convert("RGBA")

    mask = Image.new("L", crop.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((10, 0, crop.width - 10, crop.height + 110), radius=128, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    crop.putalpha(mask)

    canvas = Image.new("RGBA", SIZE, (0, 0, 0, 0))

    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((112, 652, 400, 728), fill=(0, 0, 0, 155))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    alpha = crop.getchannel("A")
    composed = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    composed.alpha_composite(_outline(alpha, _accent(spec.faction), 5))
    composed.alpha_composite(crop)

    canvas.alpha_composite(composed, ((SIZE[0] - composed.width) // 2, 76))
    return canvas


def _shear(img: Image.Image, *, direction: int, amount: float) -> Image.Image:
    w, h = img.size
    xshift = abs(amount) * h
    new_w = w + int(round(xshift))
    transformed = img.transform(
        (new_w, h),
        Image.Transform.AFFINE,
        (1, amount * direction, -xshift if amount * direction > 0 else 0, 0, 1, 0),
        Image.Resampling.BICUBIC,
    )
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(transformed, ((w - new_w) // 2, 0))
    return out


def _attack_sprite(spec: AssetSpec, idle: Image.Image) -> Image.Image:
    direction = 1 if spec.facing == "right" else -1
    sprite = _shear(idle, direction=direction, amount=0.08)
    accent = _accent(spec.faction)

    streak = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(streak)
    if spec.facing == "right":
        lines = [((288, 275), (476, 206)), ((294, 340), (490, 316)), ((276, 410), (452, 486))]
    else:
        lines = [((224, 275), (36, 206)), ((218, 340), (22, 316)), ((236, 410), (60, 486))]
    for i, (p1, p2) in enumerate(lines):
        d.line((p1, p2), fill=accent[:3] + (180 - i * 42,), width=8 - i * 2)
    streak = streak.filter(ImageFilter.GaussianBlur(1.8))

    out = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    out.alpha_composite(streak)
    out.alpha_composite(sprite)
    return out


def _skill_sprite(spec: AssetSpec, idle: Image.Image) -> Image.Image:
    accent = _accent(spec.faction)
    out = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    aura = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(aura)

    for i in range(5):
        inset = 58 + i * 24
        alpha = 95 - i * 14
        d.ellipse(
            (inset, 132 + i * 10, SIZE[0] - inset, 684 - i * 8),
            outline=accent[:3] + (alpha,),
            width=3,
        )

    for y in range(120, 700, 54):
        d.line((96, y, 416, y - 26), fill=accent[:3] + (38,), width=2)

    out.alpha_composite(aura.filter(ImageFilter.GaussianBlur(2.2)))
    out.alpha_composite(idle)
    return out


def _hit_sprite(spec: AssetSpec, idle: Image.Image) -> Image.Image:
    out = idle.copy()
    overlay = Image.new("RGBA", SIZE, (255, 70, 90, 0))
    overlay.putalpha(idle.getchannel("A").point(lambda p: int(p * 0.22)))
    out.alpha_composite(overlay)
    return out


def main() -> None:
    for spec in SPECS:
        spec.out_dir.mkdir(parents=True, exist_ok=True)
        idle = _base_sprite(spec)
        outputs = {
            "idle": idle,
            "attack": _attack_sprite(spec, idle),
            "skill": _skill_sprite(spec, idle),
            "hit": _hit_sprite(spec, idle),
        }
        for pose, image in outputs.items():
            path = spec.out_dir / f"{spec.slug}-{pose}.png"
            image.save(path)
            print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
