from PIL import Image
from pathlib import Path

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
CHAR_DIR = ROOT / "resources" / "neo-seoul" / "characters" / "combat"
ENEMY_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"

targets = [
    (CHAR_DIR, "se-rin-idle.png"),
    (CHAR_DIR, "se-rin-attack.png"),
    (CHAR_DIR, "se-rin-guard.png"),
    (CHAR_DIR, "se-rin-skill.png"),
    (CHAR_DIR, "se-rin-hit.png"),
    
    (CHAR_DIR, "player-noise-idle.png"),
    (CHAR_DIR, "player-noise-attack.png"),
    (CHAR_DIR, "player-noise-guard.png"),
    (CHAR_DIR, "player-noise-skill.png"),
    (CHAR_DIR, "player-noise-hit.png"),
    
    (CHAR_DIR, "kai-idle.png"),
    (CHAR_DIR, "kai-attack.png"),
    (CHAR_DIR, "kai-guard.png"),
    (CHAR_DIR, "kai-skill.png"),
    (CHAR_DIR, "kai-hit.png"),
    
    (ENEMY_DIR, "enforcer-unit-idle.png"),
    (ENEMY_DIR, "enforcer-unit-attack.png"),
    (ENEMY_DIR, "enforcer-unit-guard.png"),
    (ENEMY_DIR, "enforcer-unit-skill.png"),
    (ENEMY_DIR, "enforcer-unit-hit.png"),
    
    (ENEMY_DIR, "glitch-wraith-idle.png"),
    (ENEMY_DIR, "glitch-wraith-attack.png"),
    (ENEMY_DIR, "glitch-wraith-guard.png"),
    (ENEMY_DIR, "glitch-wraith-skill.png"),
    (ENEMY_DIR, "glitch-wraith-hit.png"),
    
    (ENEMY_DIR, "maintenance-drone-idle.png"),
    (ENEMY_DIR, "maintenance-drone-attack.png"),
    (ENEMY_DIR, "maintenance-drone-guard.png"),
    (ENEMY_DIR, "maintenance-drone-skill.png"),
    (ENEMY_DIR, "maintenance-drone-hit.png"),
    
    (ENEMY_DIR, "sentinel-drone-idle.png"),
    (ENEMY_DIR, "sentinel-drone-attack.png"),
    (ENEMY_DIR, "sentinel-drone-guard.png"),
    (ENEMY_DIR, "sentinel-drone-skill.png"),
    (ENEMY_DIR, "sentinel-drone-hit.png"),
]

missing = []
invalid = []

for folder, name in targets:
    path = folder / name
    if not path.exists():
        print(f"❌ {name}: NOT FOUND")
        missing.append(name)
        continue
        
    img = Image.open(path)
    if img.mode != "RGBA":
        print(f"❌ {name}: Invalid Mode ({img.mode}) - Expected RGBA")
        invalid.append(name)
        continue
        
    if img.size != (512, 768):
        print(f"❌ {name}: Invalid Size {img.size} - Expected (512, 768)")
        invalid.append(name)
        continue
        
    print(f"✅ {name}: OK (RGBA, 512x768)")

print("\n--- Summary ---")
print(f"Total checked: {len(targets)}")
print(f"Missing: {len(missing)}")
print(f"Invalid: {len(invalid)}")
