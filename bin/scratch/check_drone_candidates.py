from PIL import Image
from pathlib import Path

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat-candidates"

drones = ["maintenance-drone", "sentinel-drone"]
poses = ["idle", "attack", "guard", "skill", "hit"]

print("--- Verifying Drone Candidate Assets ---")
for drone in drones:
    for pose in poses:
        name = f"{drone}-candidate-{pose}.png"
        path = CANDIDATE_DIR / name
        if not path.exists():
            print(f"❌ {name}: NOT FOUND")
            continue
        img = Image.open(path)
        if img.mode != "RGBA" or img.size != (512, 768):
            print(f"❌ {name}: Mode={img.mode}, Size={img.size} (Expected RGBA, 512x768)")
        else:
            print(f"✅ {name}: OK (RGBA, 512x768)")
