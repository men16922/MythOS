from pathlib import Path

from PIL import Image

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "characters" / "combat-candidates"
OUT_DIR = ROOT / "resources" / "neo-seoul" / "characters" / "combat"

targets = [
    ("se-rin-imagen-idle.png", "se-rin-idle.png"),
    ("player-noise-imagen-base.png", "player-noise-idle.png"),
    ("kai-imagen-base.png", "kai-idle.png"),
]


def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def normalize(img: Image.Image, size=(512, 768), padding=28, bottom=18) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    img = trim_alpha(img.convert("RGBA"))
    # Resize keeping aspect ratio
    img.thumbnail((size[0] - padding * 2, size[1] - padding - bottom), Image.Resampling.LANCZOS)
    x = (size[0] - img.width) // 2
    y = size[1] - img.height - bottom
    canvas.alpha_composite(img, (x, y))
    return canvas


for src_name, dst_name in targets:
    src_path = CANDIDATE_DIR / src_name
    dst_path = OUT_DIR / dst_name
    if src_path.exists():
        img = Image.open(src_path)
        normalized = normalize(img)
        normalized.save(dst_path)
        print(f"Normalized and saved: {src_path.name} -> {dst_path.name} ({normalized.size})")
    else:
        print(f"Error: Source {src_name} not found!")

print("Idle normalization complete.")
