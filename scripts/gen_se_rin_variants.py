"""Generate high-impact Se-rin (lead guide) biker variants.

Se-rin leads the early game in place of the protagonist, so this iterates on a
more rebellious / cyberpunk / mysterious / biker look. Loads FLUX once, writes
candidates under resources/neo-seoul/characters/variants/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402

STYLE = "cyberpunk, Y2K digital, glitch, navy with cyan and gold neon, rain, cinematic"

VARIANTS = [
    (
        "se-rin-a.png",
        311,
        "Fierce mysterious rebellious Korean woman biker, long black hair, sharp "
        "charismatic gaze, glowing cybernetic implants on cheek and neck, black studded "
        "leather biker jacket, half face in shadow, Korean Hangul neon, dramatic rim light",
    ),
    (
        "se-rin-b.png",
        312,
        "Fierce mysterious Korean woman biker leaning on a sleek neon futuristic "
        "motorcycle, long black hair, defiant smirk, cybernetic implants, black studded "
        "leather biker suit, Korean Hangul neon, dramatic backlight, full body",
    ),
    (
        "se-rin-c.png",
        313,
        "Rebellious mysterious Korean woman biker holding a glowing visor helmet, long "
        "black hair, cybernetic facial implants, black leather biker jacket, cyber-cyan "
        "eye glow, shadowy enigmatic mood, Korean Hangul neon",
    ),
]


def main() -> int:
    import torch
    from diffusers import FluxPipeline

    config = AgentConfig()
    device = torch.device("mps")
    print("loading FLUX once...", flush=True)
    pipe = FluxPipeline.from_pretrained(
        config.image_model_id, torch_dtype=torch.bfloat16, token=config.hf_auth_token
    ).to(device)
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    out = ROOT / "resources" / "neo-seoul" / "characters" / "variants"
    out.mkdir(parents=True, exist_ok=True)
    for name, seed, prompt in VARIANTS:
        path = out / name
        print(f"[{seed}] {name}", flush=True)
        gen = torch.Generator("cpu").manual_seed(seed)
        img = pipe(
            prompt=f"{prompt}, {STYLE}",
            guidance_scale=config.guidance_scale,
            num_inference_steps=4,
            max_sequence_length=config.max_sequence_length,
            generator=gen,
            width=1024,
            height=1024,
        ).images[0]
        img.save(path)
        if hasattr(torch, "mps"):
            torch.mps.empty_cache()
        print(f"  saved {path}", flush=True)
    print("done.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
