from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from mythos_image_agent.mflux_generator import generate_image_mflux_redux

ROOT = Path(__file__).resolve().parents[1]
SCENARIO = ROOT / "resources" / "neo-seoul"


@dataclass(frozen=True)
class Subject:
    slug: str
    label: str
    faction: str
    reference: Path
    out_dir: Path
    facing: str
    weapon: str
    skill: str


SUBJECTS = [
    Subject(
        "player-noise",
        "The Ghost connector",
        "player",
        SCENARIO / "characters" / "player-noise.png",
        SCENARIO / "characters" / "combat",
        "right",
        "vibro blade",
        "blue signal-step teleport energy",
    ),
    Subject(
        "se-rin",
        "Jung Se-rin",
        "ally",
        SCENARIO / "characters" / "se-rin-biker.png",
        SCENARIO / "characters" / "combat",
        "right",
        "compact cyberpunk carbine rifle firing",
        "cyan covering-noise shield field cast from one hand",
    ),
    Subject(
        "kai",
        "Kai RX-09 android",
        "ally",
        SCENARIO / "characters" / "kai.png",
        SCENARIO / "characters" / "combat",
        "right",
        "heavy overload gauntlet punch",
        "red-blue overload strike energy charging around the arm",
    ),
    Subject(
        "maintenance-drone",
        "Maintenance drone",
        "enemy",
        SCENARIO / "enemies" / "maintenance-drone.png",
        SCENARIO / "enemies" / "combat",
        "left",
        "rusted cutter claw slashing",
        "sparking repair arm overclocked with red warning light",
    ),
    Subject(
        "sentinel-drone",
        "Sentinel drone",
        "enemy",
        SCENARIO / "enemies" / "sentinel-drone.png",
        SCENARIO / "enemies" / "combat",
        "left",
        "red targeting laser firing",
        "red sensor array charging a focused beam",
    ),
    Subject(
        "enforcer-unit",
        "ARK enforcer unit",
        "enemy",
        SCENARIO / "enemies" / "enforcer-unit.png",
        SCENARIO / "enemies" / "combat",
        "left",
        "shock baton swing and tower shield",
        "red riot suppression pulse radiating from shield",
    ),
    Subject(
        "glitch-wraith",
        "Glitch wraith",
        "enemy",
        SCENARIO / "enemies" / "glitch-wraith.png",
        SCENARIO / "enemies" / "combat",
        "left",
        "arc lance energy stab",
        "distorted glitch lightning spell",
    ),
]


def prompt(subject: Subject, pose: str) -> str:
    side = "facing right" if subject.facing == "right" else "facing left"
    base = (
        f"{subject.label}, full body tactical combat portrait, {side}, side-view action pose, "
        "Darkest Dungeon inspired dramatic 2D game art, Y2K cyber-mythic Neo-Seoul, "
        "strong readable silhouette, character centered, head to boots visible, no UI, no text, no border, "
        "dark simple stage background, high contrast neon rim light"
    )
    if subject.slug == "se-rin":
        base += ", no motorcycle, no vehicle, no bike, no helmet, no handlebar"
        if pose == "attack":
            return (
                f"{base}, actively aiming a compact cyberpunk carbine rifle toward the right, "
                "bright muzzle flash, recoil in shoulders, firing stance, both hands on the gun"
            )
        if pose == "skill":
            return (
                f"{base}, one hand projecting a cyan covering-noise shield field, other hand holding "
                "compact rifle low, visible defensive energy barrier, caster pose"
            )
        if pose == "hit":
            return (
                f"{base}, recoiling backward from a red impact blast, one arm raised defensively, "
                "damaged stagger pose, sparks striking leather jacket"
            )
    if pose == "attack":
        return f"{base}, actively attacking with {subject.weapon}, dynamic motion, visible weapon action, impact direction clear"
    if pose == "skill":
        return f"{base}, casting special skill: {subject.skill}, visible magical cybernetic energy effect, defensive or power aura"
    if pose == "hit":
        return f"{base}, being hit and recoiling from impact, damaged stagger pose, red impact sparks, defensive posture broken"
    raise ValueError(pose)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--subjects", nargs="*", default=[s.slug for s in SUBJECTS])
    parser.add_argument("--poses", nargs="*", default=["attack", "skill", "hit"])
    parser.add_argument("--quantize", type=int, default=8)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--strength", type=float, default=0.62)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    wanted = set(args.subjects)
    count = 0
    for subject in SUBJECTS:
        if subject.slug not in wanted:
            continue
        subject.out_dir.mkdir(parents=True, exist_ok=True)
        for pose in args.poses:
            out = subject.out_dir / f"{subject.slug}-{pose}.png"
            generate_image_mflux_redux(
                prompt(subject, pose),
                out,
                reference_path=subject.reference,
                redux_strength=args.strength,
                seed=7200 + count,
                steps=args.steps,
                width=512,
                height=768,
                quantize=args.quantize,
                guidance=0.0,
            )
            print(out.relative_to(ROOT))
            count += 1
            if args.limit and count >= args.limit:
                return


if __name__ == "__main__":
    main()
