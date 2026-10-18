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
    kind: str  # boss | party | elite | enemy (normal/minion variant)
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
        return "right" if self.kind == "party" else "left"

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
        enemy_ids=("spider_matriarch", "arachne_queen"),
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
        enemy_ids=("incinerator", "jujak_core"),
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
