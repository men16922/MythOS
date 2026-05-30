"""Re-render an image from a reference + prompt (FLUX img2img on MPS).

Keeps a character/scene recognizable across new poses or settings.

Examples:
    .venv/bin/python scripts/img2img.py \
        --reference resources/neo-seoul/characters/se-rin.png \
        --prompt "the same woman in a warm underground refuge, gentle smile" \
        --out resources/neo-seoul/characters/variants/se-rin-refuge.png \
        --strength 0.55

Lower --strength keeps the reference (identity) more; higher allows more change.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from mythos_image_agent.config import AgentConfig  # noqa: E402
from mythos_image_agent.img2img import generate_image_img2img  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--strength", type=float, default=0.6)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=8)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    args = parser.parse_args(argv)

    out = generate_image_img2img(
        reference_path=args.reference,
        prompt=args.prompt,
        output_path=args.out,
        config=AgentConfig(),
        strength=args.strength,
        seed=args.seed,
        steps=args.steps,
        width=args.width,
        height=args.height,
    )
    print(f"saved {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
