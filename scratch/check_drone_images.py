from pathlib import Path

from PIL import Image

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"

files = [
    "maintenance-drone-idle.png",
    "maintenance-drone-attack.png",
    "maintenance-drone-skill.png",
    "maintenance-drone-hit.png",
    "sentinel-drone-idle.png",
    "sentinel-drone-attack.png",
    "sentinel-drone-skill.png",
    "sentinel-drone-hit.png",
    "enforcer-unit-idle.png",
    "enforcer-unit-attack.png",
]

for name in files:
    path = COMBAT_DIR / name
    if not path.exists():
        print(f"{name}: NOT FOUND")
        continue
    img = Image.open(path)
    # Check alpha channel statistics
    if img.mode == "RGBA":
        alpha = img.getchannel("A")
        bbox = alpha.getbbox()
        extrema = alpha.getextrema()
    else:
        bbox = None
        extrema = None
    print(f"{name}: mode={img.mode}, size={img.size}, bbox={bbox}, alpha_extrema={extrema}")
