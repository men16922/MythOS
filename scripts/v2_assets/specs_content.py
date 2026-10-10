"""Items 8-10: one image per event / card / implant / consumable in src/mythos_ui/src/v2/content/.

Ids come from the live content files (dump_content.mjs), so new ids are picked up on the next run. Each known
id has a hand-written visual brief; an unknown id falls back to a brief built from its name/text/type.
"""

from __future__ import annotations

from common import COMPANIONS, ImageJob, content_json, portrait

CONNECTOR = "the Connector (a lean hooded figure in a long black coat, a dark face mask and a teal-glowing headset)"

# ------------------------------------------------------------------------------------------- events

EVENT_SCENES: dict[str, str] = {
    "a1_opening": "A wet back alley at night seen low from the ground. Two red drone searchlights crawl down the alley toward the viewer. In the foreground a glowing data core has rolled out of a smashed ration capsule, and an old man slumps against the wall, one hand reaching out, still breathing.",
    "a1_welfare_capsule": "A dead welfare housing block in a blackout. A single coffin-like sleep capsule still glows with dim emergency light; from inside, a middle-aged man presses his palm to the fogged glass. A small red display blinks on the capsule. At the far end of the alley the lights of approaching drones.",
    "a1_drone_wreck": "Grey-blue dawn light bleeding across a large puddle on a ruined street. A crashed sentinel drone lies nose-down in the water, one rotor still turning, its red lens flickering; through a crack in its hull a warm glowing core is visible.",
    "a1_han_shortcut": "Han crouches on a round drain cover in a narrow wet alley, a data cable looped around his neck, a sly half-smile, tapping the cover with his toe; mist and the sound of running water rise from below.",
    "a1_tae_o_barricade": "Tae-o sits on top of a barricade made of two wrecked buses at night, a carbine across his knees, grinding out a cigarette, a scratched-out patch on his shoulder, staring down at the viewer.",
    "a1_water_spider_debt": "Se-rin stands under a collapsed concrete overpass in the rain, holding a broken radio, looking at a wall marked with rows of chalk tally strokes, the last one only half drawn. Sombre and quiet, distant sirens.",
    "a1_dead_substation": "Inside a small electrical substation whose door has been torn off: ozone haze, dead transformers, one huge lever on the wall, an orange repair-crew toolbox on the floor beside it; flashlight beams of an approaching crew spill in through the doorway.",
    "a1_ark_billboard": "A tall billboard tower standing in the middle of urban ruins at night; its giant screen shows a bright image of laughing children in front of brand-new apartment towers; below it a maintenance hatch hangs open with exposed modules; the camera on top looks the other way.",
    "a1_rooftop_chase": "A first-person view running toward the edge of a wet rooftop at night: a gap to the next building, a ventilation duct on the left, a rusted water tank on the right, a market alley far below, red drone light washing in from behind.",
    "a2_recruit": "An abandoned subway transfer level flickering back to life: hand-repaired cables, an old rice cooker steaming, a few hooded survivors waiting under work lamps, each with their own gear. Warm light pushing against the dark.",
    "a2_memory_stall": "A night-market stall on a barge: shelves of small glass jars, each holding a single floating point of light, little paper tags with no readable writing; an old stallkeeper pushing up a jeweller's loupe; one padlocked jar in a case at the back.",
    "a2_lin_yue_ledger": "Lin-yue sits in the cabin of a barge at a lacquered table, incense smoke curling, a gilt ledger open in front of her and a brush just set down, a ring tapping the ledger's edge, a knowing look.",
    "a2_lin_yue_request": "Lin-yue in a dim barge cabin lowering a paper lantern, her ledger closed, sliding a small gilt seal across the table, her fingers lingering on it, serious for the first time.",
    "a2_memory_forge": "Su-ah at a cluttered workbench in violet arc light, goggles pushed up on her forehead, pointing at molten data slag cooling like iron; a half-open drawer glows faintly.",
    "a2_subway_hub": "A derelict subway control hub: fibre bundles sagging over rusted rails, one live control screen glowing, three big switch levers, and in the tunnel the headlight of an unmanned freight train approaching.",
    "a2_kai_scrapyard": "Kai, a silver-white android, sits propped against a hill of discarded android arms and legs in a scrapyard at night, blue eyes blinking slowly, a cracked speaker grille on his chest, rain.",
    "a2_debt_collectors": "Under the plain, blank canvas awning of a Korean street noodle stall in the night market (the awning and stall carry no writing or signs at all, only a hanging bulb and steam), three collectors in dark coats press a scanner to the stall owner's wrist; the owner's daughter stands frozen with a ladle; customers stare into their bowls. One collector looks toward the viewer.",
    "a2_refuge_night": "Night in an underground subway refuge: a paper chart on the tiled wall with no readable writing, steam rising from an old rice cooker, a small radio, a child reaching toward the viewer, adults by lamplight watching, half wary and half hopeful.",
    "a3_spire_gate": "At the top of wide white stairs, a seamless white door; raindrops evaporate just before touching it; a scanning arch of light in front; two motionless white enforcer robots stand on either side. Seamless plain white architecture with no signs, screens or neon anywhere; the foreground steps fall into soft shadow.",
    "a3_data_incinerator": "An industrial data incinerator: a conveyor carrying small memory drives into a roaring red furnace, cold blue coolant pipes clashing with the heat, one drive on the belt blinking like a pulse, a control panel with a lever and a red protective switch cover.",
    "a3_control_net_ghost": "A long server corridor lit by blue lines running from floor to ceiling; in the middle stands a translucent faceless human figure made of light, flickering and repeating like a looped recording.",
    "a3_blank_in_list": "A vast wall of flowing horizontal lines of light, abstract and unreadable, and among them a single empty glowing gap; a hand reaches toward the gap, which trembles like a heartbeat.",
    "a3_kai_dream": "Kai, a silver-white android with eyes shifting from blue to yellow, kneels on a white glass floor in a maintenance level; under the glass lies preserved old asphalt with zebra-crossing stripes and a small yellow umbrella.",
    "a3_sleeping_frames": "A vast storage hall in the Spire: endless shelves, a white android lying on each with eyes closed, and faint light moving slowly beneath their eyelids as if dreaming.",
    "a3_optimization_queue": "A sterile white room with a single terminal; above it three pinned holographic portraits float: an old man, a mechanic, a child; a blinking cursor of light; clinical and chilling.",
    "a3_ix_offer": "Elevator doors open onto a white room as tall as a cathedral; vast rings turn slowly overhead; a single red point of light watches; from the floor rises a medical treatment pod with its door open and warm light inside.",
    # batch 2 (2026-10-11)
    "a1_dark_table": "A dead laundromat with rows of broken washing machines. People crouch around a single candle on a makeshift card table, ration chips and painkiller packets as stakes. An old dealer, one hand with six fingers, drives a rusted knife into the table; five finger-shaped grooves are worn into the wood around it. An open cash box sits on the floor. Candlelight, tense, desperate.",
    "a1_let_the_hound_in": "A stairwell in a gutted concrete building at night. Tae-o sits on the steps pressing a bleeding wound in his side, a scraped-off patch on his shoulder, looking up. Se-rin stands over him with her knife drawn, glaring down at him. Both turn toward the viewer, waiting for a decision.",
    "a1_compensation_kiosk": "On a dark, dead street in a blackout, a single ration kiosk lights up as the viewer approaches; its dispenser hatch hangs open and warm golden light spills out onto the wet pavement; its screen shows only endless columns of tiny grey marks, far too small to read. Rain, empty street, eerie politeness.",
    "a1_dry_footprints": "A rain-soaked back alley at night. Rain pours down, yet a trail of perfectly dry footprints leads deeper into the alley, one foot dragging slightly. At each corner a simple chalk arrow is drawn on the wet wall. Uncanny deja vu, quiet dread.",
    "a2_moon_dice": "A smoky gambling den below a barge deck, lanterns swinging with the hull. A dealer in black gloves opens a hand holding dice carved from glowing memory chips, a faint ghostly light escaping from them. At the next table a customer slumps after losing again. Suspicious, seductive.",
    "a2_broadcast_or_refuge": "A cramped public-address booth in the night market, full of cables and old loudspeakers. Han holds one finger over a glowing switch, defiant. Se-rin grips his wrist hard, urgent and angry. A tense standoff between the two of them, the market lights beyond the booth window.",
    "a2_ix_amnesty": "The undercity night market frozen in place: every screen at once, a noodle-stall menu board, a currency board and a toy in a child's hand, has gone blank glowing white, each showing only a single tilted cursor. People stand frozen in the white glow. Polite menace.",
    "a2_eaters_table": "The end of a dark tunnel where something has fed. Scattered on the floor: a torn leather jacket, half a stick of chalk, the bent ribs of a yellow umbrella; faint warmth steams from the jacket pockets. An old speaker sits in the dark. Violet glitch residue on the walls, horror stillness.",
    "a3_lucky_draw": "A sterile white staff lounge in the Spire. On the white wall hangs a round game machine with a glowing prize wheel; each slot of the wheel shows a simple pictogram (a star, a sun, a rice bowl, a suitcase) and one slot is solid black. The machine blinks red. Clinical and absurd.",
    "a3_the_surrender": "A white corridor in the Spire. A young enforcer with his helmet off kneels on the floor, shaking hands raised. Tae-o aims his carbine at him, unmoved. Se-rin steps between them with her arms spread wide. A tense standoff in cold white light.",
    "a3_elevator_quote": "Inside a sealed elevator with mirrored walls and no floor display, soft white light falling from a ceiling speaker grille. A tired hooded figure stands in the middle; in the mirrored wall their reflection is caught a beat out of sync, turned slightly differently from them. Unsettling calm.",
    "a3_other_pod": "At the far end of a white storage floor, a single sleep pod stands apart from endless shelves. Behind frosted glass lies a sleeping figure identical to the hooded Connector, a scar on the face and chalk dust under the nails, one fist clenched around something. A small blank tag on the pod. Cold, uncanny.",
}


