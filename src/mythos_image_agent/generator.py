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
    ip_adapter_image_path: Path | None = None,
    ip_adapter_scale: float = 0.6,
) -> Path:
    import torch
    from diffusers.utils import load_image

    from .pipeline_cache import get_flux_ip_adapter_pipeline, get_flux_pipeline

    model_id = model_id_override or config.image_model_id
    target_width = width or config.default_width
    target_height = height or config.default_height

    kwargs: dict = {
        "prompt": prompt,
        "guidance_scale": config.guidance_scale,
        "num_inference_steps": steps or config.default_steps,
        "max_sequence_length": config.max_sequence_length,
        "width": target_width,
        "height": target_height,
    }

    if ip_adapter_image_path and Path(ip_adapter_image_path).exists():
        print(f"Generating image with IP-Adapter (scale={ip_adapter_scale})...")
        pipe = get_flux_ip_adapter_pipeline(model_id, config)
        reference_image = (
            load_image(str(ip_adapter_image_path))
            .convert("RGB")
            .resize((target_width, target_height))
        )
        pipe.set_ip_adapter_scale(ip_adapter_scale)
        kwargs["ip_adapter_image"] = reference_image
    else:
        pipe = get_flux_pipeline(model_id, config)
        # A plain FLUX pipeline exposes set_ip_adapter_scale via mixin even when
        # no adapter is loaded; calling it then raises (no encoder_hid_proj).
        # Only zero the scale when an IP adapter is actually present.
        transformer = getattr(pipe, "transformer", None)
        if getattr(transformer, "encoder_hid_proj", None) is not None:
            pipe.set_ip_adapter_scale(0.0)

    generator = torch.Generator("cpu").manual_seed(seed or config.default_seed)
    kwargs["generator"] = generator

    print("Generating image...")
    image = pipe(**kwargs).images[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)

    if hasattr(torch, "mps"):
        torch.mps.empty_cache()

    return output_path
