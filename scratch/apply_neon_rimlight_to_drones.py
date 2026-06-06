from PIL import Image, ImageEnhance, ImageFilter, ImageChops
from pathlib import Path

ROOT = Path("/Users/men1692/Desktop/local/MythOS")
COMBAT_DIR = ROOT / "resources" / "neo-seoul" / "enemies" / "combat"

drones = ["maintenance-drone", "sentinel-drone"]
poses = ["idle", "attack", "guard", "skill", "hit"]

# Enemy Neon Accent Color: rgba(255, 81, 98, 210)
ACCENT_COLOR = (255, 81, 98, 220)
RIM_RADIUS = 3  # Outer rim thickness
BLUR_RADIUS = 1.5  # Glow softness

def apply_effects(img_path: Path):
    img = Image.open(img_path).convert("RGBA")
    
    # 1. Enhance Contrast to darken shadows and pop highlights
    enhancer = ImageEnhance.Contrast(img)
    img_contrast = enhancer.enhance(1.28)  # Boost contrast by 28%
    
    # 2. Extract Alpha Channel to build the rimlight glow
    alpha = img_contrast.getchannel("A")
    
    # Dilate the alpha mask to create the outer boundary
    dilated = alpha.filter(ImageFilter.MaxFilter(RIM_RADIUS * 2 + 1))
    
    # Subtract original alpha to get the ring outline
    ring = ImageChops.subtract(dilated, alpha)
    
    # Create neon rim layer
    rim_layer = Image.new("RGBA", img.size, ACCENT_COLOR)
    rim_layer.putalpha(ring)
    
    # Apply blur to make it glow like neon light
    rim_glow = rim_layer.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    
    # 3. Composite: Rim Glow goes BEHIND the drone image
    final_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    final_img.alpha_composite(rim_glow)
    final_img.alpha_composite(img_contrast)
    
    # Save back to same path
    final_img.save(img_path)
    print(f"Applied Neon Rimlight & Contrast Boost: {img_path.name}")

for drone in drones:
    for pose in poses:
        path = COMBAT_DIR / f"{drone}-{pose}.png"
        if path.exists():
            apply_effects(path)
        else:
            print(f"Warning: {path.name} not found")

print("\nDrone post-processing complete.")
