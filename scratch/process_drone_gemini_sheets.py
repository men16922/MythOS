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

OUT_COMPARE_DIR.mkdir(parents=True, exist_ok=True)
OUT_COMBAT_DIR.mkdir(parents=True, exist_ok=True)


# Find latest generated sheets from artifact folder
def get_latest_file(pattern: str) -> Path | None:
    files = glob.glob(str(ARTIFACT_DIR / pattern))
    if not files:
        return None
    return Path(max(files, key=lambda f: Path(f).stat().st_mtime))


maintenance_sheet_src = get_latest_file("maintenance_drone_action_sheet_*.png")
sentinel_sheet_src = get_latest_file("sentinel_drone_action_sheet_*.png")

if not maintenance_sheet_src or not sentinel_sheet_src:
    raise FileNotFoundError(
        f"Action sheets not found in {ARTIFACT_DIR}. Found: m={maintenance_sheet_src}, s={sentinel_sheet_src}"
    )

print(f"Found maintenance sheet source: {maintenance_sheet_src.name}")
print(f"Found sentinel sheet source: {sentinel_sheet_src.name}")

# Copy raw sheets to comparison folder
shutil.copy(maintenance_sheet_src, OUT_COMPARE_DIR / "maintenance-drone-action-sheet-source.png")
shutil.copy(sentinel_sheet_src, OUT_COMPARE_DIR / "sentinel-drone-action-sheet-source.png")

# Grid boundaries to crop and avoid black borders
# Total sheet size is 1024x1024. Center line is at x=512, y=512.
# Border width is around 4-10px. We leave a 10px gutter.
CROP_BOXES = {
    "attack": (10, 10, 502, 502),
    "guard": (522, 10, 1014, 502),
    "skill": (10, 522, 502, 1014),
    "hit": (522, 522, 1014, 1014),
}


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


def process_sheet(sheet_path: Path, slug: str):
    sheet = Image.open(sheet_path).convert("RGBA")

    # 1. Save transparent alpha sheet for comparison review
    alpha_sheet = remove_chroma_green(sheet)
    alpha_sheet_path = OUT_COMPARE_DIR / f"{slug}-action-sheet-alpha.png"
    alpha_sheet.save(alpha_sheet_path)
    print(f"Saved alpha sheet: {alpha_sheet_path.name}")

    # 2. Extract and normalize individual poses
    for pose, box in CROP_BOXES.items():
        cropped = sheet.crop(box)
        alpha_cropped = remove_chroma_green(cropped)
        normalized = normalize(alpha_cropped)

        final_path = OUT_COMBAT_DIR / f"{slug}-{pose}.png"
        normalized.save(final_path)
        print(f"  Processed {pose} -> {final_path.relative_to(ROOT)}")


# Process both drone sheets
process_sheet(maintenance_sheet_src, "maintenance-drone")
process_sheet(sentinel_sheet_src, "sentinel-drone")

print("\nDrone processing complete.")
