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
    "Signature-move illustration for a cyberpunk tactics game, shown as a wide cut-in when the character uses "
    "their ultimate. Wide cinematic 16:9 shot, eye-level or slightly low camera, medium-full shot (head to knees) "
    "with natural, anatomically correct proportions: no fisheye, no wide-angle distortion, no oversized hands or "
    "feet reaching at the camera. Painterly digital concept art matching the reference images ({refs}; keep the "
    "character identical, but redraw them in this scene). The pose and expression show who this character is: "
    "{trait} Scene: {scene} Composition: the character's face and upper body sit in the centre third of the frame "
    "(the image is also shown cropped to a narrow central strip); one clear signature effect in {glow}, restrained "
    "and readable, only a few sparks, no debris storm, calm dark space around the figure. Style: cinematic "
    "painterly concept art, cyberpunk Neo-Seoul noir, rain-slick surfaces, deep navy shadows, soft volumetric "
    "haze, rim light, subtle film grain, high detail. Absolutely no text, no letters, no numbers, no readable "
    "writing, no logos, no watermark, no UI, no frame or border."
)
TEAL = "soft cyan and violet light"
GOLD = "warm gold and magenta light"
COMPANION_REFS = "the FIRST is a close-up portrait for face and hair, the SECOND a full-body sprite for outfit and props"
ARCHETYPE_REFS = "two full-body sprites of the same character, for face, outfit and props"

