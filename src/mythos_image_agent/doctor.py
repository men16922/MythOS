from __future__ import annotations

import importlib.util
import json
import platform
import sys
from urllib.error import URLError
from urllib.request import Request, urlopen

from .config import AgentConfig

REQUIRED_PACKAGES = (
    "accelerate",
    "diffusers",
    "huggingface_hub",
    "openai",
    "PIL",
    "sentencepiece",
    "torch",
    "torchvision",
    "transformers",
)


def package_status() -> list[tuple[str, bool]]:
    return [(name, importlib.util.find_spec(name) is not None) for name in REQUIRED_PACKAGES]


def check_mps() -> tuple[bool, str]:
    try:
        import torch
    except ImportError:
        return False, "torch is not installed"

    if not torch.backends.mps.is_available():
        return False, "torch.backends.mps.is_available() returned False"

    return True, "MPS is available"


def check_ollama(config: AgentConfig) -> tuple[bool, str]:
    endpoint = config.ollama_base_url.rstrip("/").removesuffix("/v1")
    request = Request(f"{endpoint}/api/tags", method="GET")

    try:
        with urlopen(request, timeout=3) as response:
            if response.status != 200:
                return False, f"Ollama returned HTTP {response.status}"
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        return False, f"cannot reach Ollama at {endpoint}: {exc.reason}"
    except TimeoutError:
        return False, f"timed out connecting to Ollama at {endpoint}"
    except json.JSONDecodeError as exc:
        return False, f"Ollama returned invalid JSON: {exc}"

    installed_models = sorted(
        {
            model_name
            for item in payload.get("models", [])
            for model_name in (item.get("name"), item.get("model"))
            if model_name
        }
    )

    if config.ollama_model not in installed_models:
        installed = ", ".join(installed_models) or "none"
        return False, f"{config.ollama_model} is not installed. Installed: {installed}"

    return True, f"Ollama is reachable at {endpoint}; {config.ollama_model} is installed"


def check_huggingface_model_access(config: AgentConfig) -> tuple[bool, str]:
    try:
        from huggingface_hub import hf_hub_download
        from huggingface_hub.errors import GatedRepoError, HfHubHTTPError
    except ImportError:
        return False, "huggingface_hub is not installed"

    try:
        hf_hub_download(
            repo_id=config.image_model_id,
            filename="model_index.json",
            token=config.hf_auth_token,
            dry_run=True,
        )
    except GatedRepoError as exc:
        message = str(exc)
        if "not in the authorized list" in message:
            return (
                False,
                f"{config.image_model_id} access is not approved for the current Hugging Face account. "
                f"Visit https://huggingface.co/{config.image_model_id} and request or accept access.",
            )
        return (
            False,
            f"{config.image_model_id} is gated. Set HF_TOKEN after accepting access on Hugging Face.",
        )
    except HfHubHTTPError as exc:
        return False, f"cannot access {config.image_model_id}: {exc}"
    except Exception as exc:
        return False, f"cannot validate {config.image_model_id}: {exc}"

    token_state = "with HF_TOKEN" if config.hf_token else "with local HF login"
    return True, f"{config.image_model_id} model_index.json is accessible {token_state}"


def run_doctor(config: AgentConfig) -> int:
    print(f"Python: {sys.version.split()[0]} ({platform.machine()})")

    exit_code = 0

    mps_ok, mps_message = check_mps()
    print(f"MPS: {'OK' if mps_ok else 'FAIL'} - {mps_message}")
    if not mps_ok:
        exit_code = 1

    print("Packages:")
    for package_name, installed in package_status():
        print(f"  {'OK' if installed else 'MISSING'} {package_name}")
        if not installed:
            exit_code = 1

    ollama_ok, ollama_message = check_ollama(config)
    print(f"Ollama: {'OK' if ollama_ok else 'FAIL'} - {ollama_message}")
    if not ollama_ok:
        print("  Start Ollama and run: ollama pull <model>")
        exit_code = 1

    print(f"LLM model: {config.ollama_model}")
    print(f"Image model: {config.image_model_id}")

    hf_ok, hf_message = check_huggingface_model_access(config)
    print(f"Hugging Face model access: {'OK' if hf_ok else 'FAIL'} - {hf_message}")
    if not hf_ok:
        print(
            "  For FLUX.1 schnell, open the model page, accept/request access, then rerun this check."
        )
        exit_code = 1

    return exit_code
