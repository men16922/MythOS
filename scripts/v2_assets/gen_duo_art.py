"""Duo ultimate cut-in illustrations: one per pair in content/duos.ts (Codex image).

    .venv/bin/python scripts/v2_assets/gen_duo_art.py [ID ...] [--force]

Writes resources/neo-seoul/v2/ult/duo_<id>.webp (1280x720). Same look as gen_ult_art.py, with both characters in
the centre third so a phone's narrow band still shows them together. Rerun build_manifest.py afterwards.
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate
from gen_ult_art import GOLD, STYLE, TEAL, ULTS

REFS = (
    "the FIRST image is the first character, the SECOND image is the second character; keep both identical, "
    "both are shown together in one scene"
)

# id → (first companion, second companion, how they stand together, scene, glow)
DUOS: dict[str, tuple[str, str, str, str, str]] = {
    "collection": (
        "se_rin",
        "tae_o",
        "A wry smuggler and the stone-faced ex-enforcer who once hunted her, now working the same door.",
        "They stand shoulder to shoulder in a rain-wet corridor: she points ahead with two fingers, he has just set "
        "one heavy shield down, a steel door bent inward in front of them.",
        TEAL,
    ),
    "unlogged_dream": (
        "han",
        "kai",
        "A cocky young hacker and a gentle android sniper who dreams.",
        "On a rooftop at night he kneels beside the sniper with a small laptop glowing on his knee, grinning, while "
        "the android looks calmly down the long rifle.",
        TEAL,
    ),
    "anvil_and_wall": (
        "su_ah",
        "tae_o",
        "A warm-hearted smith patching up a clipped, immovable bodyguard.",
        "In a safehouse workshop she welds the edge of his shield while he stands still, braced, her hand steady on "
        "his shoulder plate.",
        GOLD,
    ),
    "not_for_sale": (
        "lin_yue",
        "kai",
        "A smooth night-market broker and the android she refuses to price.",
        "She flips a single coin beside him on a neon market balcony as he levels his rifle, her smile sharp, his "
        "expression quietly touched.",
        GOLD,
    ),
    "warm_circuit": (
        "han",
        "su_ah",
        "A panicking young hacker and the unflappable smith who forged his gear.",
        "At a workbench he recoils from a sparking handheld rig, eyes wide, while she calmly rests one gloved hand "
        "on it and the sparks settle.",
        GOLD,
    ),
    "burned_ledger": (
        "lin_yue",
        "se_rin",
        "A broker writing off a debt for a smuggler who does not trust the gift.",
        "On a dock at night the broker holds a burning paper ledger over the water, the smuggler watching with her "
        "arms crossed and one raised eyebrow.",
        GOLD,
    ),
    "overdue_reader": (
        "io",
        "miro",
        "A precise librarian AI and the small forgotten reader she finally lets in.",
        "Between tall glass shelves the librarian stamps a card with grave care while the small reader, a child with "
        "a card for a face, holds up a worn book to her.",
        TEAL,
    ),
    "red_ink": (
        "bel",
        "io",
        "A censor who quit and the librarian whose pages she once struck out.",
        "At a long reading desk the former censor lays down her red pen on an open book, and the librarian restores "
        "the struck line with one pale fingertip.",
        TEAL,
    ),
    "night_watch": (
        "rem",
        "se_rin",
        "A masked dream executor who never sleeps, keeping watch over a smuggler who barely trusts them.",
        "In a dim shelter she sits against a wall with her eyes half closed, while the executor stands over her at the door, "
        "mask lifted, perfectly still.",
        TEAL,
    ),
    "how_to_stand": (
        "doyun",
        "tae_o",
        "An ordinary survivor learning from a veteran how to hold his ground.",
        "On a ruined overpass the young man plants his feet behind a battered shield, and the veteran beside him "
        "adjusts his stance with one firm hand, saying nothing.",
        TEAL,
    ),
    "same_dream": (
        "rem",
        "kai",
        "A dream executor and the android who once dreamed the dream he guarded.",
        "They stand back to back in a dark machine hall, faint star points drifting between them, both looking up.",
        TEAL,
    ),
    "undeletable": (
        "bel",
        "han",
        "A censor who quit and a smug hacker whose code outlived her red pen.",
        "At a terminal she holds her red pen to a glowing line that refuses to fade, and he leans on the desk beside "
        "her with a delighted grin.",
        TEAL,
    ),
}


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    jobs = []
    for duo_id, (a, b, trait, scene, glow) in DUOS.items():
        if args and duo_id not in args:
            continue
        refs = [RES / ULTS[a][0], RES / ULTS[b][0]]
        prompt = STYLE.format(refs=REFS, trait=trait, scene=scene, glow=glow)
        jobs.append((f"v2/ult/duo_{duo_id}.webp", prompt, refs))

    def run(job: tuple[str, str, list[Path]]) -> str:
        out, prompt, refs = job
        return generate(out, prompt, refs=refs, size="1280x720", force=force)

    with ThreadPoolExecutor(4) as pool:
        for line in pool.map(run, jobs):
            print(line, flush=True)


if __name__ == "__main__":
    main()
