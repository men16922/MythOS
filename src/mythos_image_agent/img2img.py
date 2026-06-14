"""Image-to-image generation for look/identity steering.

Given a reference image (e.g., a finalized character portrait) and a prompt, this
re-renders a new image that preserves the reference's composition and overall look
while following the prompt. On Apple Silicon MPS with FLUX.1-schnell.

This is the pragmatic, no-extra-weights way to keep a character recognizable across
new poses/scenes. For stronger face-identity locking, FLUX also supports IP-Adapter
(`FluxPipeline.load_ip_adapter`) and Redux — see `docs/...` follow-up; those need
extra adapter weights + an image encoder and are heavier on MPS.

`strength` (0..1) controls how much the prompt is allowed to change the reference:
lower = closer to the reference (more identity kept), higher = more freedom.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[assignment]

from .config import PROJECT_ROOT, AgentConfig

if load_dotenv is not None:
    load_dotenv(PROJECT_ROOT / ".env")

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


def generate_image_img2img(
    reference_path: Path,
    prompt: str,
    output_path: Path,
    config: AgentConfig,
    strength: float = 0.6,
    model_id_override: str | None = None,
    seed: int | None = None,
    steps: int | None = None,
    width: int | None = None,
    height: int | None = None,
) -> Path:
    import torch
    from diffusers.utils import load_image

    from .pipeline_cache import get_flux_img2img_pipeline

    model_id = model_id_override or config.image_model_id

    # Reuses the cached txt2img weights; no second ~24GB load.
    pipe = get_flux_img2img_pipeline(model_id, config)

    target_width = width or config.default_width
    target_height = height or config.default_height
    reference = load_image(str(reference_path)).convert("RGB").resize((target_width, target_height))

    generator = torch.Generator("cpu").manual_seed(seed or config.default_seed)
    # schnell is distilled for very few steps; img2img only runs ~steps*strength of
    # them, so default a little higher to leave the prompt room to act.
    effective_steps = steps or 8

    print(f"Generating img2img (strength={strength})...")
    image = pipe(
        prompt=prompt,
        image=reference,
        strength=strength,
        guidance_scale=config.guidance_scale,
        num_inference_steps=effective_steps,
        max_sequence_length=config.max_sequence_length,
        generator=generator,
        width=target_width,
        height=target_height,
    ).images[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)

    if hasattr(torch, "mps"):
        torch.mps.empty_cache()

    return output_path