def _first_mention(scene: str, companion_id: str) -> int:
    name = COMPANIONS[companion_id][1].split(",")[0]
    pos = scene.find(name)
    return pos if pos >= 0 else len(scene)


def events_jobs() -> list[ImageJob]:
    jobs = []
    for ev in content_json()["events"]:
        eid = ev["id"]
        speaker = ev.get("speaker")
        scene = EVENT_SCENES.get(eid)
        if not scene:
            scene = f"A story moment titled '{ev['title']['en']}': {ev['text']['en'][:500]}"
        refs = []
        hints = ev.get("gmHints") or []
        pair = [h for h in hints if h in COMPANIONS] if "companion conflict" in hints else []
        if len(pair) >= 2:
            # Companion-conflict events show both companions; references follow the order they are named in.
            pair = sorted(pair[:2], key=lambda cid: _first_mention(scene, cid))
            refs = [portrait(cid) for cid in pair]
            who = "; ".join(COMPANIONS[cid][1] for cid in pair)
            scene = f"{scene} The characters, in this order: {who}."
        elif speaker in COMPANIONS:
            refs = [portrait(speaker)]
            scene = f"{scene} The character is {COMPANIONS[speaker][1]}."
        prompt = f"Narrative event illustration, wide cinematic shot. {scene} The bottom of the scene falls naturally into shadow (no overlay, band or letterbox)."
        jobs.append(
            ImageJob(f"events/{eid}.webp", prompt, "16:9", (1600, 900), refs=refs, image_size="2K")
        )
    return jobs


