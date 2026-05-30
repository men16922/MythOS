"""Refine the remaining Neo-Seoul characters (Lin-yue, Kai, Administrator IX) to
the same high-impact bar as Se-rin. Text-to-image, 2 candidates each, FLUX loaded
once. Candidates land under resources/neo-seoul/characters/variants/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402

STYLE = "cyberpunk, Y2K digital, glitch, navy with cyan and gold neon, rain, cinematic, high impact"

LIN_YUE = (
    "Imposing Chinese underworld crime boss woman on a throne-like seat aboard a neon "
    "market barge, luxurious dark tech-hanfu coat with gold dragon embroidery, cold "
    "commanding stare, gold jewelry, subtle glowing cybernetic accents, dim red lantern "
    "light, Korean Hangul neon, dramatic chiaroscuro"
)
KAI = (
    "Melancholic male android of Japanese design, masculine angular face, matte-white "
    "and charcoal chassis with exposed seams, a cracked cheek panel revealing soft "
    "glowing blue light, sorrowful luminous eyes, rain on his frame, Korean Hangul neon "
    "reflections, dramatic rim light"
)
ADMIN_IX = (
    "Ominous omnipresent control-system entity looming over the city, a vast cold polite "
    "digital face assembled from thousands of surveillance cameras and flowing data, "
    "cyan holographic Korean Hangul system text, monumental scale, tiny city below, "
    "oppressive god-like authority"
)

VARIANTS = [
    ("lin-yue-v2-a.png", 412, LIN_YUE),
    ("lin-yue-v2-b.png", 413, LIN_YUE),
    ("kai-v2-a.png", 422, KAI),
    ("kai-v2-b.png", 423, KAI),
    ("administrator-ix-v2-a.png", 432, ADMIN_IX),
    ("administrator-ix-v2-b.png", 433, ADMIN_IX),
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
