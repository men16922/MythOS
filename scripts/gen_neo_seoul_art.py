"""Batch-generate Neo-Seoul scenario concept art and character images.

Loads the FLUX pipeline once and renders every asset, so it is far faster than
calling `agent.py` per image. Outputs go under `resources/neo-seoul/`.

Usage:
    .venv/bin/python scripts/gen_neo_seoul_art.py            # all assets
    .venv/bin/python scripts/gen_neo_seoul_art.py --steps 4 --width 1024

Requires the same environment as the image agent (Apple Silicon MPS + accepted
Hugging Face access to black-forest-labs/FLUX.1-schnell). See `make doctor`.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402

# Kept short and front-loads subject traits, so the CLIP encoder (77-token limit)
# still sees the important tokens (Korean Hangul signage, gender, hair).
STYLE = (
    "cyberpunk Neo-Seoul, Y2K digital aesthetic, CRT scanlines, subtle glitch, "
    "deep navy-blue with cyber-cyan and gold neon, rain, cinematic, highly detailed"
)

# (relative_path, seed, prompt-without-style)
ASSETS: list[tuple[str, int, str]] = [
    (
        "concept/01-night-market.png",
        42,
        "A rain-soaked floating night market on barges over a dark river, glowing "
        "Korean Hangul neon signs and shop banners everywhere, crowds in hooded coats, "
        "surveillance drones, corporate spires in background fog",
    ),
    (
        "concept/02-control-spire.png",
        77,
        "A colossal white minimalist ARK reconstruction megatower piercing storm clouds, "
        "Korean Hangul holographic signage at its base, drones orbiting, a cold "
        "surveillance-eye motif, sterile neon-blue glow, tiny human figures for scale",
    ),
    (
        "concept/04-reconstruction.png",
        91,
        "A rebuilt megacity rising over the ruins of a war-destroyed old city, giant ARK "
        "reconstruction megastructures and cranes and scaffolding, Korean Hangul banners, "
        "scarred concrete below and gleaming towers above, somber dawn",
    ),
    (
        "concept/03-underground-echo.png",
        108,
        "A warm cluttered underground refuge of salvaged tech and old CRT monitors, "
        "Korean Hangul graffiti on the walls, string lights, people sharing food around "
        "a fire barrel, humane defiant mood under the cold city",
    ),
    (
        "characters/se-rin.png",
        211,
        "Character portrait of a fierce rebellious young Korean woman, long flowing dark "
        "hair, striking idol-like beauty, edgy streetwear under a worn rider jacket, "
        "defiant smirk, neon alley with Korean Hangul signs, holding a drone controller",
    ),
    (
        "characters/lin-yue.png",
        212,
        "Character portrait of a powerful Chinese underworld crime boss woman, commanding "
        "imposing presence, luxurious dark tech-hanfu coat with gold, cold confident "
        "stare, seated on a throne-like chair on her market barge, Korean Hangul neon",
    ),
    (
        "characters/kai.png",
        213,
        "Character portrait of a melancholic decommissioned male android of Japanese "
        "design, masculine angular face, matte-white and charcoal chassis with exposed "
        "seams and a cracked cheek panel revealing soft blue light, sorrowful eyes, "
        "rain, Korean Hangul neon behind",
    ),
    (
        "characters/administrator-ix.png",
        204,
        "An abstract omnipresent control-system entity, a vast polite digital face of "
        "surveillance-camera arrays and flowing data over the city, Korean Hangul system "
        "text, cold cyan light, faceless authority",
    ),
    (
        "characters/tae-o.png",
        511,
        "Character portrait of a battle-scarred rogue enforcer man named Tae-o, short spiky black "
        "hair, cybernetic jaw implant, wearing a heavy bulletproof vest over dark tech-wear, "
        "carrying a customized rifle, rain, neon alley with Korean Hangul signs, rugged look",
    ),
    (
        "enemies/shock-trooper.png",
        512,
        "An elite ARK shock trooper wearing heavy black and cyan armor, full-face visor glowing "
        "with golden data lines, holding a high-tech assault rifle, tactical stance in a rainy "
        "dystopian Neo-Seoul street",
    ),
    (
        "enemies/tracker-spider.png",
        513,
        "A multi-legged cybernetic tracker spider drone, metallic dark chassis with glowing yellow "
        "scanner eyes, crawling over wet concrete in a dark neon-lit alleyway",
    ),
    (
        "concept/05-data-incinerator.png",
        514,
        "A massive glowing data incinerator furnace room in a dystopian facility, cyber-cyan cooling "
        "tubes, gold holographic caution signs in Korean Hangul, plumes of data-smoke, high-tech "
        "industrial aesthetic",
    ),
    (
        "characters/han.png",
        515,
        "Character portrait of a young Korean male hacker named Han, sharp intelligent eyes, "
        "wearing a dark techwear hoodie with glowing cyan wires, surrounded by holographic "
        "coding screens displaying Hangul code, Y2K digital cyberpunk aesthetic, deep navy-blue "
        "with cyber-cyan and gold neon, highly detailed",
    ),
    (
        "characters/su-ah.png",
        516,
        "Character portrait of a focused Korean female artisan named Su-ah, hair tied back, "
        "wearing welding goggles around her neck, working in a cluttered tech workshop with sparks "
        "and glowing memory shards, Y2K digital cyberpunk aesthetic, deep navy-blue with cyber-cyan "
        "and gold neon, highly detailed",
    ),
    (
        "enemies/suppression-mech.png",
        517,
        "A colossal quad-legged armored suppression mech tank, heavy metallic dark grey plating, "
        "glowing cyan hydraulic lines, firing a massive energy railgun, wreckage and sparks in "
        "a wet dystopian Neo-Seoul street, Y2K digital cyberpunk aesthetic, deep navy-blue with "
        "cyber-cyan and gold neon, highly detailed",
    ),
    (
        "enemies/purge-drone.png",
        518,
        "A compact aerial purge drone equipped with a glowing orange flamethrower, carbon-plated armor, "
        "spewing fire over dark metallic ruins, Y2K digital cyberpunk aesthetic, deep navy-blue with "
        "cyber-cyan and gold neon, highly detailed",
    ),
    (
        "concept/06-subway-control-hub.png",
        519,
        "A massive underground subway control hub in Neo-Seoul, glowing cyan tracks, server racks, "
        "holographic train routing maps in Hangul, Y2K digital cyberpunk aesthetic, deep navy-blue "
        "with cyber-cyan and gold neon, highly detailed",
    ),
]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--out", type=Path, default=ROOT / "resources" / "neo-seoul")
    args = parser.parse_args(argv)

    import torch
    from diffusers import FluxPipeline

    config = AgentConfig()
    if not torch.backends.mps.is_available():
        raise SystemExit("MPS unavailable; this script requires Apple Silicon.")
    device = torch.device("mps")

    print(f"Loading {config.image_model_id} once ...", flush=True)
    pipe = FluxPipeline.from_pretrained(
        config.image_model_id,
        torch_dtype=torch.bfloat16,
        token=config.hf_auth_token,
    ).to(device)
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    for rel_path, seed, prompt in ASSETS:
        out_path = args.out / rel_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        full_prompt = f"{prompt}, {STYLE}"
        print(f"[{seed}] -> {rel_path}", flush=True)
        generator = torch.Generator("cpu").manual_seed(seed)
        image = pipe(
            prompt=full_prompt,
            guidance_scale=config.guidance_scale,
            num_inference_steps=args.steps,
            max_sequence_length=config.max_sequence_length,
            generator=generator,
            width=args.width,
            height=args.height,
        ).images[0]
        image.save(out_path)
        if hasattr(torch, "mps"):
            torch.mps.empty_cache()
        print(f"    saved {out_path}", flush=True)

    print("done.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