# ------------------------------------------------------------------------------------------- cards

C = CONNECTOR
CARD_SUBJECTS: dict[str, str] = {
    # starters
    "packet_shot": f"{C} fires a bolt of compressed cyan data light from an outstretched hand into a drone, impact sparks",
    "covering_noise": "a shimmering wall of cyan static noise forming a shield in front of a crouching ally",
    "shove": f"{C} shoves an armoured enforcer backwards with a burst of force, rain spraying",
    "signal_step": f"{C} dissolving into a stream of cyan pixels and reappearing a few steps away, teleport trail",
    "repulse": "a concussive blue shockwave ring blasting a drone backwards",
    "magnetic_pull": "violet magnetic field lines yanking a robot toward an outstretched gloved hand",
    "system_hack": "a hacker's glowing hand rewriting a red holographic targeting reticle so it turns back toward the drone that fired it",
    "skim": "a quick slash with a glowing knife while gold credit chips spill out of a robot",
    "overclock": f"a cyberdeck glowing white-hot on the arm of {C}, energy surging up the arm, heat haze",
    "patch_protocol": "glowing teal nanite threads stitching a wound on an ally's arm, soft healing light",
    "shield_field": "a dome of hexagonal cyan energy over a small group of allies in the rain",
    "memory_resonance": "ghostly violet echo copies of a hooded fighter striking together, a glowing violet mark on the target",
    # common pool
    "jab": "a fast close-up punch with an armoured cyber gauntlet, motion blur",
    "scattershot": "a burst of glowing pellets fanning out in four directions, enemies knocked back",
    "barricade": "a slab of metal cover slamming up out of the wet asphalt",
    "brace": "a figure bracing behind crossed arms as a cyan energy barrier absorbs a hit",
    "smoke_step": "a hooded figure slipping through thick teal smoke, half visible",
    "target_laser": "a red laser dot settling on a robot's head, a glowing target mark",
    "flashbang": "a blinding white flash in a narrow alley, enemies reeling",
    "grapple": "a grappling line shooting across a gap between two figures as they swap places",
    "double_tap": "two muzzle flashes in quick succession from a pistol, two bright impact sparks",
    "incendiary_round": "a round striking a drone and igniting it in orange flame",
    "suppressing_fire": "a stream of tracer fire pinning an enemy behind cover",
    "static_discharge": f"arcs of electricity bursting outward in every direction from {C}",
    "shockwave": "a ground-pound shockwave cracking the asphalt in a wide square ring",
    "emp_burst": "a cross-shaped blue EMP pulse knocking drones out of the air",
    "overload_strike": "a single massive overcharged punch, a white-hot gauntlet, explosive impact",
    "void_kick": "a kick sending a robot flying off the edge of a rooftop into the dark void",
    "jam_signal": "a drone's red attack beam fizzling into harmless static",
    "ricochet": "a bullet bouncing off a wall in a bright zigzag trail and hitting two targets",
    "guard_protocol": "a protective hexagonal shield aura forming around an ally, steady glow",
    "firebomb": "a firebomb bursting into a cross-shaped wash of flames on a wet street",
    "pressure_point": "a precise strike on a glowing weak-point marker on an armoured enemy",
    "adrenaline": "a syringe of glowing stimulant, a heartbeat of light racing through veins",
    "wall_up": "several metal barriers erupting from the ground in a cross pattern",
    "orbital_strike": "a pillar of blinding light falling from the sky onto a city block",
    "blackout": "an entire street plunging into darkness as every light dies, enemies frozen in sparks",
    "ghost_protocol": "a squad of translucent ghostly figures moving swiftly through the rain",
    "deadeye": "an eye behind a rifle scope, a single perfect shot piercing armour",
    "blink_strike": f"{C} flashing out of a teleport and striking with a ring of force",
    "vector_kick": "a powerful flying kick launching an enemy across the frame",
    "riptide": "a straight beam of rushing energy shoving several units along its line",
    "singularity": "a tiny black-hole vortex pulling in debris and then hurling it outward",
    "smash_and_grab": "a gloved hand smashing a glass case and snatching glowing credit chips",
    "hot_wire": "hands sparking two wires together in an exposed panel, blue sparks leaping into a robot",
    "zero_day": "a red enemy attack beam reversing back on itself, mirrored holographic arrows, a target mark",
    "insider_trading": "a shadowy deal across a table, gold chips and glowing cards changing hands",
    "resonant_shield": "two overlapping shields of violet echo light protecting two figures",
    "echo_mend": "soft violet echoes of light healing a group of tired allies",
    "kinship": "a circle of allies joined by glowing threads of light, a protective aura",
    "bear_the_burden": f"{C} stepping in front of an ally and taking the blow on a shield of light",
    "redline": "an overheating cybernetic arm, glowing vents, a needle gauge pinned in the red",
    "overheat": f"{C} surrounded by a ring of searing heat and orange light",
    "thermal_lance": "a straight beam of white-hot plasma cutting across the frame",
    "afterburner": "jets of blue-white flame from boot thrusters, sparks, speed",
    "meltdown": "a reactor core erupting into a molten orange explosion",
    "packet_storm": "dozens of tiny glowing data packets swarming like bees toward a target",
    "firewall": "a wall of digital flame rising between allies and enemies",
    "mirror_code": "a mirrored hologram reflecting an enemy's attack back at it",
    "kill_switch": "a hand slamming down a red kill switch, a robot convulsing with electricity",
    "daemon": "a sinister spectral daemon, a serpent of glowing light coiling around enemies",
    "riot_shield": "a battered spiked riot shield taking a hit, sparks flying",
    "shield_bash": "a riot shield slamming into an enemy",
    "bulwark": "a massive glowing tower-shield aura around a planted figure",
    "hold_the_line": "a line of allies with locked energy shields under fire",
    "iron_bloom": "metal thorns blooming like a flower from an ally's armour",
    # companions
    "serin_water_spider": "Se-rin leaping between wet rooftops like a water spider, rain arcing around her",
    "serin_cover_fire": "Se-rin firing a pistol held in both hands from behind a concrete barrier on a dark rainy rooftop, shielding her allies; the background is dark blurred rain and haze with no signs or neon at all",
    "serin_escape_route": "Se-rin pointing out an escape route through a narrow alley, allies running past her",
    "taeo_hound_slam": "Tae-o slamming the stock of his carbine into an enforcer robot",
    "taeo_iron_stance": "Tae-o planted in an immovable stance, armour plates bristling with spikes",
    "taeo_guardian_wall": "Tae-o standing in front of his allies behind a translucent energy wall",
    "han_signal_break": "Han crouching and jamming a signal with a handheld device, sparks",
    "han_shortcut_call": "Han making a call on a cracked phone while a drone's red beam turns away",
    "han_system_intrusion": "Han with a cable plugged into a robot's neck port, holographic light patterns",
    "suah_forge_blades": "Su-ah at a forge hammering glowing violet energy blades",
    "suah_tempered_plate": "Su-ah quenching a glowing armour plate in a burst of steam",
    "suah_masterwork": "Su-ah holding up a finished glowing blade and shield",
    "kai_scope_in": "Kai looking through a long rifle scope, his blue eye glowing",
    "kai_rx_beam": "Kai firing a long straight blue beam from his rifle",
    "kai_dreamshot": "Kai firing a shot that leaves a trail of warm yellow dream light",
    "linyue_exchange": "Lin-yue sliding a gold coin across a lacquered table",
    "linyue_precision_emp": "Lin-yue flicking a small gold disc that crackles with blue electricity",
    "linyue_gold_hairpin": "Lin-yue throwing her gold hairpin like a dart",
    # tokens / junk
    "echo_blade": "a translucent violet blade of echo light floating in the dark",
    "echo_shield": "a translucent violet shield of echo light floating in the dark",
    "static": "a field of grey television static torn by magenta glitch lines, nothing recognisable",
    "trace_bug": "a tiny red-eyed robotic bug burrowed into a circuit board, glitch noise",
    "corrupted_echo": "a distorted ghostly face breaking apart into corrupted pixels",
}

