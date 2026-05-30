"""Se-rin v2 — A-based, borrowing C (glowing cyber eyes + helmet); plus an
improved single-motorcycle biker shot (the previous biker had two overlapping
bikes). Loads FLUX once, writes candidates under
resources/neo-seoul/characters/variants/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402

STYLE = "cyberpunk, Y2K digital, glitch, navy with cyan and gold neon, rain, cinematic"

# A-based portrait fused with C (glowing cyber-cyan eyes + helmet).
FUSION = (
    "Fierce mysterious rebellious Korean woman biker, long black hair, glowing "
    "cyber-cyan eyes, charismatic gaze, glowing cybernetic implants on cheek and neck, "
    "black studded leather biker jacket, holding a glowing visor helmet, neon-lit rainy "
    "alley, Korean Hangul neon, dramatic rim light, high impact"
)

# A-based look on a single clean motorcycle (avoid doubled/overlapping bikes).
BIKER = (
    "Fierce mysterious Korean woman biker standing beside one single sleek neon "
    "futuristic motorcycle, long black hair, glowing cyber-cyan eyes, cybernetic "
    "implants, black studded leather biker jacket, charismatic gaze, rainy neon street, "
    "Korean Hangul neon, dramatic rim light, full body, only one motorcycle"
)

VARIANTS = [
    ("se-rin-fusion-a.png", 321, FUSION),
    ("se-rin-fusion-b.png", 322, FUSION),
    ("se-rin-biker-a.png", 331, BIKER),
    ("se-rin-biker-b.png", 332, BIKER),
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
