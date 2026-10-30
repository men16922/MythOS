"""Evolved card art: one per recipe in content/evolutions.ts (Codex image), built on the base card's illustration.

    .venv/bin/python scripts/v2_assets/gen_evolved_cards.py [ID ...] [--force]

Writes resources/neo-seoul/v2/cards/<id>.webp (600x800). Rerun build_manifest.py afterwards.
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate

PROMPT = (
    "Card illustration for a cyberpunk tactics game, vertical 3:4. The attached image is the ordinary version of this "
    "card: keep its painterly style, palette and subject, and redraw it as its evolved, unmistakably more dangerous "
    "form. Now: {what}. One clear focal action, eye-level, natural proportions, dark background, restrained glow in "
    "gold and crimson marking it as evolved. Absolutely no text, no letters, no numbers, no logos, no UI, no frame."
)

# id → (base card, what changed)
CARDS: dict[str, tuple[str, str]] = {
    "wall_breaker": (
        "shove",
        "a shove so hard the figure's target smashes through a cracked concrete wall",
    ),
    "locked_shot": (
        "packet_shot",
        "the shot leaves a burning lock-on reticle ring around the target point",
    ),
    "noise_curtain": (
        "covering_noise",
        "the noise shield grows into a tall rippling curtain of static",
    ),
    "triple_tap": ("double_tap", "three muzzle flashes hang in the air in a tight line"),
    "acid_incendiary": (
        "incendiary_round",
        "the round bursts in green acid and orange flame together",
    ),
    "iron_stance": (
        "brace",
        "the figure stands planted in heavy plating with short metal spines on the guard",
    ),
    "flurry": ("jab", "the fist blurs into several overlapping afterimages"),
    "artery_open": ("artery_rip", "a thin curved blade leaves a long crimson arc in the air"),
    "overtuned_laser": (
        "target_laser",
        "a hooded operative aims a handheld targeting laser that overloads into a thick beam, sparks at the emitter",
    ),
    "phantom_step": (
        "smoke_step",
        "the figure steps out of a line of pale afterimages in the smoke",
    ),
    "heart_overload": (
        "overload_strike",
        "the striking arm glows from an overheating mechanical reactor core in the chest, round and industrial, not a heart symbol",
    ),
    "cover_fire": (
        "suppressing_fire",
        "a wide fan of tracer fire passes over allied silhouettes crouched behind it",
    ),
}


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv

    def run(card_id: str) -> str:
        base, what = CARDS[card_id]
        refs: list[Path] = [RES / "v2" / "cards" / f"{base}.webp"]
        return generate(
            f"v2/cards/{card_id}.webp",
            PROMPT.format(what=what),
            refs=refs,
            size="600x800",
            force=force,
        )

    with ThreadPoolExecutor(4) as pool:
        for line in pool.map(run, args or list(CARDS)):
            print(line, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