TYPE_MOOD = {
    "attack": "a dynamic action moment, strong motion and impact",
    "skill": "a defensive moment: shields, barriers, protective light",
    "tactic": "a tactical moment: hacking, movement, repositioning, holographic light",
    "power": "a transformation: a radiant aura of power surrounding the subject",
    "junk": "corrupted glitch static, desaturated grey noise with magenta tears, unsettling",
}

CARD_FRAME = (
    "Full-bleed illustration for the picture window of a game card: the artwork only, edge to edge, with no card "
    "frame, no border, no rounded corners and no text box. Portrait format. Single clear focal subject in the "
    "centre, bold silhouette that reads at a small size, simple uncluttered background (any distant neon signs are "
    "blank abstract shapes), darker toward the edges."
)


def cards_jobs() -> list[ImageJob]:
    jobs = []
    for card in content_json()["cards"]:
        cid, ctype, owner = card["id"], card.get("type", "attack"), card.get("owner", "any")
        subject = (
            CARD_SUBJECTS.get(cid)
            or f"an image for the ability '{card['name']['en']}' ({card['text']['en']})"
        )
        refs = []
        if owner in COMPANIONS:
            refs = [portrait(owner)]
            subject = f"{subject}. The character is {COMPANIONS[owner][1]}"
        mood = TYPE_MOOD.get(ctype, TYPE_MOOD["attack"])
        prompt = f"{CARD_FRAME} Subject: {subject}. Mood: {mood}."
        jobs.append(
            ImageJob(f"cards/{cid}.webp", prompt, "3:4", (600, 800), refs=refs, trim_frame=True)
        )
    return jobs


