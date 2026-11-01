"""Second art pass for DLC 3 after a sheet review (Codex image).

    .venv/bin/python scripts/v2_assets/regen_sea_identity.py [--jobs 5]

Companion cards and story scenes are redrawn with the portrait as a reference, so age and face stay on-model. Act 4 scenes
are redrawn so the harbor outside is dry: the act's premise is a port with no water and no ship afloat.
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate

PORTRAIT = {
    "mujin": "characters/mujin.png",
    "seo_ha": "characters/seo-ha.png",
    "parang": "characters/parang.png",
}
WHO = {
    "mujin": "Mujin, a weathered man in his fifties with short graying hair and an orange work jacket",
    "seo_ha": "Seo-ha, a woman in her sixties with silver hair tied low, deep lines on her face, a dark green rain coat",
    "parang": "Parang, a small child of about ten with short black hair and a worn blue rain jacket",
}
DRY = [
    "hook", "tide_table", "wet_roster", "roster_window", "survivor_allowance", "seized_coat", "supper_seat",
    "ration_scale", "pillow_seam", "compass", "memorial_stone", "export_index", "brake", "salt_wall",
]  # fmt: skip
DRY_NOTE = (
    " IMPORTANT: this harbor has NO WATER. Anything seen outside or behind is a dried-out, cracked harbor basin with rusted "
    "cranes and stranded empty wharves. No sea, no water surface, no floating ships, no reflections of water."
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", type=int, default=5)
    a = ap.parse_args()
    items = json.loads((Path(__file__).resolve().parent / "sea_art.json").read_text())["images"]
    jobs: list[tuple[str, str, list[Path], str]] = []
    for path, v in items.items():
        name = Path(path).stem
        who = next(
            (c for c in PORTRAIT if name.startswith((f"{c}_", f"sea_arc_{c}_"))),
            None,
        )
        if who and (path.startswith(("v2/cards/", "v2/events/"))):
            note = (
                f" The reference image is a portrait of {WHO[who]}. Whenever this person appears, draw the SAME person with "
                "the same face, age and hair; other people in the scene keep their own looks. Natural proportions. No text."
            )
            jobs.append((path, v["prompt"] + note, [RES / PORTRAIT[who]], v["size"]))
    for slug in DRY:
        path = f"v2/events/sea4_ev_{slug}.webp"
        if path in items:
            jobs.append((path, items[path]["prompt"] + DRY_NOTE, [], items[path]["size"]))
    print(len(jobs), "images", flush=True)

    def one(out: str, prompt: str, refs: list[Path], size: str) -> str:
        try:
            return generate(out, prompt, refs=refs, size=size, force=True)
        except Exception as exc:  # the old image stays; a rerun picks this one up
            return f"{out}: FAILED {exc}"

    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for f in as_completed([ex.submit(one, *j) for j in jobs]):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
