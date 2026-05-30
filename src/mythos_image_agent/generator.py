from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore[import-untyped, import-not-found]
except ImportError:
    load_dotenv = None  # type: ignore[assignment]


from .config import PROJECT_ROOT, AgentConfig

if load_dotenv is not None:
    load_dotenv(PROJECT_ROOT / ".env")

os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


def _require_mps():
    import torch

    if not torch.backends.mps.is_available():
        raise RuntimeError(
            "Apple Silicon GPU(MPS)를 사용할 수 없습니다. "
            "MPS 지원 Mac과 MPS 지원 PyTorch 설치를 확인하세요."
        )

    return torch.device("mps")


def generate_image(
    prompt: str,
    output_path: Path,
    config: AgentConfig,
    model_id_override: str | None = None,
    seed: int | None = None,
    steps: int | None = None,
    width: int | None = None,
    height: int | None = None,
) -> Path:
    import torch

    from .pipeline_cache import get_flux_pipeline

    model_id = model_id_override or config.image_model_id

    # Loaded once per process and cached; subsequent scenes skip the ~24GB reload.
    pipe = get_flux_pipeline(model_id, config)

    generator = torch.Generator("cpu").manual_seed(seed or config.default_seed)

    print("Generating image...")
    image = pipe(
        prompt=prompt,
        guidance_scale=config.guidance_scale,
        num_inference_steps=steps or config.default_steps,
        max_sequence_length=config.max_sequence_length,
        generator=generator,
        width=width or config.default_width,
        height=height or config.default_height,
    ).images[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)

    if hasattr(torch, "mps"):
        torch.mps.empty_cache()

    return output_path
