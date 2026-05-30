from __future__ import annotations

import argparse
from dataclasses import replace

from .config import AgentConfig
from .doctor import run_doctor


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="agent.py",
        description="Local Ollama + FLUX.1 schnell image generation agent.",
    )
    parser.add_argument("prompt", nargs="?", help="User idea or direct image prompt.")
    parser.add_argument(
        "--output", help="Output image path. Defaults to outputs/mythos-output.png."
    )
    parser.add_argument("--no-enhance", action="store_true", help="Skip Ollama prompt expansion.")
    parser.add_argument("--expand-only", action="store_true", help="Only print the final prompt.")
    parser.add_argument(
        "--doctor", action="store_true", help="Check local setup without loading FLUX."
    )
    parser.add_argument("--ollama-model", help="Override the Ollama model name.")
    parser.add_argument("--model-id", help="Override the Diffusers model ID.")
    parser.add_argument("--seed", type=int, help="Generation seed.")
    parser.add_argument("--steps", type=int, help="Inference steps. FLUX.1 schnell default is 4.")
    parser.add_argument("--width", type=int, help="Image width. Default is 1024.")
    parser.add_argument("--height", type=int, help="Image height. Default is 1024.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    config = AgentConfig()

    if args.ollama_model or args.model_id:
        config = replace(
            config,
            ollama_model=args.ollama_model or config.ollama_model,
            image_model_id=args.model_id or config.image_model_id,
        )

    if args.doctor:
        return run_doctor(config)

    if not args.prompt:
        parser.error("prompt is required unless --doctor is used")

    prompt = args.prompt

    if not args.no_enhance:
        from .prompting import expand_prompt

        print("Expanding prompt with Ollama...")
        prompt = expand_prompt(prompt, config, model_override=args.ollama_model)
        print("Expanded prompt:")
        print(prompt)

    if args.expand_only:
        if args.no_enhance:
            print(prompt)
        return 0

    from .generator import generate_image

    output_path = config.output_path(args.output)
    try:
        saved_path = generate_image(
            prompt=prompt,
            output_path=output_path,
            config=config,
            model_id_override=args.model_id,
            seed=args.seed,
            steps=args.steps,
            width=args.width,
            height=args.height,
        )
    except RuntimeError as exc:
        print(f"Error: {exc}")
        return 1

    print(f"Saved image: {saved_path}")
    return 0
