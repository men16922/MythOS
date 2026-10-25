"""Mythos 2.0 combat-sprite specs (bosses, Connector archetypes, elite variants).

Each sprite key gets a set of poses rendered by Codex image generation (gen.py), post-processed into
resources/neo-seoul/v2/sprites/<key>-<pose>.webp (process.py) and listed in
src/mythos_ui/src/v2/ui/common/spriteManifest.ts (build_manifest.py).

Pose order matters: `idle` is generated first from text (+ an optional style/identity reference), every
other pose uses the idle raw as its `-i` reference so the design stays on-model.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
RES = ROOT / "resources" / "neo-seoul"
OUT_DIR = RES / "v2" / "sprites"
RAW_DIR = Path(
    os.getenv(
        "V2_SPRITES_RAW", str(Path.home() / ".cache" / "mythos_v2_assets" / "raw" / "sprites")
    )
)
MANIFEST_TS = ROOT / "src" / "mythos_ui" / "src" / "v2" / "ui" / "common" / "spriteManifest.ts"

STYLE = (
    "Style: painterly game concept-art rendering, cyberpunk Neo-Seoul, strong teal/cyan rim light with magenta "
    "accents, crisp readable silhouette at small size, high detail. Absolutely NO text, letters, numbers, logos, "
    "watermark, UI, frame, floor, ground plane, cast shadow or shadow plate."
)

ENEMY_POSES = {
    "attack": "now in a dynamic ATTACK pose lunging/striking toward the LEFT edge of the frame, weapon or claws "
    "thrust forward, a compact burst of energy at the point of impact kept close to the body",
    "hit": "now in a HIT-REACTION pose: recoiling backward toward the right, staggered and off balance, sparks "
    "and small glitch fragments flying off the body, damaged and in pain",
}
PARTY_POSES = {
    "attack": "now in a dynamic ATTACK pose lunging/striking toward the RIGHT edge of the frame, weapon thrust "
    "forward, a compact burst of energy at the point of impact kept close to the body",
    "hit": "now in a HIT-REACTION pose: recoiling backward toward the left, staggered and off balance, wincing, "
    "small sparks flying",
    "guard": "now in a defensive GUARD stance: knees bent, braced, forearm raised, a translucent cyan hexagonal "
    "energy shield projected in front of the body on the right side",
}


@dataclass(frozen=True)
class Sprite:
    key: str
    kind: str  # boss | party | elite | enemy (normal/minion variant) | neutral (encounter hostage, faces RIGHT)
    subject: str  # who/what (idle prompt)
    size: str = "1024x1536"  # codex canvas (WxH)
    idle_ref: str | None = None  # optional reference image (repo-relative) for the idle generation
    idle_ref_note: str = ""  # how to use the idle reference
    # identity references appended to EVERY pose (e.g. a companion portrait); the pose prompt says so
    extra_refs: tuple[str, ...] = ()
    poses: dict[str, str] = field(default_factory=dict)  # pose -> pose description (non-idle)
    enemy_ids: tuple[str, ...] = ()
    archetype_ids: tuple[str, ...] = ()

    @property
    def facing(self) -> str:
        return "right" if self.kind in ("party", "neutral") else "left"

    @property
    def canvas(self) -> tuple[int, int]:
        return (768, 768) if self.kind == "boss" else (512, 768)

    @property
    def all_poses(self) -> list[str]:
        return ["idle", *self.poses]


def _enemy_poses(**override: str) -> dict[str, str]:
    return {**ENEMY_POSES, **override}


def _party_poses(**override: str) -> dict[str, str]:
    return {**PARTY_POSES, **override}


CONNECTOR_NOTE = (
    "The reference image shows the Connector, the protagonist (a young Korean man, short black hair, black "
    "face mask, lean build). Keep the SAME person (face, hair, mask, build) and the same painterly rendering, "
    "but re-dress him in this new loadout."
)

COMPANION_NOTE = (
    "Reference images: the FIRST is this character's old full-body combat sprite (outfit, weapon, build, "
    "signature colours); the SECOND is a close-up portrait (face, hair). Draw the SAME character — identical "
    "face, hairstyle, outfit and signature colours — as a fresh full-body combat sprite in the rendering style "
    "below, turned to face RIGHT."
)

SPLASH_NOTE = (
    "The reference image is this boss's splash art. Draw the SAME machine (same design, armour, silhouette and "
    "colours) as a clean full-body combat sprite, isolated with no background."
)

STYLE_ONLY_NOTE = (
    "The reference image is another enemy from the same faction: use it ONLY for the rendering style and "
    "design language (materials, colours, line quality) — draw a completely NEW, different creature/machine."
)

ARK_NOTE = (
    "The reference image is another act-3 ARK unit: match its rendering style and white ARK livery (white "
    "ceramic, black joints, red accents), but draw a completely NEW, different unit."
)

GLASS_NOTE = (
    "The reference image is an enemy from an earlier act: use it ONLY for the rendering style (painterly "
    "detail, line quality, rim light) — draw a completely NEW, different design from the act-4 Glass Library "
    "Censorate: a crystalline memory-archive library whose materials are frosted and clear glass, white "
    "porcelain, black ink, paper pages and antique brass, lit by cold white light with ice-blue glints."
)
GLASS_SPLASH_NOTE = (
    "The reference image is this boss's splash art. Draw the SAME figure (same design, materials, silhouette "
    "and colours) as a clean full-body combat sprite, isolated with no background, no floor and no scenery."
)

MACHINE_NOTE = (
    "The reference image is an enemy from an earlier act: use it ONLY for the rendering style (painterly detail, "
    "line quality, rim light) — draw a completely NEW, different design from the act-5 Scrap Legion of the android "
    "graveyard (Dreaming Machines): discarded machines that patch themselves from salvage — rusted iron, oil-black "
    "steel, dented mismatched panels, frayed cables, wet from rain, lit by sodium-amber work lamps, with faint "
    "dreamlike violet/pale-blue static glimmers because these machines dream."
)
MACHINE_SPLASH_NOTE = GLASS_SPLASH_NOTE

ORIGIN_NOTE = (
    "The reference image is an enemy from an earlier act: use it ONLY for the rendering style (painterly detail, "
    "line quality, rim light) — draw a completely NEW, different design from act 6, the First Record: the Origin "
    "Code beneath the Spire, MythOS's core where the whole world is written as TEXT. Its beings are made of glossy "
    "ink-black lacquer and paper-white parchment/porcelain, traced with glowing glyph strokes (abstract, illegible "
    "code-like marks — never readable letters or numbers), lit by a blinking amber text-cursor light with faint "
    "cyan highlights."
)
ORIGIN_SPLASH_NOTE = GLASS_SPLASH_NOTE

SPRITES: list[Sprite] = [
    # ------------------------------------------------------------------ bosses (face LEFT)
    Sprite(
        key="haetae",
        kind="boss",
        size="1536x1024",
        subject="HAETAE, the act-1 boss: a suppression tank shaped like the mythical Korean haetae lion-dog — "
        "a massive armoured quadruped riot tank with a carved stone-and-steel curly mane, glowing red eyes, "
        "heavy plated shoulders and huge clawed feet",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: rearing forward with its jaws wide open, a compact blast of "
            "white-hot red energy erupting from its mouth, front claws raised to stomp",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, armour plates cracked and "
            "sparking, head jolted aside, small debris and sparks flying",
        ),
        enemy_ids=("haetae",),
    ),
    Sprite(
        key="echo_eater",
        kind="boss",
        subject="the ECHO EATER, the act-2 boss: a towering glitching wraith built from corrupted memories and "
        "torn holograms — a tall hooded spectral body of shredded translucent hologram ribbons, flickering "
        "fragments of faces and old photos caught inside it, long clawed hands, a gaping glowing maw, "
        "magenta/violet glitch distortion and pixel tearing along its edges, hovering slightly",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward, maw stretched open and one huge clawed hand "
            "reaching out to devour, a compact swirl of magenta memory fragments pulled toward its mouth",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, its body fracturing into "
            "scattering hologram shards and heavy glitch tearing, writhing in pain",
        ),
        enemy_ids=("echo_eater",),
    ),
    Sprite(
        key="ix_avatar",
        kind="boss",
        subject="the combat avatar of ADMINISTRATOR IX, the final boss AI: a floating, perfectly symmetrical "
        "crystalline glass entity, tall humanoid-angelic silhouette of faceted translucent glass plates, "
        "concentric rings of cold white-cyan light orbiting around it, a single glowing RED core in the centre "
        "of its chest, no face, hovering above the ground",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: one crystalline arm extended forward firing a compact focused "
            "beam of white-red light from an open palm, the light rings tilted and spinning faster, red core "
            "blazing",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, glass plates cracking and "
            "splintering, light rings broken and flickering, red core flaring, shards flying",
        ),
        enemy_ids=("administrator_ix",),
    ),
    # ------------------------------------------------------------------ Connector archetypes (face RIGHT)
    Sprite(
        key="ghost",
        kind="party",
        idle_ref="resources/neo-seoul/characters/combat/player-noise-idle.png",
        idle_ref_note=CONNECTOR_NOTE,
        subject="the Connector as GHOST SIGNAL, a hooded stealth runner: hood up, matte-black fitted stealth "
        "techwear with light armour plates, a thin glowing cyan visor band across his eyes over the black face "
        "mask, a short blink-emitter blade at the forearm, light-footed agile stance",
        poses=_party_poses(),
        archetype_ids=("ghost",),
    ),
    Sprite(
        key="smuggler",
        kind="party",
        idle_ref="resources/neo-seoul/characters/combat/player-noise-idle.png",
        idle_ref_note=CONNECTOR_NOTE,
        subject="the Connector as DATA SMUGGLER, a black-market data courier: long dark charcoal coat with "
        "gold trim accents, a harness of coiled data cables across the chest and back, a hard-shell data-drive "
        "briefcase with gold fittings and a glowing cyan port, a wrist deck, a compact pistol holstered",
        poses=_party_poses(
            attack="now in a dynamic ATTACK pose toward the RIGHT edge of the frame: firing a compact pistol "
            "while a cyan hacking pulse arcs from his wrist deck, briefcase swung behind him",
        ),
        archetype_ids=("smuggler",),
    ),
    Sprite(
        key="echo_collector",
        kind="party",
        idle_ref="resources/neo-seoul/characters/combat/player-noise-idle.png",
        idle_ref_note=CONNECTOR_NOTE,
        subject="the Connector as ECHO COLLECTOR, a memory keeper: layered dark grey and deep-teal cloth robes "
        "and a long scarf over black techwear, a few warm amber glowing memory shards (small crystal fragments) "
        "floating around his hands and shoulders, calm protective stance",
        poses=_party_poses(
            attack="now in an ATTACK pose toward the RIGHT edge of the frame: one hand thrust forward hurling "
            "a cluster of glowing amber memory shards like a compact burst, robes flaring",
            guard="now in a defensive GUARD stance: braced, both hands raised, the amber memory shards locked "
            "together into a translucent amber-and-cyan hexagonal shield in front of him on the right side",
        ),
        archetype_ids=("echo_collector",),
    ),
    # R7e archetypes (content/packs/new_archetypes): same Connector reference and pose set as the base three.
    Sprite(
        key="archivist",
        kind="party",
        idle_ref="resources/neo-seoul/characters/combat/player-noise-idle.png",
        idle_ref_note=CONNECTOR_NOTE,
        subject="the Connector as ARCHIVIST, a quiet intellectual who woke in the Glass Library: a long layered "
        "charcoal-and-ivory archive coat with antique-brass clasps over black techwear, paper slips and blank "
        "index cards tucked into a bandolier across the chest, several small glowing cyan index tabs clipped to "
        "the coat edges, holding a thick lantern-like data book whose open pages glow soft white-gold, calm "
        "composed stance",
        poses=_party_poses(
            attack="now in an ATTACK pose toward the RIGHT edge of the frame: holding the glowing data book open "
            "and thrusting the other hand forward, a compact straight beam of white-gold index light shooting "
            "from the pages, blank slips fluttering",
            guard="now in a defensive GUARD stance: braced, the data book raised open, its glowing pages "
            "projecting a translucent cyan hexagonal shield in front of him on the right side, slips swirling",
        ),
        archetype_ids=("archivist",),
    ),
    Sprite(
        key="scrapborn",
        kind="party",
        idle_ref="resources/neo-seoul/characters/combat/player-noise-idle.png",
        idle_ref_note="The reference image shows the Connector, the protagonist of this game. Use it for the "
        "rendering style, proportions and silhouette language, but this loadout is a discarded ANDROID, not a "
        "human: keep a matte-black lower faceplate that echoes the Connector's black face mask.",
        subject="SCRAPBORN, a discarded android that began to dream: a heavy, sturdy humanoid frame patched "
        "together from mismatched rusted and gunmetal scrap plates, bright welding-seam scars, bundles of frayed "
        "cables at the joints and spine, a cracked pale ceramic upper face with gentle softly glowing amber eyes "
        "above a matte-black lower faceplate, a chunky industrial rivet gun in the right hand, a scrap-metal "
        "plate strapped to the left forearm, a faint violet dream-static glimmer at the chest seam, steady "
        "planted stance",
        poses=_party_poses(
            attack="now in an ATTACK pose toward the RIGHT edge of the frame: firing the rivet gun forward, a "
            "compact burst of sparks and a glowing hot rivet at the muzzle, braced wide stance",
            guard="now in a defensive GUARD stance: knees bent, braced behind the raised scrap-plate forearm, a "
            "translucent cyan hexagonal energy shield projected in front of it on the right side",
        ),
        archetype_ids=("scrapborn",),
    ),
    # ------------------------------------------------------------------ elite variants (face LEFT)
    Sprite(
        key="enforcer-elite",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/enforcer-unit-idle.png",
        idle_ref_note="The reference image is the base ENFORCER riot unit. Draw its ELITE upgraded variant: "
        "clearly the same faction and design language, but bigger and bulkier.",
        subject="the ELITE ENFORCER: an upgraded heavy riot enforcer in black power armour with extra plated "
        "pauldrons and a tall reinforced riot shield, an oversized crackling shock baton, glowing magenta-red "
        "visor and magenta accent stripes",
        poses=_enemy_poses(),
        enemy_ids=("enforcer_unit",),
    ),
    Sprite(
        key="brood-mother",
        kind="elite",
        size="1536x1024",
        idle_ref="resources/neo-seoul/enemies/combat/tracker-spider-idle.png",
        idle_ref_note="The reference image is the base TRACKER SPIDER robot. Draw its ELITE variant: clearly the "
        "same rusty robotic design language, but far bigger and more menacing.",
        subject="the BROOD MOTHER: a huge armoured mother spider-robot, bloated egg-sac abdomen with glowing "
        "acid-green pods, long jagged legs, clustered red sensor eyes, dripping toxic green acid, magenta "
        "accent lights",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: rearing up on its hind legs, front legs raised to strike, "
            "spitting a compact glob of glowing green acid",
        ),
        enemy_ids=("spider_matriarch",),
    ),
    Sprite(
        key="glitch-reaver",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/glitch-wraith-idle.png",
        idle_ref_note="The reference image is the base GLITCH WRAITH. Draw its ELITE variant: clearly the same "
        "spectral glitch design language, but bigger, more aggressive and armoured.",
        subject="the GLITCH REAVER: a hulking spectral glitch predator with long scythe-like data claws, "
        "fragments of black armour plating floating around its torso, a hood with a single burning magenta "
        "eye, violet/cyan pixel-tearing along its edges, hovering",
        poses=_enemy_poses(),
        enemy_ids=("glitch_reaver",),
    ),
    Sprite(
        key="trooper-captain",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/shock-trooper-idle.png",
        idle_ref_note="The reference image is the base SHOCK TROOPER. Draw its ELITE officer variant: clearly "
        "the same faction and armour design language, but heavier and more commanding.",
        subject="the TROOPER CAPTAIN: a shock-trooper officer in heavier black tactical armour with a short "
        "command cape, gold-and-magenta rank stripes, a glowing red visor, a heavy rifle with an underslung "
        "breach-charge launcher, a shoulder-mounted command antenna",
        poses=_enemy_poses(),
        enemy_ids=("trooper_captain",),
    ),
    Sprite(
        key="purge-seraph",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/purge-drone-idle.png",
        idle_ref_note="The reference image is the base PURGE DRONE. Draw its ELITE act-3 variant: clearly the "
        "same burner-drone design language, but a much bigger, pristine, angelic war machine.",
        subject="the PURGE SERAPH: a large hovering incinerator drone styled like a mechanical seraph — a white "
        "and dark-steel armoured core with a glowing furnace eye, six blade-like wing panels fanned out around "
        "it, a halo ring of flame jets, white-gold holy fire licking from its vents",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: wings flared forward, unleashing a compact cone of white-gold "
            "holy fire from its furnace eye",
        ),
        enemy_ids=("purge_seraph",),
    ),
    Sprite(
        key="aegis-drone",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/sentinel-drone-idle.png",
        idle_ref_note="The reference image is the base SENTINEL DRONE. Draw its ELITE act-3 ARK variant: clearly "
        "the same drone design language, but larger, armoured and shielded.",
        subject="the AEGIS DRONE: a large armoured ARK security drone in white ceramic and black plating with "
        "a central cyan sensor eye, two big hexagonal shield-emitter wings projecting a faint translucent cyan "
        "barrier dome around it, a slim purge-ray cannon underneath, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the purge-ray cannon firing a compact bright cyan-white beam "
            "burst, shield wings swept back",
        ),
        enemy_ids=("aegis_drone",),
    ),
    Sprite(
        key="sentinel-overseer",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/sentinel-drone-idle.png",
        idle_ref_note="The reference image is the base SENTINEL DRONE. Draw its ELITE act-1 command variant: "
        "clearly the same red-black drone design language, but bigger and heavier.",
        subject="the OVERSEER: a large black-and-crimson command drone with four heavy rotor pods, a tall "
        "sensor crest and antenna array, a long underslung overwatch beam cannon, two small glowing magenta "
        "shield-link emitters on its flanks, a big red sensor eye, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the overwatch cannon firing a compact bright red-white beam "
            "burst, body tilted forward",
        ),
        enemy_ids=("sentinel_overseer",),
    ),
    Sprite(
        key="incinerator",
        kind="elite",
        idle_ref="resources/neo-seoul/enemies/combat/purge-drone-idle.png",
        idle_ref_note="The reference image is the base PURGE DRONE. Draw its ELITE act-2 variant: clearly the "
        "same rusty burner-drone design language, but a much bigger walking furnace.",
        subject="the INCINERATOR: a hulking rusted furnace machine on two stubby armoured legs, a boxy "
        "riveted body with a glowing orange furnace grate, twin flamethrower arms, exhaust stacks venting "
        "smoke and embers, red sensor eye, magenta warning lights",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: both flamethrower arms blasting a compact cone of roaring "
            "orange fire, exhaust stacks venting",
        ),
        enemy_ids=("incinerator",),
    ),
    # ------------------------------------------------------------------ normal/minion variants (face LEFT)
    # Defs that used to share a base sprite with a different enemy. The UI scales minions down by tier.
    Sprite(
        key="scrap-drone",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/maintenance-drone-idle.png",
        idle_ref_note="The reference image is the base MAINTENANCE DRONE. Draw a weaker MINION variant: clearly the "
        "same drone design language, but smaller, shabbier and cobbled together.",
        subject="the SCRAP DRONE: a small rusted cobbled-together scrap drone made of mismatched salvaged plates, "
        "one sputtering rotor, a single jointed pincer arm, exposed wires, a dim red sensor eye, orange rust "
        "accents — clearly a weak minion",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward and snapping its single pincer arm shut, a "
            "small spark at the pincer tip",
        ),
        enemy_ids=("scrap_drone",),
    ),
    Sprite(
        key="spiderling",
        kind="enemy",
        size="1536x1024",
        idle_ref="resources/neo-seoul/enemies/combat/tracker-spider-idle.png",
        idle_ref_note="The reference image is the base TRACKER SPIDER robot. Draw a juvenile MINION variant: "
        "clearly the same robotic spider design language, but small and light.",
        subject="the SPIDERLING: a small juvenile spider drone with half the bulk of an adult, a translucent "
        "glowing amber body shell with visible circuitry inside, thin spindly legs, a tiny red sensor eye — "
        "clearly a weak minion",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: leaping forward with front legs raised and tiny fangs bared",
        ),
        enemy_ids=("spiderling",),
    ),
    Sprite(
        key="hunter-spider",
        kind="enemy",
        size="1536x1024",
        idle_ref="resources/neo-seoul/enemies/combat/tracker-spider-idle.png",
        idle_ref_note="The reference image is the base TRACKER SPIDER robot. Draw its act-3 ARK premium model: "
        "clearly the same robotic spider anatomy, but sleek, clean and expensive.",
        subject="the HUNTER SPIDER: a sleek white-and-red ARK-model hunter spider robot, glossy white ceramic "
        "shell with red accent lines, long blade-like legs, a narrow head with a cluster of red lenses, "
        "neurotoxin injector fangs, premium high-tech look",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: pouncing forward with its long blade legs raised to strike, "
            "fangs extended",
        ),
        enemy_ids=("hunter_spider",),
    ),
    Sprite(
        key="glitch-echo",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/glitch-wraith-idle.png",
        idle_ref_note="The reference image is the base GLITCH WRAITH. Draw a small MINION variant: clearly the "
        "same spectral glitch design language, but small, faint and unstable.",
        subject="the GLITCH ECHO: a small flickering shard-ghost, a hunched little spectral figure made of "
        "fragmented cyan and magenta hologram shards with gaps and pixel tearing, one glowing eye, wispy "
        "trailing lower body, hovering — clearly a weak minion",
        poses=_enemy_poses(),
        enemy_ids=("glitch_echo",),
    ),
    Sprite(
        key="ark-sentry",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/sentinel-drone-idle.png",
        idle_ref_note="The reference image is the base SENTINEL DRONE. Draw a compact act-3 ARK security variant: "
        "same drone design language, but white ARK livery and small.",
        subject="the ARK SENTRY: a compact white ARK security drone in glossy white ceramic plating with thin "
        "black seams, two small rotors, a single round red lens, a slim needle gun underneath, hovering — a "
        "minion-sized unit",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the needle gun firing a quick burst of thin glowing red "
            "needles, body tilted forward",
        ),
        enemy_ids=("ark_sentry",),
    ),
    Sprite(
        key="ark-warden",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/sentinel-drone-idle.png",
        idle_ref_note="The reference image is the base SENTINEL DRONE. Draw its act-3 ARK warden variant: same "
        "drone design language, but larger and in white-gold ARK livery.",
        subject="the ARK WARDEN: a larger white-and-gold ARK drone with a faceted crystal prism emitter at its "
        "front, a thin glowing halo ring floating above it, gold trim, cyan inner light, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the prism emitter firing a compact rainbow-white prism beam, "
            "halo ring blazing",
        ),
        enemy_ids=("ark_warden",),
    ),
    Sprite(
        key="ark-assaulter",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/shock-trooper-idle.png",
        idle_ref_note="The reference image is the base SHOCK TROOPER. Draw its act-3 ARK variant: same soldier "
        "build and armour layout, but in white ARK armour.",
        subject="the ARK ASSAULTER: an ARK rifleman in clean white ceramic armour with black joints, a smooth "
        "helmet with a glowing red visor slit, holding a long rail carbine with cyan coil accents",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: firing the long rail carbine, a compact cyan-white rail flash "
            "at the muzzle, braced stance",
        ),
        enemy_ids=("ark_assaulter",),
    ),
    Sprite(
        key="ark-executor",
        kind="enemy",
        idle_ref="resources/neo-seoul/enemies/combat/enforcer-unit-idle.png",
        idle_ref_note="The reference image is the base ENFORCER riot unit. Draw its act-3 ARK variant: same heavy "
        "riot build, but in white ARK armour.",
        subject="the ARK EXECUTOR: a heavy riot executor in white ceramic power armour with gold-and-red trim, "
        "a featureless helmet with a red visor, a tall white tower shield, a crackling high-voltage shock baton",
        poses=_enemy_poses(),
        enemy_ids=("ark_executor",),
    ),
    # ------------------------------------------------------------------ content-expansion bosses (face LEFT)
    # Identity comes from each boss's splash art (resources/neo-seoul/v2/boss/), generated first.
    Sprite(
        key="baekho",
        kind="boss",
        size="1536x1024",
        idle_ref="resources/neo-seoul/v2/boss/a1_boss_baekho.webp",
        idle_ref_note=SPLASH_NOTE,
        subject="BAEKHO, the act-1 boss: the White Tiger guardian of Korean myth rebuilt as a lean high-speed "
        "assault machine — a sleek quadruped tiger-mech in white ceramic armour with black stripe-shaped plate "
        "seams, long mono-edged blade claws with crimson edge-light, a tiger-skull helm with ice-blue eye slits, "
        "jet vents along its spine",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: pouncing forward low and fast, one blade-clawed forepaw "
            "slashing, a compact crimson arc of light trailing the claws, spine jets flaring",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, white armour plates cracked "
            "and sparking, head jolted aside, small shards and sparks flying",
        ),
        enemy_ids=("baekho_stalker",),
    ),
    Sprite(
        key="hyeonmu",
        kind="boss",
        size="1536x1024",
        idle_ref="resources/neo-seoul/v2/boss/a2_boss_hyeonmu.webp",
        idle_ref_note=SPLASH_NOTE,
        subject="HYEONMU, the act-2 boss: the Black Tortoise guardian of Korean myth rebuilt as a colossal siege "
        "fortress — a huge black-iron tortoise tank with a domed hexagonal-plated shell bristling with mortar "
        "tubes leaking corrosive green vapour, a heavy cannon jaw, and an armoured serpent-like cable tail "
        "with a snake-head sensor coiled around it, dim green and teal running lights",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the cannon jaw firing a compact blast of dark teal energy, "
            "shell mortars venting green smoke, the serpent tail reared up",
            hit="now in a HIT-REACTION pose: rocking backward toward the right, shell plates cracked and "
            "sparking, green fluid spraying from a ruptured tube, small debris flying",
        ),
        enemy_ids=("hyeonmu_bastion",),
    ),
    Sprite(
        key="architect-omega",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a3_boss_architect.webp",
        idle_ref_note=SPLASH_NOTE,
        subject="ARCHITECT OMEGA, IX's enforcement engine as a towering drafting machine: a skeletal tower of "
        "matte black iron and polished antique brass with a narrow mechanical spine, several long many-jointed "
        "articulated arms — one holding a giant brass drafting compass, one a long steel ruler, the others ending "
        "in laser-cutting heads with amber tips — and a head that is a large brass lens-and-projector with a "
        "single glowing amber aperture casting thin amber and deep-violet blueprint grid lines, a few small "
        "cut-out city-block chunks with glowing amber cut faces floating beside it, hovering above the ground. "
        "Palette black, amber/gold and deep violet; NOT white, NOT crystal, NO chest core, NO halo rings",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the compass arm and a laser-cutter arm thrust forward, a "
            "compact amber cutting beam slicing a short glowing seam through the air, lens aperture blazing "
            "amber, violet grid lines flaring",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, arms jolted and splayed, brass "
            "joints sparking, the lens cracked and flickering violet, small brass gears and debris flying",
        ),
        enemy_ids=("architect_omega",),
    ),
    Sprite(
        key="jujak",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a1_boss_jujak.webp",
        idle_ref_note=SPLASH_NOTE,
        subject="JUJAK, the act-1 boss: the Vermilion Bird guardian of Korean myth rebuilt as a fire-core purge "
        "war machine — a tall two-legged bird-shaped incinerator walker in scorched vermilion and crimson armour, "
        "a hooked beak-like head with burning amber eyes, quad-barrel napalm mortar pods on its shoulders, a "
        "blazing white-orange furnace core in its chest, huge wing-shaped heat-sink vanes on its back glowing "
        "red-hot like burning feathers, heavy clawed bird feet, embers drifting off it",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: beak open and lunging forward, a compact gout of white-orange "
            "flame bursting from the beak, wing vanes flared wide and blazing, chest core flaring",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, crimson armour plates cracked "
            "and sparking, wing vanes buckled, the furnace core sputtering, small embers and debris flying",
        ),
        enemy_ids=("jujak_core",),
    ),
    Sprite(
        key="arachne",
        kind="boss",
        size="1536x1024",
        idle_ref="resources/neo-seoul/v2/boss/a2_boss_arachne.webp",
        idle_ref_note=SPLASH_NOTE,
        subject="ARACHNE, the act-2 boss: the hive matriarch of the Undercity grid — a huge eight-legged "
        "spider-queen machine in glossy black chitin-like armour with violet and electric-blue seams, a sleek "
        "armoured upper torso rising from the front like a crowned queen with a smooth mask and six glowing "
        "blue sensor eyes, long legs ending in violet-lit needle lance tips, a swollen abdomen of glowing blue "
        "capacitor egg pods, crackling blue electric arcs",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: charging forward with the front lance legs thrust out, a "
            "compact burst of blue lightning at the lance tips, egg pods flaring bright",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, black carapace plates cracked "
            "and sparking, legs buckled, an egg pod ruptured and spitting blue sparks, small shards flying",
        ),
        enemy_ids=("arachne_queen",),
    ),
    # ------------------------------------------------------------------ content-expansion enemies (face LEFT)
    Sprite(
        key="ripper-hound",
        kind="enemy",
        size="1536x1024",
        idle_ref="resources/neo-seoul/v2/sprites/scrap-drone-idle.webp",
        idle_ref_note=STYLE_ONLY_NOTE,
        subject="the RIPPER HOUND: a lean rusted robotic attack dog of the act-1 lower city, exposed hydraulic "
        "leg pistons, a long jaw of jagged saw-tooth steel fangs, a single red sensor eye, frayed cables along "
        "its spine, orange rust and dark gunmetal",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: leaping forward with its saw-tooth jaws wide open, a small "
            "spray of red sparks at the fangs",
        ),
        enemy_ids=("ripper_hound",),
    ),
    Sprite(
        key="stalker-drone",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=STYLE_ONLY_NOTE,
        subject="the STALKER DRONE: a small sleek black assassin drone with a narrow arrowhead body, two tilted "
        "quiet rotors, a long needle-laser barrel underneath, a thin red sensor slit, parts of its hull "
        "shimmering half-transparent with optical camouflage, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: firing a thin bright red needle laser from its barrel, body "
            "tilted forward",
        ),
        enemy_ids=("stalker_drone",),
    ),
    Sprite(
        key="rust-hulk",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/incinerator-idle.webp",
        idle_ref_note=STYLE_ONLY_NOTE,
        subject="the RUST HULK: a hulking corroded waste-processing machine on thick piston legs, a hunched "
        "riveted body with a glass tank of glowing yellow-green acid sludge on its back, one huge rusted "
        "hydraulic crusher claw and one sludge-lobbing mortar arm, dripping acid, a dim amber sensor eye",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: hurling a compact glob of glowing yellow-green acid sludge "
            "from its mortar arm while the crusher claw swings forward",
        ),
        enemy_ids=("rust_hulk",),
    ),
    Sprite(
        key="blade-dancer",
        kind="enemy",
        subject="the BLADE DANCER: a lithe undercity cyber-assassin in a flowing dark crimson-and-black "
        "hanbok-inspired combat coat with long trailing sashes, a smooth chrome mask with a single magenta eye "
        "slit, a curved monoblade in each hand, light dancer's stance on the balls of the feet",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: dashing forward in a low spinning slash, both curved blades "
            "extended, a compact crimson arc of light, sashes whipping",
        ),
        enemy_ids=("blade_dancer",),
    ),
    Sprite(
        key="acid-alchemist",
        kind="enemy",
        subject="the ACID ALCHEMIST: a hunched undercity chemist in a stained patched hazmat coat and a brass "
        "respirator mask with round green lenses, a bandolier of glass flasks of glowing yellow-green acid "
        "across the chest, rubber gloves, one hand holding a fuming flask",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: hurling a glowing green acid flask forward in an overhand "
            "throw, a small splash of acid vapour around the flask",
        ),
        enemy_ids=("acid_alchemist",),
    ),
    Sprite(
        key="crimson-executioner",
        kind="elite",
        subject="the CRIMSON EXECUTIONER: a towering undercity executioner in heavy blood-red and black "
        "armour plates over a stained leather apron, a hooded steel helm with a glowing red visor, wielding a "
        "huge hooked cleaver-glaive on a chain, red light dripping along the blade",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: swinging the hooked cleaver-glaive forward in a wide arc, a "
            "compact crimson slash trail",
        ),
        enemy_ids=("crimson_executioner",),
    ),
    Sprite(
        key="phantom-assassin",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/ark-assaulter-idle.webp",
        idle_ref_note=ARK_NOTE,
        subject="the PHANTOM ASSASSIN: a slim ARK assassin in a form-fitting white-and-black stealth suit "
        "with thin cyan seams, a smooth featureless white helmet with a narrow red visor, a short phase dagger "
        "glowing cyan in one hand, a holster of tracking darts at the thigh, parts of the body flickering "
        "translucent with a phase cloak",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward with the cyan phase dagger in a quick "
            "slicing thrust, a compact red-and-cyan cut arc",
        ),
        enemy_ids=("phantom_assassin",),
    ),
    Sprite(
        key="bio-purger",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/ark-assaulter-idle.webp",
        idle_ref_note=ARK_NOTE,
        subject="the BIO-PURGER: an ARK sanitation trooper in bulky sealed white hazmat armour with black "
        "joints, a domed helmet with a green-lit visor, twin canisters of glowing green purge fluid on the "
        "back connected by hoses to a heavy dissolve-beam projector held in both hands",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: firing the projector, a compact bright green dissolve beam "
            "burst at the nozzle, braced stance",
        ),
        enemy_ids=("bio_purger",),
    ),
    Sprite(
        key="eclipse-valkyrie",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/ark-warden-idle.webp",
        idle_ref_note=ARK_NOTE,
        subject="the ECLIPSE VALKYRIE: a flying ARK combat frame shaped like an armoured valkyrie — a slender "
        "white-and-dark-steel humanoid war machine with a winged helm, four swept blade-like thruster wings, "
        "a long lance, a humming blue phase-evasion core in its chest and a dark eclipse-ring halo behind its "
        "head, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: diving forward with the lance thrust out, wings swept back, "
            "a compact burst of blue-white light at the lance tip",
        ),
        enemy_ids=("eclipse_valkyrie",),
    ),
    # ------------------------------------------------------------------ act 4 "The Glass Librarian" (face LEFT)
    # Deep Signal pack (content/packs/glass_library). Bosses take identity from their splash art.
    Sprite(
        key="lost-reader",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the LOST READER: a small, gaunt, half-faded ghost of a library reader, translucent like frosted "
        "glass with faint memory-light flickering inside, hunched and hollow-eyed (two dim white eyes), clutching "
        "a blank glowing book to its chest with one arm, the other long thin hand reaching out to grasp, its lower "
        "body trailing off into wisps of loose blank pages — clearly a weak minion",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lurching forward with the long thin hand outstretched to grab, "
            "fingers clawing, a faint grey strength-sapping mist curling from the grip",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, its glassy body cracking and "
            "flickering, loose pages scattering off it",
        ),
        enemy_ids=("lost_reader",),
    ),
    Sprite(
        key="index-drone",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/purge-seraph-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the INDEX DRONE: a hovering catalogue drone — a floating frosted-glass card-catalogue drawer "
        "cabinet with brass handles and corners, a single large ice-blue scanning lens on its front, small brass "
        "rotor fins on its sides, several blank paper index tags dangling on thin brass threads beneath it, and a "
        "small brass tagging arm, hovering in the air",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the lens firing a short thin ice-blue catalogue ray toward the "
            "left, the tagging arm flicking out a blank paper tag, body tilted forward",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, glass cracked, a drawer jolted "
            "open with blank cards spilling out, small sparks",
        ),
        enemy_ids=("index_drone",),
    ),
    Sprite(
        key="binding-enforcer",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/enforcer-elite-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the BINDING ENFORCER: a hulking armoured censor soldier in white porcelain plate armour with "
        "riveted antique-brass trim, a helmet shaped like a closed hardcover book (the spine forms the crest) with "
        "a narrow white visor slit, black binding wire wound tightly around its arms, its right hand a heavy "
        "brass needle-and-wire stitching gauntlet, holding a massive maul made of a thick bound book spine",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: swinging the heavy book-spine maul down toward the left while "
            "the stitching gauntlet lashes out a taut black wire, a compact white impact flash",
        ),
        enemy_ids=("binding_enforcer",),
    ),
    Sprite(
        key="silent-librarian",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/trooper-captain-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the SILENT LIBRARIAN: a tall, thin robed librarian automaton in long layered white and pale-grey "
        "robes, its face a smooth mouthless white porcelain mask, one long finger raised to where lips would be "
        "in a 'shush' gesture, the other hand holding a tall brass reading-lamp staff with a cold white glass lamp, "
        "a few small glass books orbiting it like a protective ring",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: raising the lamp staff and lobbing a compact orb of pale "
            "silencing white light in an arc toward the left, robes billowing, the shush hand extended",
        ),
        enemy_ids=("silent_librarian",),
    ),
    Sprite(
        key="page-wolf",
        kind="enemy",
        size="1536x1024",
        idle_ref="resources/neo-seoul/v2/sprites/ripper-hound-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the PAGE WOLF: a lean prowling wolf assembled from torn book pages and crumpled paper scraps "
        "stitched together with black thread, layered paper-edge fur, sharp paper-blade fangs and claws, "
        "ink-stained jaws dripping black ink, two glowing white eyes, loose pages fluttering off its back",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: charging and leaping forward with jaws open and paper-blade "
            "claws slashing, a thin crimson cut-streak and torn paper scraps trailing",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, pages tearing off its flank and "
            "scattering, ink splattering",
        ),
        enemy_ids=("page_wolf",),
    ),
    Sprite(
        key="footnote-turret",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the FOOTNOTE TURRET: a heavy stationary turret shaped like an ornate antique-brass reading lectern "
        "on a squat armoured stone-and-porcelain pedestal (no legs, clearly immovable), a thick open crystal book "
        "resting on it, and from the book a long cannon barrel made of stacked glass lenses pointing LEFT, tiny "
        "glowing white footnote-marker motes orbiting it, heavy bolted armour plates",
        poses=_enemy_poses(
            attack="now FIRING toward the LEFT: the lens barrel discharging a compact, intense straight white beam "
            "flash at its muzzle, the crystal book's pages blazing with light, pedestal braced",
            hit="now in a HIT-REACTION pose: the whole turret jolted and tilted slightly to the right, glass "
            "lenses cracked, sparks and glass shards flying",
        ),
        enemy_ids=("footnote_turret",),
    ),
    Sprite(
        key="return-collector",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the RETURN COLLECTOR: a squat, stocky book-return robot — its body a brass-and-frosted-glass "
        "return bin with a dark slot mouth, short sturdy legs, one long arm ending in a big curved shepherd's-crook "
        "hook on a chain, the other arm a heavy rubber-stamp fist with a brass handle, an amber warning lamp on "
        "its head",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: hurling the curved hook forward on its chain toward the left to "
            "drag a target in, the stamp fist raised, leaning forward",
        ),
        enemy_ids=("return_collector",),
    ),
    Sprite(
        key="ink-wraith",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the INK WRAITH: a tall ghost made of bleeding, running black ink — a smeared spectral silhouette "
        "with blurred, feathered outlines like ink soaking into wet paper, long dripping ink claws, a pale white "
        "smudged face-mask with empty eyes, ink droplets and blots drifting around it, its lower body a puddle-"
        "less trailing smear, hovering",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward with a dripping ink claw raking toward the "
            "left, a splash of black ink flung from the claw",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, its inky body splattering and "
            "smearing apart, droplets flying",
        ),
        enemy_ids=("ink_wraith",),
    ),
    Sprite(
        key="binding-giant",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the BINDING GIANT: a huge hulking bookbinding-press colossus — its torso a cast-iron and antique-"
        "brass book press with a big threaded screw and wheel on top, white porcelain armour plates, huge arms "
        "ending in flat press-plate hands with brass clamps, thick legs made of stacked bound tomes wrapped in "
        "black binding wire, a cluster of small white lens eyes in a recessed head",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: slamming both press-plate hands down together, a compact ring "
            "shockwave of white light and blank pages bursting at the impact",
        ),
        enemy_ids=("binding_giant",),
    ),
    Sprite(
        key="chief-censor",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/trooper-captain-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the CHIEF CENSOR: a regal high-ranking censor official, a tall figure in heavy white and black "
        "ceremonial robes trimmed with antique brass, a tall stiff mitre-like headdress, the face hidden behind a "
        "thick solid black redaction bar across the eyes, holding a giant brass seal-stamp in one hand and a long "
        "black-ink quill sceptre in the other, a few floating solid black redaction bars hovering around it",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: thrusting the quill sceptre forward, launching a solid black "
            "redaction bar like a bolt toward the left, robes sweeping",
        ),
        enemy_ids=("chief_censor",),
    ),
    Sprite(
        key="sentence-cutter",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/blade-dancer-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the SENTENCE CUTTER: a sleek bladed mantis-like machine of polished clear glass and steel, long "
        "scissor/guillotine blade forearms, a paper-guillotine blade arched over its back, thin jointed legs, a "
        "narrow head with a single horizontal white light-slit eye, thin strips of cut paper drifting down around it",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward with both guillotine blades scissoring, a thin "
            "straight horizontal white cutting beam flaring from the slit eye, cut paper strips flying",
        ),
        enemy_ids=("sentence_cutter",),
    ),
    Sprite(
        key="void-librarian",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=GLASS_NOTE,
        subject="the VOID LIBRARIAN: a tall hovering robed librarian whose hooded robe of frosted glass panels and "
        "grey cloth opens onto an empty starless void where the body should be, two long pale porcelain arms "
        "holding a large grey eraser slab, a swirling storm of grey eraser crumbs and dissolving page fragments "
        "orbiting it, faint corrosive grey-green glow",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: hurling a compact swirling ball of corrosive grey eraser dust "
            "forward in an arc toward the left, robe flaring",
        ),
        enemy_ids=("void_librarian",),
    ),
    Sprite(
        key="io",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a4_boss_io.webp",
        idle_ref_note=GLASS_SPLASH_NOTE,
        subject="IO, the act-4 boss, the librarian AI of the Glass Library: a tall slender elegant android of "
        "clear and frosted glass and white porcelain, cracked glass joints leaking white light, eyes of dark "
        "liquid ink, a long high-collared archivist's coat of translucent glass panels like pages, hands folded "
        "politely, loose pages swirling around it — courteous but an unyielding gatekeeper",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: one hand extended toward the left, palm out, projecting a "
            "compact barrier-beam of white light that slams shut like a closed book, pages whirling",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the cracks in its glass joints "
            "spreading and flaring, ink leaking from its eyes, glass shards and pages flying",
        ),
        enemy_ids=("io_librarian",),
    ),
    Sprite(
        key="blank",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a4_boss_blank.webp",
        idle_ref_note=GLASS_SPLASH_NOTE,
        subject="THE BLANK, the act-4 boss: a towering faceless bookbinding construct built of thousands of "
        "stacked blank white pages bound by huge antique-brass clamps, screw presses, rivets and taut black "
        "binding wire, a giant book spine as its backbone, two massive brass press-plate hands, an empty page "
        "where its face should be, unwritten white pages unfolding from its body like wings",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward and clapping a massive brass press-plate hand "
            "down toward the left, a storm of blank white pages bursting out, binding wires whipping",
            hit="now in a HIT-REACTION pose: rocking backward toward the right, brass clamps snapping open, "
            "pages tearing loose and scattering, sparks",
        ),
        enemy_ids=("blank_binder",),
    ),
    Sprite(
        key="first-reader",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a4_boss_reader.webp",
        idle_ref_note=GLASS_SPLASH_NOTE,
        subject="THE FIRST READER, the act-4 boss: a tall hooded figure whose body and long hooded cloak are made "
        "of flowing dark-ink handwriting strokes and margin scribbles (abstract and illegible), a dim face with a "
        "black face mask under the hood (an echo of the young Connector), two faint glowing white eyes, torn "
        "pages and ink droplets drifting from the cloak hem",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: dashing forward low with one arm sweeping a long whip-like "
            "stroke of black ink toward the left, cloak streaming behind, ink spray",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, its ink-stroke body unravelling "
            "into loose scribbles and splatters, pages scattering",
        ),
        enemy_ids=("first_reader",),
    ),
    # DLC update (2026-10-26): act-3 boss "명단 관리관 / THE LIST WARDEN" and its protect-bonus hostage.
    Sprite(
        key="list-warden",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a3_boss_warden.webp",
        idle_ref_note=GLASS_SPLASH_NOTE,
        subject="THE LIST WARDEN, the act-3 boss: a towering cold bureaucratic ARK enforcer construct shaped like a "
        "robed archivist-executioner — long layered robes of matte white enamel plates and brushed steel, a deep "
        "hood over a smooth featureless steel face-plate with one thin horizontal slit of cold blue-white light, one "
        "long arm holding an endless glowing scroll-list of luminous blank lines (abstract bars of light, not "
        "writing) that coils around its feet, the other hand gripping a heavy stamp-hammer whose head is a giant "
        "square seal-stamp glowing blue-white. Palette white, steel grey and cold blue-white light; NOT glass, NOT "
        "crystal, NO halo rings, NO red chest core, NOT black-and-brass",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: swinging the stamp-hammer down in a heavy overhead arc toward the "
            "left, the square seal-head flaring blue-white with a compact shockwave of light at the impact, the "
            "glowing scroll-list whipping out behind it",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, white enamel robe plates cracked "
            "and sparking, the face-slit flickering, the glowing scroll-list tearing and scattering fragments of "
            "light",
        ),
        enemy_ids=("list_warden",),
    ),
    Sprite(
        key="listed-citizen",
        kind="neutral",
        idle_ref="resources/neo-seoul/v2/sprites/se-rin-idle.webp",
        idle_ref_note="The reference image is another character sprite from this game: use it ONLY for the "
        "rendering style (painterly detail, rim light, proportions, transparent isolation) — draw a completely NEW, "
        "different person.",
        subject="a LISTED CITIZEN, a frightened ordinary Neo-Seoul citizen marked for erasure: a thin tired Korean "
        "man in his forties in worn, patched everyday clothes (a faded grey work jacket over a stretched sweater, "
        "baggy trousers, scuffed sneakers), unarmed and unarmoured, a glowing cold blue-white barcode tag band "
        "fastened around one wrist, hunched shoulders, scared eyes — a civilian, not a fighter",
        poses={
            "attack": "now FLINCHING: cowering and turning half away with both forearms raised to shield his face, "
            "knees bent, the barcode tag on his wrist glowing brighter",
            "hit": "now in a HIT-REACTION pose: knocked back and stumbling toward the left, one arm thrown out for "
            "balance, wincing in pain, a few small sparks",
        },
    ),
    # ------------------------------------------------------------------ act 5 "Dreaming Machines" (face LEFT)
    # Deep Signal pack 2 (content/packs/dreaming_machines). Bosses take identity from their splash art.
    Sprite(
        key="scrap-mite",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/scrap-drone-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the SCRAP MITE: a small tick-like scavenger robot crawling low on six thin bent-wire legs, a round "
        "dented rusty tin-can body patched with bolts, grinding saw-tooth mandibles dripping orange corrosive rust "
        "flakes, one dim amber eye-lamp — small and clearly a weak minion",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward low with its saw-tooth mandibles clamped in a bite, "
            "a small spray of orange corrosive rust flakes at the bite",
            hit="now in a HIT-REACTION pose: flipped half over and knocked backward toward the right, legs flailing, "
            "tin body dented, sparks and loose bolts flying",
        ),
        enemy_ids=("scrap_mite",),
    ),
    Sprite(
        key="scrap-hound",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the SCRAP HOUND: a lean scavenger hound robot cobbled together from mismatched junk — a bent "
        "exhaust-pipe spine, ribs of a rusted car grille, mismatched panels (one faded yellow, one chipped teal), a "
        "long jaw of serrated sheet-metal saw blades, ONE cracked round headlamp for an eye glowing amber, a tail of "
        "dangling frayed wires, oil dripping from its joints, crouched on four thin hydraulic legs",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: leaping forward in a long low lunge, saw-blade jaws wide open, a "
            "streak of red sparks trailing from its teeth",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, a panel torn loose, the headlamp "
            "flickering, sparks and oil spraying",
        ),
        enemy_ids=("scrap_hound",),
    ),
    Sprite(
        key="cryo-drone",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the CRYO DRONE: a hovering drone salvaged from an old refrigeration unit — a dented boxy off-white "
        "and rust coolant-tank body crusted with frost, two ducted rotors, a long cryo nozzle under its nose venting "
        "pale icy-blue vapour, small icicles hanging beneath, a frost-blue lens eye — flying in the air",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: tilted forward, the cryo nozzle firing a short thin straight beam "
            "of icy-blue freezing light toward the left, frost crystals bursting at the nozzle",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, tilting, frost crust cracking off, a "
            "rotor sputtering sparks, icy vapour leaking",
        ),
        enemy_ids=("cryo_drone",),
    ),
    Sprite(
        key="welder-unit",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/incinerator-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the WELDER UNIT: a squat industrial welding robot on two thick stubby legs, a heavy rusted torso "
        "with worn yellow-and-black hazard stripes, a welding-mask head with a dark visor and one narrow glowing "
        "slit, one arm ending in a white-hot blue arc-welding torch, the other arm a gas-hose claw connected to a "
        "gas tank on its back, a few welding sparks dripping",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: thrusting the arc-welding torch forward, a compact blinding "
            "blue-white welding arc and a shower of orange sparks at the tip",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, visor cracked, the gas hose "
            "torn and hissing, sparks flying",
        ),
        enemy_ids=("welder_unit",),
    ),
    Sprite(
        key="dream-wisp",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the DREAM WISP: a fragment of a discarded machine's dream — a small floating translucent ghost of "
        "soft violet and pale-blue static light shaped like a curled sleeping child-sized silhouette inside a "
        "jellyfish-like bell of glitching scanlines, one faint glowing closed eye, drifting pixel motes and trailing "
        "tendrils of static beneath it — ethereal, no metal, hovering in the air",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: unfurling toward the left and releasing a small drifting orb of "
            "drowsy violet haze from its tendrils",
            hit="now in a HIT-REACTION pose: recoiling toward the right, its static body tearing apart into "
            "scanlines and scattered pixel motes, flickering",
        ),
        enemy_ids=("dream_wisp",),
    ),
    Sprite(
        key="recycler",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the RECYCLER: a hulking boxy scrap-compactor machine on short caterpillar treads — a massive "
        "rusted crusher-box body, two huge hydraulic compactor plates on its front like a vice-jaw, toothed "
        "grinding rollers in its maw stuffed with crushed scrap, thick hydraulic pistons, heavy armour plates, an "
        "amber rotating warning lamp on top",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: slamming its compactor plates shut forward toward the left, a "
            "compact shockwave of crushed scrap and dust bursting from the impact",
            hit="now in a HIT-REACTION pose: rocked backward toward the right on its treads, an armour plate "
            "buckled, hydraulic fluid spraying, sparks",
        ),
        enemy_ids=("recycler",),
    ),
    Sprite(
        key="crane-arm",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the CRANE ARM: a stationary scrapyard crane turret — a heavy rusted rotating base bolted down "
        "(no legs, it never moves), a tall jointed hydraulic boom arm rising and curving over toward the LEFT, "
        "ending in a large scrap claw grabber holding a clump of scrap, slack cables hanging, an amber warning lamp, "
        "wet with rain — the whole crane fits in the frame",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the boom swung out to the left, the claw opening wide and "
            "releasing a falling heap of heavy scrap chunks",
            hit="now in a HIT-REACTION pose: the boom jolted backward toward the right, a joint sparking, cables "
            "snapping loose, the claw swinging",
        ),
        enemy_ids=("crane_arm",),
    ),
    Sprite(
        key="android-husk",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the ANDROID HUSK: a discarded android that moves in its sleep — a gaunt humanoid android with "
        "cracked, dirty off-white plating, missing panels exposing black wiring, eyes closed with only faint pale "
        "blue slits, head tilted as if sleepwalking, one long arm reaching forward with open fingers, a severed "
        "cable trailing from its back like an umbilical, rain-streaked and rust-stained",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lurching forward with the long arm outstretched, fingers "
            "clamping to grab and drag, eyes still closed",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, plating cracking off, head lolling, "
            "sparks from the exposed wiring",
        ),
        enemy_ids=("android_husk",),
    ),
    Sprite(
        key="furnace-guard",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/incinerator-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the FURNACE GUARD, an elite: a large stout humanoid war-machine whose torso is an open blast "
        "furnace with a glowing molten-orange core behind an iron grate, thick slag-crusted dark iron armour, two "
        "short chimney stacks on its shoulders venting smoke and embers, huge slag-encrusted fists dripping molten "
        "metal, two small tick-like scrap mites clinging to its legs",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: driving a huge slag fist forward, molten metal splashing, the "
            "furnace core flaring white-hot",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, slag armour cracking, the furnace "
            "grate bent, embers and sparks bursting out",
        ),
        enemy_ids=("furnace_guard",),
    ),
    Sprite(
        key="frost-reclaimer",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the FROST RECLAIMER, an elite: a tall spindly reclamation walker on three long digitigrade legs, a "
        "frosted off-white and rust hull, a large cryo cannon arm with a glowing pale ice-blue barrel, a single "
        "large targeting lens with a thin lock-on light, a hooked reclaiming claw arm for hauling bodies, a "
        "back-mounted coolant tank, frost crust and icicles",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: firing the cryo cannon, a compact straight beam of ice-blue "
            "freezing light bursting from the barrel, frost crystals around it",
            hit="now in a HIT-REACTION pose: staggered backward toward the right, a leg buckling, the lens cracked, "
            "coolant venting icy vapour",
        ),
        enemy_ids=("frost_reclaimer",),
    ),
    Sprite(
        key="assembly-titan",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the ASSEMBLY TITAN, an elite: a giant hunched assembly-line robot — a massive armoured body of "
        "worn industrial yellow and rust, a torso built around a running conveyor belt, a heavy hydraulic press "
        "head, two huge arms ending in flat press plates driven by pistons, small robotic welding arms sprouting "
        "from its back, thick stubby legs",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: charging forward and slamming both press plates down in front of "
            "it toward the left, pistons fully extended, a compact shockwave at the impact",
            hit="now in a HIT-REACTION pose: rocked backward toward the right, a piston snapped, the conveyor "
            "jammed, sparks and oil",
        ),
        enemy_ids=("assembly_titan",),
    ),
    Sprite(
        key="nightmare-loom",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=MACHINE_NOTE,
        subject="the NIGHTMARE LOOM, an elite: an old industrial weaving loom turned into a spidery creature, "
        "walking on several thin jointed iron legs, its body a rusted iron-and-wood loom frame strung with taut "
        "glowing threads of violet-black dream static, shuttles and spools, weaving a dark shimmering nightmare "
        "cloth from which small ghostly violet wisps peel away, one sleepy red-violet eye",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: flinging a woven net of glowing violet-black nightmare threads "
            "forward toward the left",
            hit="now in a HIT-REACTION pose: staggered backward toward the right, threads snapping, the frame "
            "cracking, scraps of static cloth scattering",
        ),
        enemy_ids=("nightmare_loom",),
    ),
    Sprite(
        key="furnace-mother",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a5_boss_mother.webp",
        idle_ref_note=MACHINE_SPLASH_NOTE,
        subject="THE FURNACE MOTHER, the act-5 boss: a vast hunched machine-mother built like a living blast "
        "furnace — riveted slag-crusted dark iron, a huge open molten core glowing white-orange in her belly behind "
        "a ribcage grate, long jointed crane-like arms, smokestack spines venting embers, a hooded head with two "
        "small furnace-glow eyes, molten slag dripping from her",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: leaning forward and pouring a gushing stream of glowing molten "
            "slag from her open core toward the left, her crane arms spread, the core flaring white-hot",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, slag armour cracking, the core "
            "sputtering, molten droplets and embers spraying",
        ),
        enemy_ids=("furnace_mother",),
    ),
    Sprite(
        key="kai-zero",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a5_boss_kai_zero.webp",
        idle_ref_note=MACHINE_SPLASH_NOTE,
        subject="KAI-0, the act-5 boss, the prototype of the android Kai: Kai's same pale white sculpted "
        "faceplate but older, scuffed and cracked, split open down the middle and leaking crackling white-blue "
        "static, cold white-blue eyes, a harsh heavy military combat frame of scarred white-and-gunmetal plates with "
        "rust and scorch marks, exposed black cable musculature, a heavy reinforced right forearm with a blade",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: rushing forward in a low charge, the forearm blade thrust out, "
            "a compact burst of frosty white-blue static at the blade tip",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the split faceplate flaring "
            "static, plates cracking, sparks and glitch fragments flying",
        ),
        enemy_ids=("kai_zero",),
    ),
    Sprite(
        key="rem",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a5_boss_rem.webp",
        idle_ref_note=MACHINE_SPLASH_NOTE,
        subject="REM, the Dream Executor, the act-5 boss: a tall slender androgynous figure of sleep and static — "
        "a smooth featureless pale porcelain mask-face with closed eyes, long flowing robes and veils of drifting "
        "television static and soft violet-blue scanlines dissolving into mist and small glowing moths, long thin "
        "fingers trailing luminous threads, small dream bubbles orbiting it",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: extending one long hand toward the left and releasing a compact "
            "straight beam of drowsy violet-blue sleep-static, the robes billowing",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the porcelain mask cracking, the "
            "static robes tearing into scanlines and scattered moths",
        ),
        enemy_ids=("rem_executor",),
    ),
    # ------------------------------------------------------------------ act 6 "First Record" (face LEFT)
    # Deep Signal pack 3 (content/packs/first_record). The Origin Code: a world written as text — ink black, paper
    # white, amber cursor light, faint cyan. Bosses take identity from their splash art (v2/boss/a6_*).
    Sprite(
        key="null-pointer",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/glitch-reaver-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the NULL POINTER, a small weak minion: a hunched little creature of glossy ink-black strokes, its "
        "whole body one long thin arm that ends in an outstretched pointing index finger of paper-white porcelain, "
        "its head an EMPTY hollow ring (a zero, nothing inside) with a faint amber glow at its rim, a few loose "
        "glyph strokes trailing from its back, scuttling on three spindly ink legs — small and clearly a minion",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: lunging forward and jabbing its pointing finger into the target, "
            "a small amber crosshair-mark of light flaring at the fingertip",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, the hollow ring head cracking, ink "
            "strokes splattering off its body",
        ),
        enemy_ids=("null_pointer",),
    ),
    Sprite(
        key="code-scribe",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/trooper-captain-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the CODE SCRIBE: a gaunt hooded scribe automaton in long paper-white parchment robes covered in "
        "faint illegible glyph marks, an ink-black lacquered faceplate with a single horizontal amber slit, four "
        "thin black mechanical arms — two holding a long glowing stylus-quill dripping molten amber ink, two holding "
        "an unrolled blank scroll — an ink pot hanging at its belt",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: flicking the stylus-quill forward so a glob of glowing amber ink "
            "arcs up into the air toward the left, trailing tiny illegible glyph sparks",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the scroll tearing, robes ripped, "
            "ink splashing from the shattered ink pot",
        ),
        enemy_ids=("code_scribe",),
    ),
    Sprite(
        key="eraser-unit",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the ERASER: a stocky heavily armoured robot of thick ink-black lacquer plates, its head a blank "
        "smooth white block with no face, its right arm ending in a huge wide flat block of chalk-white rubbery "
        "eraser material like a giant eraser-fist, its left arm a long horizontal squeegee-blade, white crumbs of "
        "erased glyph-dust falling from its fists, a faint amber light seam across its chest",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: sweeping the huge eraser-fist and squeegee-blade horizontally "
            "toward the left in a wide flat swipe, leaving a streak of blank white erased light and a spray of "
            "white eraser crumbs",
            hit="now in a HIT-REACTION pose: rocked backward toward the right, a black armour plate cracked, the "
            "eraser-fist chipped, white crumbs and ink flecks flying",
        ),
        enemy_ids=("eraser_unit",),
    ),
    Sprite(
        key="loop-echo",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/purge-seraph-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the LOOP ECHO: a floating translucent afterimage of a lean hooded young man in a long coat and face "
        "mask (an echo a past loop left behind), rendered as faint glowing pale-cyan and paper-white light with two "
        "or three slightly offset ghost copies of his outline stuttering behind him like a replayed video frame, "
        "holding a pistol; below the waist his body unravels into a looping ribbon of glowing glyph strokes curling "
        "in a circle — hovering in the air, no feet touching anything",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: raising the ghostly pistol and firing toward the left, a thin "
            "straight streak of pale-cyan light, the offset afterimages firing a beat later",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, the translucent body glitching "
            "apart into horizontal scanline slices and glyph fragments",
        ),
        enemy_ids=("loop_echo",),
    ),
    Sprite(
        key="firewall-segment",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/sentinel-overseer-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the FIREWALL SEGMENT: a stationary monolith — a thick upright slab of ink-black stone bolted to a "
        "heavy square base (no legs, it never moves), banded by horizontal rows of glowing orange-amber glyph "
        "light like burning lines of code, crossed by two thick black censor bars, a narrow vertical lens slit in "
        "its centre glowing hot amber, small heat shimmer rising from its top edge — the whole slab fits in the frame",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the lens slit firing a straight thick beam of hot amber light "
            "toward the left, the glyph bands flaring brighter",
            hit="now in a HIT-REACTION pose: the slab jolted and tilting back toward the right, a crack splitting its "
            "face, glyph bands flickering out, stone chips flying",
        ),
        enemy_ids=("firewall_segment",),
    ),
    Sprite(
        key="origin-hound",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/ripper-hound-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the ORIGIN HOUND, the first tracking code: a lean wolf-like hound whose body is half solid "
        "ink-black lacquer and half an open paper-white wireframe of thin blueprint construction lines, a long "
        "narrow skull with a jaw of white porcelain teeth, two glowing amber eyes, a tail and mane that trail away "
        "into streaming lines of glowing illegible glyph strokes, crouched low on four legs ready to run",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: charging forward in a long low leap, jaws wide open, a streak of "
            "amber trace-lines trailing behind it",
            hit="now in a HIT-REACTION pose: knocked backward toward the right, its wireframe half breaking apart "
            "into loose lines, ink splattering",
        ),
        enemy_ids=("origin_hound",),
    ),
    Sprite(
        key="draft-soldier",
        kind="enemy",
        idle_ref="resources/neo-seoul/v2/sprites/trooper-captain-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the DRAFT SOLDIER, an unfinished soldier: a humanoid armoured trooper with a sword and a small "
        "shield whose LEFT half is finished glossy ink-black armour and whose RIGHT half is still a rough sketch — "
        "bare paper-white surface with loose grey pencil construction lines, hatching and an unfinished outline, "
        "faint amber light where the drawing is still being written, a blank faceless helmet",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: stepping in with a forward diagonal sword cut toward the left, "
            "the sketched half trailing loose pencil lines",
            hit="now in a HIT-REACTION pose: staggered backward toward the right, sketch lines smudging and "
            "breaking apart, ink cracking",
        ),
        enemy_ids=("draft_soldier",),
    ),
    Sprite(
        key="rewrite-engine",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/rust-hulk-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the REWRITE ENGINE, an elite: a large heavy walking machine shaped like a monstrous antique "
        "typewriter fused with a printing press — an ink-black lacquered chassis on four short thick legs, a fan of "
        "long mechanical typebar arms on its back, a roller of blank paper-white sheet on top, and mounted on its "
        "front a tall glowing amber vertical text-cursor bar used as a cannon, holes of pure empty white void "
        "punched into the paper it trails",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: the cursor-cannon firing a straight thick beam of amber light "
            "toward the left, typebar arms hammering down",
            hit="now in a HIT-REACTION pose: rocked backward toward the right, typebars snapping loose, the paper "
            "roll tearing, ink and sparks spraying",
        ),
        enemy_ids=("rewrite_engine",),
    ),
    Sprite(
        key="memory-judge",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/trooper-captain-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the MEMORY JUDGE, an elite: a tall stern judge figure in long layered robes of ink-black and "
        "paper-white, a tall white judicial headpiece, its face a blank paper-white mask with one thin amber "
        "cursor-slit eye, holding a heavy black gavel in one hand and a balance scale of two hanging open books in "
        "the other, loose pages orbiting it, a high collar like the back of a judge's bench",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: swinging the gavel down and pointing it toward the left, a homing "
            "ring of amber light shooting from it",
            hit="now in a HIT-REACTION pose: staggered backward toward the right, the mask cracking, the scale "
            "tipping, pages scattering",
        ),
        enemy_ids=("memory_judge",),
    ),
    Sprite(
        key="null-choir",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/purge-seraph-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="the NULL CHOIR, an elite: three eyeless paper-white porcelain chorister masks with wide-open round "
        "black mouths shaped like zeros, fused together on one floating body of long flowing ink-black choir robes "
        "that dissolve into drifting glyph strokes at the hem, each mask crowned by a thin black horizontal censor "
        "bar instead of a halo, faint cyan sound-ripples around the mouths — floating in the air",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: all three mouths singing at once, a compact ring of pale-cyan "
            "and amber sound waves bursting outward around the body",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, one mask cracking, robes tearing "
            "into loose ink strokes",
        ),
        enemy_ids=("null_choir",),
    ),
    Sprite(
        key="first-draft",
        kind="elite",
        idle_ref="resources/neo-seoul/v2/sprites/blade-dancer-idle.webp",
        idle_ref_note=ORIGIN_NOTE,
        subject="THE FIRST DRAFT, an elite: a human swordsman drawn as a large rough charcoal-and-graphite SKETCH on "
        "paper come to life — a hooded young man in a long coat with a face mask, rendered entirely in paper-white "
        "with bold black charcoal outlines, crosshatching, smudges, visible eraser marks and loose construction "
        "lines, a few parts left unfinished, glowing amber at the eyes, gripping a long sketched blade in a "
        "fighting stance",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: rushing forward in a fast slashing lunge toward the left, a wide "
            "arc of charcoal speed-lines and smudge trailing the blade",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, sketch lines smudging, paper "
            "tearing at the edges, charcoal dust flying",
        ),
        enemy_ids=("first_draft",),
    ),
    Sprite(
        key="ix-origin",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a6_boss_ix_origin.webp",
        idle_ref_note=ORIGIN_SPLASH_NOTE,
        subject="IX — ORIGIN, the act-6 boss: the FIRST, older draft of the administrator AI — a slender gentle "
        "floating figure of matte paper-white porcelain and layered parchment, a calm almost-human face with "
        "soft amber eyes, robes of overlapping paper sheets, a warm amber lantern-glow heart in its chest, its "
        "lower body unfinished and dissolving into loose sketched draft lines and glyph strokes, hovering in the air",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: extending one open hand toward the left and releasing a compact "
            "straight beam of warm amber light, paper robes billowing",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the porcelain face cracking, "
            "parchment robes tearing into loose pages and glyph strokes",
        ),
        enemy_ids=("ix_origin",),
    ),
    Sprite(
        key="omega-complete",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a6_boss_omega.webp",
        idle_ref_note=ORIGIN_SPLASH_NOTE,
        subject="OMEGA — COMPLETE, the act-6 boss: the finished Architect — a monumental symmetrical armoured "
        "colossus of smooth ink-black stone and white, its whole body traced with glowing pale-cyan blueprint lines, "
        "a round amber lens eye in a cathedral-like crowned head, a long rolled-blueprint cape, wielding a huge "
        "straight-edged blade shaped like a drafting ruler",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: sweeping the huge ruler-blade horizontally toward the left, a "
            "long flat arc of cyan blueprint light trailing it",
            hit="now in a HIT-REACTION pose: rocked backward toward the right, stone plates cracking, blueprint "
            "lines flickering, fragments flying",
        ),
        enemy_ids=("omega_complete",),
    ),
    Sprite(
        key="loop-engine",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a6_boss_loop_engine.webp",
        idle_ref_note=ORIGIN_SPLASH_NOTE,
        subject="THE LOOP ENGINE, the act-6 boss: a vast stationary machine like a giant clock-heart — concentric "
        "rotating rings of ink-black and brass dials engraved with abstract glyph marks around a pulsing amber "
        "heart-core, ink-black pipes like arteries and pistons, mounted on a heavy black base (it never moves) — "
        "the whole machine fits in the frame",
        poses=_enemy_poses(
            attack="now ATTACKING: the rings spinning fast and the amber heart-core releasing a compact circular "
            "shockwave pulse of amber light around the machine",
            hit="now in a HIT-REACTION pose: the machine jolted and tilting back toward the right, a dial ring "
            "cracked and slipping, the heart-core flickering, sparks and glyph fragments flying",
        ),
        enemy_ids=("loop_engine",),
    ),
    Sprite(
        key="first-connector",
        kind="boss",
        idle_ref="resources/neo-seoul/v2/boss/a6_secret_first_connector.webp",
        idle_ref_note=ORIGIN_SPLASH_NOTE,
        subject="THE FIRST CONNECTOR, the secret act-6 boss: the shadow of the player — a lean hooded young man in "
        "a long tactical coat, face mask and combat boots, but his whole body is a dark silhouette of dense "
        "ink-black glyph text flowing over him like moving code, faint amber glyph sparks, two glowing amber eyes "
        "under the hood, a short blade in one hand",
        poses=_enemy_poses(
            attack="now ATTACKING toward the LEFT: dashing forward in a low lunge and striking with the short blade, "
            "a compact burst of black glyph shards and amber light at the blade",
            hit="now in a HIT-REACTION pose: recoiling backward toward the right, the silhouette fraying into loose "
            "glyph strokes and ink drops",
        ),
        enemy_ids=("first_connector",),
    ),
    # ------------------------------------------------------------------ companions (face RIGHT)
    # Same key names as the classic sprites (resources/neo-seoul/characters/combat/<key>-<pose>.png), so the
    # UI's sprite() resolves the v2 version first. Identity comes from the old idle sprite + the portrait.
    *[
        Sprite(
            key=key,
            kind="party",
            idle_ref=f"resources/neo-seoul/characters/combat/{key}-idle.png",
            idle_ref_note=COMPANION_NOTE,
            extra_refs=(f"resources/neo-seoul/characters/{key}.png",),
            subject=subject,
            poses=_party_poses(attack=attack),
        )
        for key, subject, attack in [
            (
                "se-rin",
                "SE-RIN, a young Korean woman courier/smuggler: long straight black hair, red lips, a fitted black "
                "leather biker jacket, black leather pants, tall black boots, a compact submachine gun",
                "now in an ATTACK pose toward the RIGHT edge of the frame: firing the compact submachine gun with "
                "both hands, a small muzzle flash, hair swinging",
            ),
            (
                "tae-o",
                "TAE-O, a rugged middle-aged Korean man, a deserter enforcer: short black hair, a scar across his "
                "cheek, stern face, a heavy black tactical long coat over an armoured vest, an assault rifle",
                "now in an ATTACK pose toward the RIGHT edge of the frame: firing the assault rifle from the "
                "shoulder, braced wide stance, a small muzzle flash",
            ),
            (
                "han",
                "HAN, a lean young Korean man, an unplugged hacker: messy black hair, a dark high-collared "
                "techwear jacket with cyan accent lights, a handheld cyan-glowing hacking pistol/deck",
                "now in an ATTACK pose toward the RIGHT edge of the frame: aiming the hacking pistol forward, a "
                "compact crackling cyan electric pulse at its muzzle",
            ),
            (
                "su-ah",
                "SU-AH, a young Korean woman engineer (echo smith): black hair tied up in a bun, thin glasses, a "
                "dark jacket and tool belt with violet/magenta light accents, a glowing violet energy blade-tool",
                "now in an ATTACK pose toward the RIGHT edge of the frame: slashing the glowing violet "
                "blade-tool forward, a compact violet energy arc trailing it",
            ),
            (
                "kai",
                "KAI, a slender discarded android: white ceramic body plating with black joints, a smooth white "
                "faceplate with glowing blue eyes, an exposed mechanical right arm with copper/orange components",
                "now in an ATTACK pose toward the RIGHT edge of the frame: thrusting the mechanical arm forward, "
                "its forearm opened into a compact charged blue energy blast at the fist",
            ),
            (
                "lin-yue",
                "LIN-YUE, an elegant woman night-market broker: black hair pinned up with a gold hairpin, red "
                "lips, a long black-and-gold brocade high-collared coat-dress, a small ornate pistol",
                "now in an ATTACK pose toward the RIGHT edge of the frame: extending one arm to fire the small "
                "ornate pistol with precision, a tiny muzzle flash, coat-dress flowing",
            ),
        ]
    ],
    # ------------------------------------------------------------------ R7d new companions (face RIGHT)
    # content/packs/new_companions. Identity: the new portrait (characters/<stem>.png, gen_new_companions.py) as
    # the SECOND idle reference; the FIRST is the same being's enemy sprite (Io, Rem — the boss keys 'io'/'rem'
    # stay the hostile versions, so the allies are 'io-ally'/'rem-ally') or a style/costume source.
    *[
        Sprite(
            key=key,
            kind="party",
            idle_ref=f"resources/neo-seoul/v2/sprites/{first_ref}-idle.webp",
            idle_ref_note=(
                f"Reference images: the FIRST is {first_note}; the SECOND is a close-up portrait of this character "
                "(face, hair, outfit identity). Draw THIS character as a fresh full-body combat sprite in the "
                "painterly rendering style of the first image, turned to face RIGHT."
            ),
            extra_refs=(f"resources/neo-seoul/characters/{portrait}.png",),
            subject=subject,
            poses=_party_poses(**poses),
        )
        for key, first_ref, first_note, portrait, subject, poses in [
            (
                "io-ally",
                "io",
                "this same AI's full-body sprite from when she was the hostile act-4 boss (it faces left) — keep "
                "her face, glass dome and halo, porcelain-and-glass materials and colours, but as a calm, less "
                "ornate ally, without ink tears and without the storm of pages",
                "io",
                "IO, the librarian AI turned companion: a tall slender feminine android of white porcelain and "
                "clear frosted glass, a clear glass dome over the crown ringed by thin antique-gold halo bands, "
                "dark liquid-ink eyes, softly glowing cracked glass joints, a knee-length high-collared "
                "archivist's coat of translucent glass panels like pages, a worn brown leather book-return satchel "
                "across the body, a small brass reading lamp hanging at the hip, a few loose blank pages drifting "
                "— calm and courteous",
                {
                    "attack": "now in an ATTACK pose toward the RIGHT edge of the frame: one porcelain hand "
                    "extended palm-out projecting a compact straight beam of cold white catalogue light, coat "
                    "panels and a few pages swirling",
                },
            ),
            (
                "miro",
                "se-rin",
                "another companion's combat sprite from this game: use it ONLY for the rendering style, line "
                "quality, rim light and transparent isolation — draw a completely different character",
                "miro",
                "MIRO, the forgotten reader, a small child scout of about ten (clearly child-sized and slight): "
                "messy dark brown hair, the face entirely hidden behind several overlapping blank paper library "
                "return cards (no eyes or mouth visible), a dark ragged hooded cloak over a grey scarf, worn soft "
                "boots, a razor-thin paper blade held low in one hand, a light crouched sneaking stance",
                {
                    "attack": "now in an ATTACK pose toward the RIGHT edge of the frame: darting low and slashing "
                    "the razor-thin paper blade forward, a compact crimson cut-streak, paper scraps flying",
                },
            ),
            (
                "doyun",
                "listed-citizen",
                "a 'listed citizen' marked for erasure — Doyun was one of them: reuse that worn grey work-jacket "
                "outfit, the barcode wrist band and the rendering style, but the person is the younger one in the "
                "SECOND image, standing firm instead of cowering",
                "doyun",
                "DOYUN, an ordinary young Korean man of about twenty who escaped the optimization list, now a "
                "guardian: short slightly messy black hair, a soft earnest face, a faded grey work jacket over a "
                "stretched sweater, baggy trousers, scuffed sneakers, a crumpled paper number tag pinned on the "
                "chest turned blank side out, a cracked dim blue-white barcode band on one wrist, a dented "
                "salvaged riot shield with no markings on his left arm — not a soldier, but planted firmly",
                {
                    "attack": "now in an ATTACK pose toward the RIGHT edge of the frame: shoving forward "
                    "shoulder-first behind the dented riot shield, a compact burst of impact sparks at the shield "
                    "face",
                    "guard": "now in a defensive GUARD stance: knees bent, braced behind the raised dented riot "
                    "shield, a translucent cyan hexagonal energy field flaring across the shield's face on the "
                    "right side",
                },
            ),
            (
                "bel",
                "chief-censor",
                "the Chief Censor of the Glass Library Censorate: use it ONLY for the Censorate uniform design "
                "language (white porcelain plates, black panels, antique-brass trim) and the rendering style — Bel "
                "is a human ex-censor, a completely different, unarmoured person",
                "bel",
                "BEL, a former censor who quit the Glass Library Censorate: an androgynous Korean person in their "
                "thirties, black asymmetric bob, sharp tired eyes, ink-stained fingers, the Censorate uniform — a "
                "long high-collared coat of white porcelain-like plates and black panels with antique-brass trim "
                "— worn open with the sleeves rolled to the elbows and the rank insignia torn off, a narrow black "
                "eye-bar visor pushed up into the hair, dark trousers and boots, holding a long red fountain-pen "
                "stylus like a pistol",
                {
                    "attack": "now in an ATTACK pose toward the RIGHT edge of the frame: one arm extended aiming "
                    "the long red fountain-pen stylus, a short bright crimson ink-line shot flaring at its nib, "
                    "coat swinging",
                },
            ),
            (
                "rem-ally",
                "rem",
                "this same figure's full-body sprite from when it was the hostile act-5 boss REM (it faces left) — "
                "keep the long violet-black hair, the hairpin, the dark robes with gold chains and the violet "
                "static veils, but softened as an ally: tidier, shorter veils, the porcelain mask lifted",
                "rem-ally",
                "REM, the Dream Executor turned ally: a tall slender figure with long straight violet-black hair "
                "and an ornate dark-gold hairpin, a pale gentle face with half-open drowsy violet eyes, the smooth "
                "white porcelain executor mask LIFTED and tilted up on top of the head, long dark robes with fine "
                "gold chains and translucent violet static veils, a few small glowing pale-violet moths, a dark "
                "shutdown terminal hanging unplugged at the hip, a slender blade of translucent violet "
                "dream-static in one hand",
                {
                    "attack": "now in an ATTACK pose toward the RIGHT edge of the frame: sweeping the slender "
                    "violet dream-static blade forward, a compact arc of violet scanlines and a few moths trailing "
                    "it",
                },
            ),
        ]
    ],
]

BY_KEY = {s.key: s for s in SPRITES}

# Raw generations whose facing came out wrong -> mirrored in process.py. Filled in after spot-checks.
FLIP: set[str] = set()


def raw_path(key: str, pose: str) -> Path:
    return RAW_DIR / f"{key}-{pose}.png"


def out_path(key: str, pose: str) -> Path:
    return OUT_DIR / f"{key}-{pose}.webp"


def build_prompt(s: Sprite, pose: str, *, has_ref: bool) -> str:
    w, h = s.size.split("x")
    orient = "landscape" if int(w) > int(h) else "portrait"
    side = s.facing.upper()
    facing = (
        f"FACING {side}: the body and face are turned toward the {side} edge of the frame (three-quarter view), "
        f"as a {'party member on the left of a tactics board looking at enemies on the right' if s.facing == 'right' else 'enemy on the right of a tactics board looking at the party on the left'}."
    )
    head = (
        f"Generate ONE {s.size} {orient} PNG image with a TRUE TRANSPARENT background (real alpha channel — no "
        "backdrop colour, no floor, no ground shadow, no vignette): a full-body game combat sprite for a "
        "cyberpunk Neo-Seoul tactical roguelite."
    )
    if pose == "idle":
        ref = f" {s.idle_ref_note}" if has_ref and s.idle_ref_note else ""
        body = f"{ref} Subject: {s.subject}. Idle combat-ready stance. {facing}"
    else:
        extra = (
            " Reference images: the FIRST is this character's full-body idle sprite; the others are close-up "
            "portraits of the same character for face/hair identity only."
            if s.extra_refs
            else ""
        )
        body = (
            f"{extra} Draw the EXACT same character/design as the {'first ' if s.extra_refs else ''}reference image "
            "(same face, hair, proportions, colours, armour, "
            f"clothing and details) — {s.poses[pose]}. Same rendering style, same facing ({side}), transparent "
            f"background. Subject for context: {s.subject}. {facing}"
        )
    tail = (
        " The ENTIRE body is visible from top to bottom with empty transparent margin on every side — nothing "
        f"cropped. {STYLE} Do NOT save, find, copy or move files and do not run shell commands — just generate "
        "it once."
    )
    return head + body + tail
