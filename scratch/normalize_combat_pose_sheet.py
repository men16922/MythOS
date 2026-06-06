from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def _font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def _normalize(img: Image.Image, size: tuple[int, int], padding: int, bottom: int) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    img = _trim_alpha(img.convert("RGBA"))
    img.thumbnail((size[0] - padding * 2, size[1] - padding - bottom), Image.Resampling.LANCZOS)
    x = (size[0] - img.width) // 2
    y = size[1] - img.height - bottom
    canvas.alpha_composite(img, (x, y))
    return canvas


def _preview(paths: list[tuple[str, Path]], out_path: Path) -> None:
    cell_w, cell_h = 220, 340
    header_h = 42
    sheet = Image.new("RGB", (cell_w * len(paths), header_h + cell_h), (6, 10, 14))
    draw = ImageDraw.Draw(sheet)
    font = _font(18)

    for idx, (pose, path) in enumerate(paths):
        x = idx * cell_w
        draw.rectangle((x, 0, x + cell_w, header_h), fill=(12, 20, 26), outline=(28, 52, 58))
        draw.text((x + 12, 12), pose.upper(), fill=(143, 255, 234), font=font)
        draw.rectangle(
            (x, header_h, x + cell_w, header_h + cell_h),
            fill=(3, 7, 10),
            outline=(28, 52, 58),
        )
        img = Image.open(path).convert("RGBA")
        img.thumbnail((cell_w - 16, cell_h - 16), Image.Resampling.LANCZOS)
        bg = Image.new("RGBA", (cell_w - 16, cell_h - 16), (8, 12, 16, 255))
        bg.alpha_composite(img, ((bg.width - img.width) // 2, bg.height - img.height))
        sheet.paste(bg.convert("RGB"), (x + 8, header_h + 8))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def split_sheet(
    sheet_path: Path,
    out_dir: Path,
    *,
    slug: str,
    poses: list[str],
    size: tuple[int, int],
    padding: int,
    bottom: int,
    preview_path: Path | None,
) -> list[tuple[str, Path]]:
    sheet = Image.open(sheet_path).convert("RGBA")
    width, height = sheet.size
    out_dir.mkdir(parents=True, exist_ok=True)

    written: list[tuple[str, Path]] = []
    for idx, pose in enumerate(poses):
        left = round(width * idx / len(poses))
        right = round(width * (idx + 1) / len(poses))
        crop = sheet.crop((left, 0, right, height))
        normalized = _normalize(crop, size, padding, bottom)
        out_path = out_dir / f"{slug}-{pose}.png"
        normalized.save(out_path)
        written.append((pose, out_path))

    if preview_path:
        _preview(written, preview_path)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split an RGBA combat action sheet into normalized per-pose PNG assets."
    )
    parser.add_argument("--sheet", required=True, type=Path, help="RGBA action sheet path.")
    parser.add_argument("--slug", required=True, help="Output filename slug, e.g. se-rin.")
    parser.add_argument("--poses", nargs="+", default=["attack", "guard", "skill", "hit"])
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=768)
    parser.add_argument("--padding", type=int, default=28)
    parser.add_argument("--bottom", type=int, default=18)
    args = parser.parse_args()

    written = split_sheet(
        args.sheet,
        args.out_dir,
        slug=args.slug,
        poses=args.poses,
        size=(args.width, args.height),
        padding=args.padding,
        bottom=args.bottom,
        preview_path=args.preview,
    )
    for pose, path in written:
        print(f"{pose}: {path}")


if __name__ == "__main__":
    main()
