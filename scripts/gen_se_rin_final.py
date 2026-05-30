"""Se-rin final canonical portrait — no helmet, A-based composition, face that
blends the appeal of variants se-rin-a (close-up alley portrait) and se-rin-b.

NOTE: the pipeline is text-to-image only; it cannot pixel-blend two reference
faces. This approximates the desired face via prompt traits. Loads FLUX once,
writes candidates under resources/neo-seoul/characters/variants/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402

STYLE = "cyberpunk, Y2K digital, glitch, navy with cyan and gold neon, rain, cinematic"

# No helmet, no motorcycle — a strong character-card portrait. Facial traits
# combine se-rin-a and se-rin-b.
PROMPT = (
    "Head and shoulders portrait of a fierce mysterious rebellious Korean woman, "
    "long black hair with side-swept bangs, soft striking Korean features, calm "
    "charismatic gaze looking at viewer, glowing cyber-cyan accents in her eyes, subtle "
    "glowing cybernetic implant on her cheek, red lips, choker, black studded leather "
    "biker jacket, no helmet, empty hands, neon-lit rainy alley, Korean Hangul neon, "
    "dramatic rim light, high impact"
)

VARIANTS = [
    ("se-rin-final-a.png", 341, PROMPT),
    ("se-rin-final-b.png", 342, PROMPT),
    ("se-rin-final-c.png", 343, PROMPT),
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
