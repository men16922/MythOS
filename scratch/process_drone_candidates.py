import glob
from pathlib import Path

from PIL import Image

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
ARTIFACT_DIR = Path(
    "/Users/men1692/.gemini/antigravity-cli/brain/e7f7e7f5-2868-4539-859a-54f3bbe56e43"
)
OUT_CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat-candidates"

OUT_CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)


# Find latest generated candidates files
def get_latest_file(pattern: str) -> Path | None:
    files = glob.glob(str(ARTIFACT_DIR / pattern))
    if not files:
        return None
    return Path(max(files, key=lambda f: Path(f).stat().st_mtime))


maintenance_sheet = get_latest_file("maintenance_drone_candidates_*.png")
sentinel_sheet = get_latest_file("sentinel_drone_candidates_*.png")
maintenance_idle = get_latest_file("maintenance_drone_idle_candidate_*.png")
sentinel_idle = get_latest_file("sentinel_drone_idle_candidate_*.png")

if not all([maintenance_sheet, sentinel_sheet, maintenance_idle, sentinel_idle]):
    raise FileNotFoundError(f"Candidate assets not found in {ARTIFACT_DIR}.")

print(f"Sheet M: {maintenance_sheet.name}")
print(f"Sheet S: {sentinel_sheet.name}")
print(f"Idle M: {maintenance_idle.name}")
print(f"Idle S: {sentinel_idle.name}")

# Grid boundaries to crop and avoid black borders (same as before)
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


def process_candidate_sheet(sheet_path: Path, slug: str):
    sheet = Image.open(sheet_path).convert("RGBA")
    for pose, box in CROP_BOXES.items():
        cropped = sheet.crop(box)
        alpha_cropped = remove_chroma_green(cropped)
        normalized = normalize(alpha_cropped)

        final_path = OUT_CANDIDATE_DIR / f"{slug}-candidate-{pose}.png"
        normalized.save(final_path)
        print(f"  Processed {pose} -> {final_path.relative_to(ROOT)}")


def process_candidate_idle(idle_path: Path, slug: str):
    img = Image.open(idle_path).convert("RGBA")
    alpha_idle = remove_chroma_green(img)
    normalized = normalize(alpha_idle)
    final_path = OUT_CANDIDATE_DIR / f"{slug}-candidate-idle.png"
    normalized.save(final_path)
    print(f"  Processed idle -> {final_path.relative_to(ROOT)}")


# Process Maintenance Drone Candidates
print("\nProcessing Maintenance Drone Candidates...")
process_candidate_sheet(maintenance_sheet, "maintenance-drone")
process_candidate_idle(maintenance_idle, "maintenance-drone")

# Process Sentinel Drone Candidates
print("\nProcessing Sentinel Drone Candidates...")
process_candidate_sheet(sentinel_sheet, "sentinel-drone")
process_candidate_idle(sentinel_idle, "sentinel-drone")

print("\nDrone candidates processing complete.")
