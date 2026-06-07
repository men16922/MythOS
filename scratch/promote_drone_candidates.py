import shutil
from pathlib import Path

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat-candidates"
COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"

drones = ["maintenance-drone", "sentinel-drone"]
poses = ["idle", "attack", "guard", "skill", "hit"]

for drone in drones:
    for pose in poses:
        src_name = f"{drone}-candidate-{pose}.png"
        dst_name = f"{drone}-{pose}.png"

        src_path = CANDIDATE_DIR / src_name
        dst_path = COMBAT_DIR / dst_name

        if src_path.exists():
            shutil.copy(src_path, dst_path)
            print(f"Promoted: {src_name} -> {dst_name}")
        else:
            print(f"Error: Candidate file {src_name} not found!")

print("\nDrone candidates successfully promoted to combat assets.")
