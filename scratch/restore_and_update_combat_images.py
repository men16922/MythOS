import shutil
from pathlib import Path

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
CHAR_CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "characters" / "combat-candidates"
CHAR_COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "characters" / "combat"
ENEMY_CANDIDATE_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat-candidates"
ENEMY_COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"

# Ensure output directories exist
CHAR_COMBAT_DIR.mkdir(parents=True, exist_ok=True)
ENEMY_COMBAT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Restore Character Combat Images
character_mappings = {
    # Se-rin
    "se-rin-imagen-idle.png": "se-rin-idle.png",
    "se-rin-imagen-attack.png": "se-rin-attack.png",
    "se-rin-imagen-guard.png": "se-rin-guard.png",
    "se-rin-imagen-skill.png": "se-rin-skill.png",
    "se-rin-imagen-hit.png": "se-rin-hit.png",
    # Player Noise
    "player-noise-imagen-base.png": "player-noise-idle.png",
    "player-noise-imagen-attack.png": "player-noise-attack.png",
    "player-noise-imagen-guard.png": "player-noise-guard.png",
    "player-noise-imagen-skill.png": "player-noise-skill.png",
    "player-noise-imagen-hit.png": "player-noise-hit.png",
    # Kai
    "kai-imagen-base.png": "kai-idle.png",
    "kai-imagen-attack.png": "kai-attack.png",
    "kai-imagen-guard.png": "kai-guard.png",
    "kai-imagen-skill.png": "kai-skill.png",
    "kai-imagen-hit.png": "kai-hit.png",
}

for src_name, dst_name in character_mappings.items():
    src_path = CHAR_CANDIDATE_DIR / src_name
    dst_path = CHAR_COMBAT_DIR / dst_name
    if src_path.exists():
        shutil.copy(src_path, dst_path)
        print(f"Restored: {src_path.name} -> {dst_path.name}")
    else:
        print(f"Warning: Source not found for {src_name}")

# 2. Restore Enemy Combat Images (except drones)
enemy_files = [
    # Enforcer Unit
    "enforcer-unit-idle.png",
    "enforcer-unit-attack.png",
    "enforcer-unit-guard.png",
    "enforcer-unit-skill.png",
    "enforcer-unit-hit.png",
    # Glitch Wraith
    "glitch-wraith-idle.png",
    "glitch-wraith-attack.png",
    "glitch-wraith-guard.png",
    "glitch-wraith-skill.png",
    "glitch-wraith-hit.png",
]

for name in enemy_files:
    src_path = ENEMY_CANDIDATE_DIR / name
    dst_path = ENEMY_COMBAT_DIR / name
    if src_path.exists():
        shutil.copy(src_path, dst_path)
        print(f"Restored: {src_path.name} -> {dst_path.name}")
    else:
        print(f"Warning: Source not found for {name}")

print("Restoration complete.")
