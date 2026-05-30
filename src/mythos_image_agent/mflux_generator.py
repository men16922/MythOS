"""FLUX image generation via Apple's MLX framework (mflux).

This is an alternative to the diffusers/PyTorch-MPS backend (`generator.py`). MLX is
Apple-Silicon-native and, combined with weight quantization (4/8-bit), runs FLUX.1-schnell
far faster and in much less memory (~7GB at 4-bit, ~12GB at 8-bit vs ~24GB bf16) — which
removes the swap thrashing that makes the diffusers path slow when it shares the 48GB
unified memory with Ollama.

Same FLUX.1-schnell weights as the diffusers path, so art stays consistent. `image_path`
+ `image_strength` give img2img identity steering in the same call.

The model is loaded once per process and cached (mlx/mflux imports stay lazy so importing
this module never pulls in MLX).
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

_LOCK = threading.RLock()
_MODELS: dict[int | None, Any] = {}


def _get_flux(quantize: int | None) -> Any:
    with _LOCK:
        model = _MODELS.get(quantize)
        if model is None:
            from mflux.models.flux.variants.txt2img.flux import Flux1

            print(f"Loading mflux FLUX.1-schnell (quantize={quantize}) — one-time…")
            model = Flux1.from_name(model_name="schnell", quantize=quantize)
            _MODELS[quantize] = model
        return model


def generate_image_mflux(
    prompt: str,
    output_path: Path,
    *,
    seed: int = 42,
    steps: int = 4,
    width: int = 1024,
    height: int = 1024,
    quantize: int | None = 8,
    guidance: float = 0.0,
    reference_path: Path | str | None = None,
    image_strength: float | None = None,
) -> Path:
    flux = _get_flux(quantize)

    kwargs: dict[str, Any] = {
        "seed": seed,
        "prompt": prompt,
        "num_inference_steps": steps,
        "width": width,
        "height": height,
        "guidance": guidance,
    }
    # img2img identity/mood steering when a reference is supplied.
    if reference_path and Path(reference_path).exists():
        kwargs["image_path"] = str(reference_path)
        kwargs["image_strength"] = 0.6 if image_strength is None else image_strength

    image = flux.generate_image(**kwargs)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path=str(output_path), overwrite=True)
    return output_path
