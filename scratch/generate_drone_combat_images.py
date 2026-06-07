import os
import subprocess
from pathlib import Path

from PIL import Image

# Setup paths
ROOT = Path("/Users/men1692/Desktop/local/MythOS")
os.environ["PYTHONPATH"] = str(ROOT / "src")

# Lazy import model generator to avoid loading it during definition
from mythos_image_agent.mflux_generator import generate_image_mflux_redux  # noqa: E402

SCENARIO = ROOT / "resources" / "neo-seoul"
OUT_COMPARE_DIR = ROOT / "outputs" / "combat-sprite-compare" / "imagen"
OUT_COMBAT_DIR = SCENARIO / "enemies" / "combat"

OUT_COMPARE_DIR.mkdir(parents=True, exist_ok=True)
OUT_COMBAT_DIR.mkdir(parents=True, exist_ok=True)

# Subjects spec
DRONES = [
    {
        "slug": "maintenance-drone",
        "label": "Maintenance drone",
        "reference": SCENARIO / "enemies" / "maintenance-drone.png",
        "poses": {
            "attack": "actively attacking, rusted cutter claw slashing, dynamic motion, visible weapon action, impact direction clear",
            "skill": "casting special skill: sparking repair arm overclocked with red warning light, visible magical cybernetic energy effect, defensive or power aura",
            "hit": "being hit and recoiling from impact, damaged stagger pose, red impact sparks, defensive posture broken",
        },
    },
    {
        "slug": "sentinel-drone",
        "label": "Sentinel drone",
        "reference": SCENARIO / "enemies" / "sentinel-drone.png",
        "poses": {
            "attack": "actively attacking, red targeting laser firing, dynamic motion, visible weapon action, impact direction clear",
            "skill": "casting special skill: red sensor array charging a focused beam, visible magical cybernetic energy effect, defensive or power aura",
            "hit": "being hit and recoiling from impact, damaged stagger pose, red impact sparks, defensive posture broken",
        },
    },
]


def fallback_chroma_key_removal(img_path: Path, out_path: Path):
    """Fallback python chroma-key removal in case system script is missing."""
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        r, g, b, a = item
        # Detect bright green chroma-key #00ff00
        # If green is high and significantly larger than red and blue
        if g > 110 and g > r * 1.35 and g > b * 1.35:
            new_data.append((0, 0, 0, 0))
        elif g > 150 and (g - r) > 35 and (g - b) > 35:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    # Apply slight edge smoothing
    img.save(out_path)
    print(f"Fallback chroma key removed and saved to {out_path.name}")


def remove_chroma_key(input_path: Path, output_path: Path):
    system_script = Path(
        os.path.expanduser("~/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py")
    )
    if system_script.exists():
        print(f"Running system remove_chroma_key.py on {input_path.name}...")
        try:
            subprocess.run(
                [
                    "python",
                    str(system_script),
                    "--input",
                    str(input_path),
                    "--out",
                    str(output_path),
                    "--auto-key",
                    "border",
                    "--soft-matte",
                    "--transparent-threshold",
                    "12",
                    "--opaque-threshold",
                    "220",
                    "--despill",
                ],
                check=True,
            )
            print(f"Chroma key removed: {output_path.name}")
        except Exception as e:
            print(f"System chroma key script failed ({e}). Using fallback PIL chroma-key...")
            fallback_chroma_key_removal(input_path, output_path)
    else:
        print("System chroma key removal script not found. Using fallback PIL chroma-key...")
        fallback_chroma_key_removal(input_path, output_path)


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


def main():
    quantize = 4  # Fast, lighter quantize as per .env recommendation
    steps = 4
    redux_strength = 0.62

    for idx, drone in enumerate(DRONES):
        slug = drone["slug"]
        label = drone["label"]
        ref_path = drone["reference"]

        print(f"\n--- Generating poses for {label} ---")

        for pose, details in drone["poses"].items():
            # Prompt according to Y2K Cyber-mythic Darkest Dungeon guidelines
            prompt = (
                f"{label}, full body tactical combat portrait, facing left, side-view action pose, "
                f"Darkest Dungeon inspired dramatic 2D game art, Y2K cyber-mythic Neo-Seoul, "
                f"strong readable silhouette, character centered, head to boots visible, no UI, no text, no border, "
                f"flat solid bright green chroma-key background #00ff00, high contrast neon rim light, "
                f"{details}"
            )

            src_out = OUT_COMPARE_DIR / f"{slug}-{pose}-source.png"
            alpha_out = OUT_COMPARE_DIR / f"{slug}-{pose}-alpha.png"
            final_out = OUT_COMBAT_DIR / f"{slug}-{pose}.png"

            # Generate image using FLUX Redux
            print(f"Generating image for {slug}-{pose}...")
            generate_image_mflux_redux(
                prompt=prompt,
                output_path=src_out,
                reference_path=ref_path,
                redux_strength=redux_strength,
                seed=7500 + idx * 10 + list(drone["poses"].keys()).index(pose),
                steps=steps,
                width=512,
                height=768,
                quantize=quantize,
                guidance=0.0,
            )
            print(f"Saved raw source: {src_out.name}")

            # Remove green chroma-key background
            remove_chroma_key(src_out, alpha_out)

            # Normalize and save to final combat folder
            alpha_img = Image.open(alpha_out)
            normalized_img = normalize(alpha_img)
            normalized_img.save(final_out)
            print(f"Normalized and saved to combat folder: {final_out.name}")


if __name__ == "__main__":
    main()
