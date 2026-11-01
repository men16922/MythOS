"""Boss splashes and cut-ins of DLC 3, redrawn from the characters' own portraits and sprites (Codex image).

    .venv/bin/python scripts/v2_assets/regen_sea_key_art.py [--jobs 4]

Boss splashes need a real place around the figure; cut-ins follow gen_ult_art.py's look so faces match the portraits.
Rerun build_manifest.py afterwards.
"""

from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate
from gen_ult_art import COMPANION_REFS, STYLE, TEAL

PLACE = {
    "sea4": "the dried-out floor of a forgotten Korean harbor at night, cracked mud, rusted cranes and stacked containers rising behind, sodium work lights",
    "sea5": "a flooded reclaimed-land street at dusk, gray water to the knees, half-drowned houses and a leaning barge behind, overcast light",
    "sea6": "a steel causeway far out at sea in thick fog, a distant lighthouse beam crossing the sky, dark water on both sides",
}
BOSSES = {
    "sea4_b_foreman_crane": ("sea-foreman-crane", "It looms over the harbor floor, hook swinging."),
    "sea4_b_commissioner_gong": (
        "sea-commissioner-gong",
        "He stands alone among seized crates, holding sealed papers, unhurried and polite.",
    ),
    "sea4_b_container_king": ("sea-container-king", "It rises from a wall of stacked containers."),
    "sea5_b_rust_whale": (
        "sea-rust-whale",
        "It heaves up out of the gray water between the houses.",
    ),
    "sea5_b_buoy_queen": ("sea-buoy-queen", "She rides the swell surrounded by tolling buoys."),
    "sea5_b_surge_eater": (
        "sea-surge-eater",
        "It wades forward, water running off it, swallowing the tide.",
    ),
    "sea6_b_foghorn": (
        "sea-foghorn",
        "The huge horn sits bolted to the causeway, attended by small kneeling keepers.",
    ),
    "sea6_b_lens_saint": (
        "sea-lens-saint",
        "The saint stands in the path of the beam, cradling a great lens.",
    ),
    "sea6_b_lightkeeper": (
        "sea-lightkeeper",
        "A tired, kindly figure at the foot of the lighthouse stairs, one hand raised, as if asking you to stop.",
    ),
    "sea6_b_unwritten": (
        "sea-unwritten",
        "A figure of water and overlapping faces stands up out of the sea itself.",
    ),
}
PEOPLE = {
    "mujin": (
        "characters/mujin.png",
        "v2/sprites/mujin-idle.webp",
        "Mujin, a crane foreman in his fifties who wastes no words: heavy, patient, unbreakable.",
        "He plants his boots on a wet wharf and hauls a rusted crane hook on its chain with both hands, jaw set, a steel container swinging down behind him.",
    ),
    "seo_ha": (
        "characters/seo-ha.png",
        "v2/sprites/seo-ha-idle.webp",
        "Seo-ha, a retired harbor pilot in her sixties with silver hair: warm, dry, certain of the water.",
        "She stands at the end of a pier with one arm raised, calmly reading the water and directing her crew, a thin line of pale water parting around their feet.",
    ),
    "parang": (
        "characters/parang.png",
        "v2/sprites/parang-idle.webp",
        "Parang, a child pulled from the tide with no record: quiet, unreadable, speaking in borrowed memories.",
        "The child stands ankle-deep in gray water with one small hand raised, faint pale faces drifting in the water around them, gaze steady.",
    ),
    "navigator": (
        "characters/navigator.png",
        "v2/sprites/navigator-idle.webp",
        "The Navigator, a young connector in a harness and storm coat: careful, always one move ahead.",
        "They look up from an old tide chart spread on a rail, one hand turning a brass compass, a faint ring of ripples running backwards around their boots.",
    ),
}
DUOS = {
    "duo_hook_and_hound": (
        ["characters/mujin.png", "characters/tae-o.png"],
        "Mujin and Tae-o side by side: the older crane foreman hauls a chain while the scarred deserter braces his riot shield against what it drags in.",
    ),
    "duo_soundings": (
        ["characters/seo-ha.png", "characters/se-rin.png"],
        "Seo-ha and Se-rin on a flooded pier: the silver-haired pilot points out the channel and the young smuggler runs along it, glancing back with a grin.",
    ),
    "duo_lullaby": (
        ["characters/parang.png", "characters/rem-ally.png"],
        "Parang and Rem sitting on a wet step: the child leans against the drowsy former dream executor, both looking at a small glow on the water.",
    ),
}
NOTEXT = (
    "Absolutely no text, no letters, no numbers, no logos, no watermark, no UI, no frame or border."
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--duos", nargs="*", default=None, help="real duo file stems, in DUOS order")
    a = ap.parse_args()
    jobs = []
    for enc, (sprite, what) in BOSSES.items():
        prompt = (
            "Wide cinematic boss reveal illustration for a cyberpunk tactics game. The reference image is this boss's "
            f"combat sprite: draw the SAME figure, same design and colours, whole figure in frame with space above it, "
            f"set in a full painted environment, never a studio backdrop or a plain background. Place: {PLACE[enc[:4]]}. "
            f"{what} Eye-level or slightly low camera, natural proportions, one restrained light effect. Painterly "
            f"cinematic concept art, rain-slick surfaces, deep shadows, soft haze, film grain. {NOTEXT}"
        )
        jobs.append(
            (f"v2/boss/{enc}.webp", prompt, [RES / f"v2/sprites/{sprite}-idle.webp"], "1920x1080")
        )
    for pid, (face, body, trait, scene) in PEOPLE.items():
        prompt = STYLE.format(refs=COMPANION_REFS, trait=trait, scene=scene, glow=TEAL)
        jobs.append((f"v2/ult/{pid}.webp", prompt, [RES / face, RES / body], "1280x720"))
    stems = a.duos or list(DUOS)
    for stem, (refs, scene) in zip(stems, DUOS.values(), strict=False):
        prompt = STYLE.format(
            refs="close-up portraits of the two characters, one each",
            trait="Two people who trust each other.",
            scene=scene + " Both faces sit in the centre third.",
            glow=TEAL,
        )
        jobs.append((f"v2/ult/{stem}.webp", prompt, [RES / r for r in refs], "1280x720"))
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        futs = [ex.submit(generate, o, p, refs=r, size=s, force=True) for o, p, r, s in jobs]
        for f in as_completed(futs):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
