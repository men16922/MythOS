"""Process-wide FLUX pipeline cache.

FLUX.1-schnell is ~24GB in bfloat16. The previous code reloaded the full pipeline
from disk to MPS on *every* image call, so each scene transition paid tens of seconds
of model-loading before any inference ran. This module loads each pipeline once per
process and reuses it; the img2img pipeline is built from the already-loaded txt2img
components so the heavy weights are shared (roughly one model in memory, not two).

The cache lives in module globals, so within a single Streamlit server process it
survives across reruns/scene transitions. Separate CLI invocations are separate
processes and still load once each (inherent).

Heavy imports (torch/diffusers) stay deferred inside the functions so importing this
module — or the runtime — never pulls in torch.
"""

from __future__ import annotations

import os
import threading
from typing import Any, cast

from .config import AgentConfig

# Reentrant: get_flux_img2img_pipeline acquires the lock and then calls
# get_flux_pipeline, which acquires it again.
_LOCK = threading.RLock()
_PIPELINES: dict[tuple[str, str], Any] = {}


def _load_base_pipeline(model_id: str, config: AgentConfig) -> Any:
    import importlib

    import torch
    from diffusers import FluxPipeline
    from huggingface_hub.errors import GatedRepoError, HfHubHTTPError

    from .generator import _require_mps

    # FLUX pairs CLIP (77-token cap, pooled style vector) with T5 (full detail up to
    # max_sequence_length). Long visual briefs legitimately overflow CLIP's 77 tokens;
    # the pipeline truncates the CLIP branch but still feeds the full prompt to T5, so
    # the transformers/diffusers "sequence length longer than 77 / truncated" warning is
    # benign noise. Quiet it so the logs stay readable.
    for _mod in ("transformers.utils.logging", "diffusers.utils.logging"):
        try:
            importlib.import_module(_mod).set_verbosity_error()
        except Exception:
            pass

    device = _require_mps()
    print(f"Loading image model (one-time): {model_id}")
    try:
        pipe = (
            cast(Any, FluxPipeline)
            .from_pretrained(
                model_id,
                torch_dtype=torch.bfloat16,
                token=config.hf_auth_token,
            )
            .to(device)
        )
    except GatedRepoError as exc:
        message = str(exc)
        if "not in the authorized list" in message:
            raise RuntimeError(
                f"{model_id} access is not approved for the current Hugging Face account. "
                f"Visit https://huggingface.co/{model_id} and request or accept access, then rerun."
            ) from exc
        raise RuntimeError(
            f"{model_id} is a gated Hugging Face repo. Accept access on Hugging Face, "
            "then set HF_TOKEN in .env or run `hf auth login`."
        ) from exc
    except HfHubHTTPError as exc:
        raise RuntimeError(f"Cannot download {model_id} from Hugging Face: {exc}") from exc

    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
    return pipe


def get_flux_pipeline(model_id: str, config: AgentConfig) -> Any:
    """Return a cached `FluxPipeline` for `model_id`, loading it once per process."""
    key = (model_id, "txt2img")
    with _LOCK:
        pipe = _PIPELINES.get(key)
        if pipe is None:
            pipe = _load_base_pipeline(model_id, config)
            _PIPELINES[key] = pipe
        return pipe


def get_flux_img2img_pipeline(model_id: str, config: AgentConfig) -> Any:
    """Return a cached `FluxImg2ImgPipeline`, reusing the txt2img pipeline's weights."""
    key = (model_id, "img2img")
    with _LOCK:
        pipe = _PIPELINES.get(key)
        if pipe is None:
            from diffusers import FluxImg2ImgPipeline

            base = get_flux_pipeline(model_id, config)
            # Reuse already-loaded components (transformer/vae/text encoders) instead of
            # loading a second ~24GB copy.
            pipe = cast(Any, FluxImg2ImgPipeline)(**base.components)
            _PIPELINES[key] = pipe
        return pipe


def get_flux_ip_adapter_pipeline(model_id: str, config: AgentConfig) -> Any:
    """Return a cached `FluxPipeline` with IP-Adapter loaded, reusing components."""
    key = (model_id, "ip_adapter")
    with _LOCK:
        pipe = _PIPELINES.get(key)
        if pipe is None:
            import torch
            from diffusers import FluxPipeline
            from transformers import CLIPVisionModelWithProjection

            base = get_flux_pipeline(model_id, config)

            print(f"Loading image encoder for IP-Adapter: {config.ip_adapter_image_encoder}")
            # Load CLIP image encoder. OOM prevention: place it on CPU.
            image_encoder = CLIPVisionModelWithProjection.from_pretrained(
                config.ip_adapter_image_encoder,
                torch_dtype=torch.bfloat16,
                token=config.hf_auth_token,
            ).to("cpu")  # type: ignore[arg-type]

            # Create a FluxPipeline reusing all components of the base pipeline,
            # and inject the loaded image_encoder.
            components = dict(base.components)
            components["image_encoder"] = image_encoder

            pipe = cast(Any, FluxPipeline)(**components)

            # Load the IP-Adapter weights. Use image_encoder_folder=None to avoid re-loading.
            print(
                f"Loading IP-Adapter weights: {config.ip_adapter_repo} ({config.ip_adapter_weight_name})"
            )
            pipe.load_ip_adapter(
                config.ip_adapter_repo,
                weight_name=config.ip_adapter_weight_name,
                image_encoder_folder=None,
            )

            # Apply CPU Offloading if configured
            if os.getenv("FLUX_ENABLE_CPU_OFFLOAD", "0") == "1":
                try:
                    pipe.enable_model_cpu_offload()
                except Exception as exc:
                    print(f"Warning: enable_model_cpu_offload failed: {exc}")

            _PIPELINES[key] = pipe
        return pipe


def clear_pipeline_cache() -> None:
    """Drop cached pipelines (frees MPS memory on next empty_cache). Mainly for tests."""
    with _LOCK:
        _PIPELINES.clear()
