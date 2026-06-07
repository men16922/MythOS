import glob
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
ARTIFACT_DIR = Path(
    "/Users/men1692/.gemini/antigravity-cli/brain/e7f7e7f5-2868-4539-859a-54f3bbe56e43"
)
OUT_COMPARE_DIR = ROOT / "outputs" / "combat-sprite-compare" / "imagen"
OUT_COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"


# Find latest generated idles from artifact folder
def get_latest_file(pattern: str) -> Path | None:
    files = glob.glob(str(ARTIFACT_DIR / pattern))
    if not files:
        return None
    return Path(max(files, key=lambda f: Path(f).stat().st_mtime))


maintenance_idle_src = get_latest_file("maintenance_drone_idle_*.png")
sentinel_idle_src = get_latest_file("sentinel_drone_idle_*.png")

if not maintenance_idle_src or not sentinel_idle_src:
    raise FileNotFoundError(
        f"Idle sheets not found in {ARTIFACT_DIR}. Found: m={maintenance_idle_src}, s={sentinel_idle_src}"
    )

print(f"Found maintenance idle source: {maintenance_idle_src.name}")
print(f"Found sentinel idle source: {sentinel_idle_src.name}")

# Copy raw idles to comparison folder
shutil.copy(maintenance_idle_src, OUT_COMPARE_DIR / "maintenance-drone-idle-source.png")
shutil.copy(sentinel_idle_src, OUT_COMPARE_DIR / "sentinel-drone-idle-source.png")


def remove_chroma_green(img: Image.Image) -> Image.Image:
    """Removes bright green background #00ff00."""
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If green is clearly dominant
        if g > 110 and g > r * 1.32 and g > b * 1.32:
            new_data.append((0, 0, 0, 0))
        elif g > 150 and (g - r) > 35 and (g - b) > 35:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def normalize(img: Image.Image, size=(512, 768), padding=28, bottom=18) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    img = trim_alpha(img.convert("RGBA"))
    img.thumbnail((size[0] - padding * 2, size[1] - padding - bottom), Image.Resampling.LANCZOS)
    x = (size[0] - img.width) // 2
    y = size[1] - img.height - bottom
    canvas.alpha_composite(img, (x, y))
    return canvas


def process_idle(src_path: Path, slug: str):
    img = Image.open(src_path).convert("RGBA")

    # 1. Save transparent alpha idle for comparison review
    alpha_idle = remove_chroma_green(img)
    alpha_idle_path = OUT_COMPARE_DIR / f"{slug}-idle-alpha.png"
    alpha_idle.save(alpha_idle_path)
    print(f"Saved alpha idle: {alpha_idle_path.name}")

    # 2. Normalize and save to final combat folder
    normalized = normalize(alpha_idle)
    final_path = OUT_COMBAT_DIR / f"{slug}-idle.png"
    normalized.save(final_path)
    print(f"  Processed idle -> {final_path.relative_to(ROOT)}")


# Process both drone idles
process_idle(maintenance_idle_src, "maintenance-drone")
process_idle(sentinel_idle_src, "sentinel-drone")

print("\nDrone idle processing complete.")