# ------------------------------------------------------------------------------------------- implants

GLOW = {
    "starter": "pale white-teal",
    "common": "teal",
    "uncommon": "cyan and violet",
    "rare": "warm gold",
    "boss": "deep crimson",
    "shop": "emerald green",
}

IMPLANT_OBJECTS: dict[str, str] = {
    "erased_id": "a cracked translucent ID chip whose photo area is scratched blank",
    "overclocked_deck": "a compact cyberdeck hacking console with overheating cooling fins",
    "cracked_cube": "a cracked glass data cube with light leaking from its fractures",
    "mesh_vest": "a folded armoured vest panel of hexagonal mesh weave",
    "recoil_boots": "a pair of armoured boots with piston heels",
    "scrap_plating": "a shield plate welded together from scrap metal pieces",
    "credit_chip": "a gold-edged credit chip coin engraved with circuitry",
    "pocket_jammer": "a small handheld signal jammer with stubby antennae",
    "stim_reservoir": "a glass reservoir implant of glowing fluid with tubes",
    "cracked_lens": "a cybernetic eye lens with a crack across it and a faint targeting reticle",
    "spare_cell": "a cylindrical power cell battery",
    "med_pump": "a nano-pump medical implant with tiny glowing nanobots inside",
    "trigger_discipline": "a cybernetic trigger-finger glove module",
    "echo_lens": "a prism lens refracting faint ghostly echo images",
    "feedback_loop": "a ring-shaped looping circuit coil, a serpent of light eating its own tail",
    "momentum_core": "a spinning gyroscope core of nested rings",
    "impact_frame": "an armoured forearm exoskeleton frame with shock absorbers",
    "guardian_chip": "a neural chip with a glowing shield-shaped emblem",
    "reflex_booster": "a spinal implant segment with crackling nerves of light",
    "heavy_exosuit": "a chunky armoured exosuit chest piece",
    "adrenal_loop": "an adrenal gland implant pulsing with light",
    "thorn_weave": "a woven armour patch bristling with metal thorns",
    "afterimage": "a sleek cyber module trailed by several translucent motion-blur copies of itself",
    "ghost_engine": "a sleek engine core trailing ghostly vapour",
    "overclock_heart": "a mechanical heart with overclocked glowing coils",
    "chain_reaction": "a cluster of small explosive nodes linked together by glowing wires",
    "bastion_core": "a fortress-like hexagonal shield generator core",
    "kill_chain": "a short length of heavy chain whose links glow with notches of light",
    "domino_relay": "a row of falling domino-shaped relay modules",
    "ix_shard": "a shard of white crystalline glass holding a tiny red core",
    "black_ice_core": "a black ice crystal core with frost and fractures",
    "eater_maw": "a jaw-shaped device lined with torn holographic teeth",
    "haetae_treads": "a fragment of tank tread fused with sculpted haetae lion-dog armour",
    "merchant_ledger": "a closed gilt ledger book with a glowing circuit binding",
    "chameleon_cloak": "a folded cloak shimmering with adaptive camouflage",
    "field_medic_kit": "a compact field medical case with a glowing heartbeat-line emblem",
    "forged_permit": "a forged holographic permit card with a wax-like seal",
    "loaded_dice": "a pair of translucent dice with glowing circuitry inside",
    "bounty_board": "a small hologram projector disc showing a target silhouette",
    "smugglers_pocket": "a hidden-compartment pouch spilling glowing contraband chips",
    "ark_coolant": "a canister of pale blue coolant with frost on its surface",
    "sentinel_eye": "a sentinel drone's eye lens module with a red iris",
    "purge_igniter": "a handheld igniter device with a flame nozzle",
    "salvaged_aegis": "a salvaged round shield emitter, patched and glowing",
}