# id → (first ref, second ref, trait, scene, glow)
ULTS: dict[str, tuple[str, str, str, str, str]] = {
    "se_rin": (
        "characters/se-rin.png",
        "v2/sprites/se-rin-idle.webp",
        "Se-rin, called Water Spider, a nimble smuggler who never learned how to sink: quick, wry, fiercely loyal, "
        "always the one who finds the way out.",
        "She runs along the edge of a flooded neon underpass, glancing back over her shoulder with a wry grin, one "
        "hand thrown back toward her crew; a thin rippling shield like a skin of water arcs over them, neon "
        "reflections on the water.",
        TEAL,
    ),
    "tae_o": (
        "characters/tae-o.png",
        "v2/sprites/tae-o-idle.webp",
        "Tae-o, called The Hound, a scarred deserter enforcer carrying old guilt: heavy, immovable, holding the line "
        "to the end.",
        "He braces behind a battered riot shield and drives it forward with his shoulder, boots planted, knocking a "
        "security drone back into a cracked concrete wall; his scarred face is grim and calm.",
        TEAL,
    ),
    "han": (
        "characters/han.png",
        "v2/sprites/han-idle.webp",
        "Han, called Signal Breaker, an unplugged hacker who never jacks in: cocky, playful, breaking in from the "
        "outside.",
        "He crouches on a rooftop air-conditioning unit with a battered handheld deck wired by one cable into a city "
        "junction box, a sly grin, a few thin cyan target outlines lighting up on distant enemy silhouettes.",
        TEAL,
    ),
    "su_ah": (
        "characters/su-ah.png",
        "v2/sprites/su-ah-idle.webp",
        "Su-ah, called Memory Smith, an engineer who hammers memories like iron: focused, warm, proud of her craft.",
        "In a cramped workshop she brings a forge hammer down on a small anvil, her thin glasses catching the "
        "light, a spray of violet sparks shaping two slim glowing blades on the anvil.",
        TEAL,
    ),
    "kai": (
        "characters/kai.png",
        "v2/sprites/kai-idle.webp",
        "Kai, a discarded android that started to dream: gentle, quiet, choosing for itself.",
        "Kai kneels on a rain-soaked rooftop ledge and aims a long rail rifle, calm and still, a single thin blue "
        "beam crossing the night, a few faint dream-like star motes drifting around.",
        TEAL,
    ),
    "lin_yue": (
        "characters/lin-yue.png",
        "v2/sprites/lin-yue-idle.webp",
        "Lin-yue, called The Exchanger, a poised night-market broker who says nothing is free: cool, elegant, "
        "wearing her late mother's gold hairpin.",
        "At a lantern-lit market stall she flicks a single gold credit chip into the air with a knowing half-smile, "
        "a few glowing blank contract slips fanned out on the table before her.",
        TEAL,
    ),
    "io": (
        "characters/io-ally.png",
        "v2/sprites/io-ally-idle.webp",
        "Io, The Glass Librarian, a librarian AI: precise and formal, secretly tender.",
        "Between tall glass bookshelves she opens a large luminous book with both hands, a few glowing pages lifting "
        "gently from it, her composed face lit from below.",
        TEAL,
    ),
    "miro": (
        "characters/miro.png",
        "v2/sprites/miro-idle.webp",
        "Miro, The Forgotten Reader, a small quiet scout nobody remembers, slipping through shadows.",
        "Miro steps out of a deep shadow behind a lone enemy guard, a short blade held low, one finger to the lips, "
        "a faint violet afterimage trailing behind.",
        TEAL,
    ),
    "doyun": (
        "characters/doyun.png",
        "v2/sprites/doyun-idle.webp",
        "Doyun, The Name Off the List, an ordinary young survivor in a worn jacket, ordinary build, not a soldier: "
        "he does not know how to fight, but he knows how to stand; frightened but resolute.",
        "In the rain he stands in front of the viewer with his arms spread wide and his feet planted, a strapless "
        "worn bag at his side, a soft wall of amber light forming in front of him as enemy laser bolts splash "
        "against it. Leave clear headroom: his whole head sits well below the top edge of the frame.",
        TEAL,
    ),
    "bel": (
        "characters/bel.png",
        "v2/sprites/bel-idle.webp",
        "Bel, The Censor Who Quit, a sharp-eyed former censor with a red pen: dry, sardonic, tired of cutting other "
        "people's sentences.",
        "Bel draws one long stroke through the air with a red pen; the stroke hangs as a glowing crimson line that "
        "slices across a row of enemy silhouettes, leaving them covered in black redaction bars.",
        TEAL,
    ),
    "rem": (
        "characters/rem-ally.png",
        "v2/sprites/rem-ally-idle.webp",
        "Rem, The Executor Who Woke, who used to switch off machines' dreams: soft-spoken, sleepless, protective.",
        "Rem, the porcelain mask pushed up on the head, raises one open hand; a hush of pale-violet moths spreads "
        "outward, and the enemy silhouettes and raindrops around them hang frozen in mid-air.",
        TEAL,
    ),
    "ghost": (
        "v2/sprites/ghost-idle.webp",
        "v2/sprites/ghost-attack.webp",
        "the Ghost Signal, a connector erased from the network: silent, cold, appearing where nobody looks.",
        "The hooded connector crouches low and presses one palm to the wet street; a dark violet void sphere "
        "implodes out of the ground and shoves the surrounding enemies outward.",
        GOLD,
    ),
    "smuggler": (
        "v2/sprites/smuggler-idle.webp",
        "v2/sprites/smuggler-attack.webp",
        "the Data Smuggler, a black-market hacker: flashy, greedy, grinning, turning enemy guns on each other.",
        "The smuggler holds up a wrist deck with a cocky grin; red hijack lines leap to two enemy turrets that "
        "swivel to aim at each other, a few credit chips spinning in the air.",
        GOLD,
    ),
    "echo_collector": (
        "v2/sprites/echo_collector-idle.webp",
        "v2/sprites/echo_collector-attack.webp",
        "the Echo Collector, who keeps the memories of the dead: solemn, gentle, holding the crew together.",
        "The collector stands with arms open, faint warm silhouettes of the dead standing beside them, a soft "
        "golden dome of light closing over the crew.",
        GOLD,
    ),
    "archivist": (
        "v2/sprites/archivist-idle.webp",
        "v2/sprites/archivist-attack.webp",
        "the Archivist, who woke in the Glass Library: scholarly, deliberate, quietly intense.",
        "The archivist reads aloud from a large floating book, burned pages drifting back together and returning to "
        "it in a slow ring.",
        GOLD,
    ),
    "scrapborn": (
        "v2/sprites/scrapborn-idle.webp",
        "v2/sprites/scrapborn-attack.webp",
        "the Scrapborn, a discarded android patched together from junk that started to dream: rugged, resourceful.",
        "The scrapborn raises one hand as a slow whirl of scrap plates and bolts orbits around them, small arcs of "
        "lightning jumping between the pieces.",
        GOLD,
    ),
}


def one(uid: str, force: bool) -> str:
    first, second, trait, scene, glow = ULTS[uid]
    refs = COMPANION_REFS if first.startswith("characters/") else ARCHETYPE_REFS
    prompt = STYLE.format(refs=refs, trait=trait, scene=scene, glow=glow)
    return generate(f"v2/ult/{uid}.webp", prompt, [RES / first, RES / second], "1280x720", force)


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
