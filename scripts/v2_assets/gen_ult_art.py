"""Ultimate cut-in illustrations: one per companion ultimate and one per archetype Signal Burst (Codex image).

    .venv/bin/python scripts/v2_assets/gen_ult_art.py [ID ...] [--force]

Writes resources/neo-seoul/v2/ult/<id>.webp (1280x720), where <id> is a companion id or an archetype id. The
cut-in shows the image full width on desktop and as a narrow centre band on a phone, so every prompt keeps the
character in the centre third. Rerun build_manifest.py afterwards.
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES
from gen_codex_image import generate

STYLE = (
    "Ultimate-move splash illustration for a cyberpunk tactics game: a fighting-game super-move cut-in, wide "
    "cinematic 16:9 shot, dynamic low camera angle, foreshortened action pose bursting toward the viewer. Painterly "
    "digital concept art matching the reference character images (the FIRST reference is a close-up portrait for "
    "face and hair, the SECOND a full-body sprite for outfit and props; keep the character identical, but redraw "
    "them in this scene). Scene: {scene} Composition: the character's face and upper body sit in the centre third "
    "of the frame (the image is also shown cropped to a narrow central strip), explosive radiating energy in "
    "{glow}, motion streaks, sparks and debris flying outward, extreme contrast, the outer edges fall into deep "
    "shadow. Style: cinematic painterly concept art, cyberpunk Neo-Seoul noir, rain-slick surfaces, deep navy "
    "shadows, volumetric haze, strong rim light, subtle film grain, high detail. Absolutely no text, no letters, "
    "no numbers, no readable writing, no logos, no watermark, no UI, no frame or border."
)
TEAL = "glowing cyan and electric violet"
GOLD = "blazing gold and hot magenta"

# id → (portrait ref, full-body ref, scene, glow)
ULTS: dict[str, tuple[str, str, str, str]] = {
    "se_rin": (
        "characters/se-rin.png",
        "v2/sprites/se-rin-idle.webp",
        "Se-rin vaults across a rooftop gap mid-air, long black hair and leather jacket whipping back, a huge "
        "translucent hexagon energy shield blooming around her and the silhouettes of her crew, the rain around "
        "them surging backwards like a reversed waterfall.",
        TEAL,
    ),
    "tae_o": (
        "characters/tae-o.png",
        "v2/sprites/tae-o-idle.webp",
        "Tae-o charges shoulder-first behind a massive riot shield, smashing a row of chrome security drones "
        "backwards into a concrete wall that bursts into a spiderweb of cracks, dazed sparks circling the dented "
        "drones, a shockwave ring blasting out from the impact.",
        TEAL,
    ),
    "han": (
        "characters/han.png",
        "v2/sprites/han-idle.webp",
        "Han stands in a storm of floating holographic data streams and trailing cables, both hands on a glowing "
        "hacking deck, dozens of targeting reticles locking onto distant enemy silhouettes, glowing code reflected "
        "in his eyes.",
        TEAL,
    ),
    "su_ah": (
        "characters/su-ah.png",
        "v2/sprites/su-ah-idle.webp",
        "Su-ah swings a glowing forge hammer down onto an anvil, an explosion of violet echo-sparks erupting, two "
        "spectral blades of light forging themselves out of the sparks and plates of light armour assembling "
        "around her.",
        TEAL,
    ),
    "kai": (
        "characters/kai.png",
        "v2/sprites/kai-idle.webp",
        "Kai kneels on a rain-soaked rooftop ledge firing a long rail sniper rifle, a blinding blue beam tearing "
        "across the night, dreamy floating star particles drifting around the white ceramic plating, blue eyes "
        "blazing.",
        TEAL,
    ),
    "lin_yue": (
        "characters/lin-yue.png",
        "v2/sprites/lin-yue-idle.webp",
        "Lin-yue flicks a spinning golden credit chip into the air with a confident smile, a shower of glowing gold "
        "holographic coins exploding around her, her gold hairpin glinting, red night-market lanterns blurred "
        "behind.",
        TEAL,
    ),
    "io": (
        "characters/io-ally.png",
        "v2/sprites/io-ally-idle.webp",
        "Io throws open an enormous ancient book that blazes with light, its pages tearing free and spiralling up "
        "in a vortex around her, glowing shelves of a glass library stretching into the dark behind.",
        TEAL,
    ),
    "miro": (
        "characters/miro.png",
        "v2/sprites/miro-idle.webp",
        "Miro bursts out of a pool of living shadow mid-leap with twin daggers, violet afterimages trailing, three "
        "shadow clones of Miro striking at once from different directions.",
        TEAL,
    ),
    "doyun": (
        "characters/doyun.png",
        "v2/sprites/doyun-idle.webp",
        "Doyun plants both feet and spreads his arms wide, a towering wall of energy erupting in front of him "
        "and absorbing a hail of enemy laser fire, thorn-like shards of light bristling from the barrier.",
        TEAL,
    ),
    "bel": (
        "characters/bel.png",
        "v2/sprites/bel-idle.webp",
        "Bel slashes a huge red pen stroke across the air; the stroke becomes a burning crimson band of light that "
        "corrodes the enemy silhouettes behind it into dripping black redaction bars.",
        TEAL,
    ),
    "rem": (
        "characters/rem-ally.png",
        "v2/sprites/rem-ally-idle.webp",
        "Rem, the porcelain mask pushed up on the head, raises both hands as a vast wave of pale-violet moths and "
        "dream mist sweeps outward, enemy silhouettes frozen mid-motion, rain drops hanging still in the air, "
        "faint concentric clock-like rings of light.",
        TEAL,
    ),
    "ghost": (
        "v2/sprites/ghost-idle.webp",
        "v2/sprites/ghost-attack.webp",
        "The Ghost Signal connector slams a palm onto the street, a black-violet void implosion sphere bursting "
        "out and hurling every enemy outward into walls, cracks in reality splintering through the air.",
        GOLD,
    ),
    "smuggler": (
        "v2/sprites/smuggler-idle.webp",
        "v2/sprites/smuggler-attack.webp",
        "The Data Smuggler raises one hand and hijacks a ring of enemy gun turrets with streaming red holographic "
        "lines, the turrets wrenching around to aim at each other, sparks and glowing credit chips flying.",
        GOLD,
    ),
    "echo_collector": (
        "v2/sprites/echo_collector-idle.webp",
        "v2/sprites/echo_collector-attack.webp",
        "The Echo Collector strides forward with arms open, the warm glowing ghost silhouettes of the dead walking "
        "beside them, a great dome of golden shields closing over the crew, healing light pouring down.",
        GOLD,
    ),
    "archivist": (
        "v2/sprites/archivist-idle.webp",
        "v2/sprites/archivist-attack.webp",
        "The Archivist reads aloud from a colossal floating book, burned pages swirling back together and "
        "restoring themselves as they orbit in a blazing ring, glass library shelves behind.",
        GOLD,
    ),
    "scrapborn": (
        "v2/sprites/scrapborn-idle.webp",
        "v2/sprites/scrapborn-attack.webp",
        "The Scrapborn android stands in the eye of a roaring tornado of scrap metal, bolts and torn panels, "
        "arcs of lightning, shrapnel blasting outward from the storm.",
        GOLD,
    ),
}


def one(uid: str, force: bool) -> str:
    face, body, scene, glow = ULTS[uid]
    prompt = STYLE.format(scene=scene, glow=glow)
    return generate(f"v2/ult/{uid}.webp", prompt, [RES / face, RES / body], "1280x720", force)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    ids = args or list(ULTS)
    bad = [i for i in ids if i not in ULTS]
    if bad:
        print(f"unknown ids: {bad}")
        return 2
    with ThreadPoolExecutor(4) as ex:
        lines = list(ex.map(lambda i: one(i, force), ids))
    for line in lines:
        print(line, flush=True)
    return 1 if any(line.endswith("FAILED") for line in lines) else 0


if __name__ == "__main__":
    raise SystemExit(main())