OBJECT_FRAME = (
    "Product shot of a single object floating in the centre of a plain, very dark, empty background, studio "
    "lighting with a strong rim light, sharp detail, generous dark margin around it, nothing else in the frame."
)


def implants_jobs() -> list[ImageJob]:
    jobs = []
    for imp in content_json()["implants"]:
        iid = imp["id"]
        obj = (
            IMPLANT_OBJECTS.get(iid)
            or f"a cybernetic implant called '{imp['name']['en']}' ({imp['text']['en']})"
        )
        glow = GLOW.get(imp.get("rarity", "common"), "teal")
        prompt = f"{OBJECT_FRAME} The object: {obj}, a cybernetic artifact with glowing {glow} circuitry and {glow} glow."
        jobs.append(ImageJob(f"implants/{iid}.webp", prompt, "1:1", (512, 512)))
    return jobs


CONSUMABLE_OBJECTS: dict[str, str] = {
    "nanopatch": "an adhesive medical nanopatch with a glowing hexagonal pattern",
    "emp_grenade": "an EMP grenade crackling with blue electricity",
    "cryo_grenade": "a frost-covered cryo grenade venting cold white vapour",
    "incendiary_grenade": "an incendiary grenade with molten orange seams",
    "stim_shard": "a crystal syringe shard filled with glowing stimulant",
    "overload_stim": "an auto-injector overloaded with crackling violet energy",
    "restart_core": "a palm-sized reactor core with a glowing restart ring",
    "stealth_cloak": "a folded optical-camouflage cloak, half of it turned invisible",
}


def consumables_jobs() -> list[ImageJob]:
    jobs = []
    items = content_json()["consumables"] or [
        {"id": k, "rarity": "common", "name": {"en": k}, "text": {"en": ""}}
        for k in CONSUMABLE_OBJECTS
    ]
    for it in items:
        cid = it["id"]
        obj = (
            CONSUMABLE_OBJECTS.get(cid)
            or f"a single-use combat item called '{it['name']['en']}' ({it['text']['en']})"
        )
        glow = GLOW.get(it.get("rarity", "common"), "teal")
        prompt = f"{OBJECT_FRAME} The object: {obj}, a single-use combat consumable with {glow} light accents."
        jobs.append(ImageJob(f"consumables/{cid}.webp", prompt, "1:1", (512, 512)))
    return jobs
