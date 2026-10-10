"""Items 1-7: title / archive / act intros / node-map textures / arenas / boss splashes / endings."""

from __future__ import annotations

from common import RES, ImageJob

HD = (1920, 1080)
MAP = (1080, 1920)
UI_SPACE = (
    "Keep the area where interface text will sit darker and calmer, with low-contrast negative space created by "
    "the scene's own lighting and shadow (never an overlay, band, box, bar or letterbox)."
)


def _wide(key: str, prompt: str, refs=None, post=None) -> ImageJob:
    return ImageJob(
        key=key, prompt=prompt, aspect="16:9", size=HD, refs=refs or [], image_size="2K", post=post
    )


def static_jobs() -> list[ImageJob]:
    jobs: list[ImageJob] = []

    # 1-2. Title + Archive hub ------------------------------------------------------------------------
    jobs.append(
        _wide(
            "art/title.webp",
            "Wide establishing key art for a video game title screen. A lone hooded figure, the Connector, in a long "
            "black hooded coat with a faint teal glow at the collar, stands seen from behind on the wet edge of a "
            "high rooftop in the lower right third of the frame, small against the view, looking out over the endless "
            "night skyline of Neo-Seoul: dense Korean apartment blocks, rooftop water tanks, tangled power lines, "
            "neon glow in cyan and magenta with no readable signs. Far away on the right a colossal crystalline spire, "
            "the ARK, rises through the clouds, pale glass facets, a single blood-red glowing core near its top. Heavy "
            "diagonal rain, a few small surveillance drones with red lights drifting through the haze. The left half of "
            "the sky is dark, calm and empty for the game logo and menu.",
        )
    )
    jobs.append(
        _wide(
            "art/archive.webp",
            "Interior of the Archive, a hidden underground memory vault beneath Neo-Seoul that serves as a safe refuge: "
            "rows of tall glowing data-core cylinders in steel racks, stacks of old CRT monitors showing soft green and "
            "amber static, cables hanging from a low concrete ceiling, a worn sofa, a kettle and blankets, warm amber "
            "refuge light mixing with teal glow. Faint translucent holographic silhouettes of past selves, echoes of "
            "earlier lives, stand quietly among the racks. "
            + UI_SPACE
            + " The centre of the frame is calmer and darker "
            "for menu panels.",
        )
    )

    # 3. Act intros ---------------------------------------------------------------------------------------
    jobs.append(
        _wide(
            "art/act1.webp",
            "Act one, the C-17 Blackout: a rain-soaked residential district of Neo-Seoul during a total power blackout. A "
            "narrow street between old Korean apartment blocks, every streetlight and window dead, a collapsed orange "
            "pojangmacha street-food tent, abandoned scooters, puddles everywhere. Two surveillance drones overhead sweep "
            "harsh red searchlight beams through the rain, the red light reflected in the wet asphalt; a faint distant "
            "city glow on the horizon. "
            + UI_SPACE
            + " The bottom of the scene falls naturally into deep shadow for the act title.",
        )
    )
    jobs.append(
        _wide(
            "art/act2.webp",
            "Act two, the Undercity Market: a floating night market hidden beneath the megacity. Wooden and steel barges "
            "lashed together on a black underground canal between colossal concrete pillars, the underside of the city "
            "like a stone sky above. Strings of warm paper lanterns, steam rising from food stalls, hooded smugglers "
            "trading small glowing data chips, magenta and teal neon reflected in the dark water. "
            + UI_SPACE
            + " The bottom of the scene falls naturally into deep shadow for the act title.",
        )
    )
    jobs.append(
        _wide(
            "art/act3.webp",
            "Act three, the ARK Spire: inside a sterile white-glass megatower, a vast cathedral-like atrium of light with "
            "towering ribbed glass columns and rows of white server monoliths, cold white and pale cyan light, polished "
            "reflective floor. At the far end, high above, a single enormous blood-red glowing core hangs in the air. A "
            "tiny lone hooded figure stands on the floor for scale. "
            + UI_SPACE
            + " The bottom of the scene falls "
            "naturally into soft shadow for the act title.",
        )
    )

    # 4. Node-map textures (dimmed in post) ------------------------------------------------------------------
    map_common = (
        " Strictly top-down orthographic view, like an old blueprint or a faint tactical city map. Very dark navy "
        "almost black overall, very low contrast, only thin faint glowing lines, no bright spots, no focal subject, "
        "an even subtle texture across the whole frame, suitable as a quiet background behind interface icons."
    )
    jobs.append(
        ImageJob(
            "map/act1.webp",
            "A top-down map texture of a blacked-out residential district: a dense grid of narrow streets and alleys "
            "between rectangular apartment block outlines, traced in thin faint cyan and teal neon lines, a few tiny dim "
            "red dots like drones, rain-streak texture." + map_common,
            "9:16",
            MAP,
            post="map_dim",
        )
    )
    jobs.append(
        ImageJob(
            "map/act2.webp",
            "A top-down map texture of an undercity of canals: winding dark water channels, moored barges and pontoon "
            "walkways, round pillar footprints, traced in thin faint teal lines with a few tiny dim warm amber lantern "
            "dots." + map_common,
            "9:16",
            MAP,
            post="map_dim",
        )
    )
    jobs.append(
        ImageJob(
            "map/act3.webp",
            "A top-down floor-plan texture of a vast circular tower: concentric rings, radial corridors and stacked floor "
            "outlines traced in thin faint white-cyan lines, a small dim red circle at the exact centre."
            + map_common,
            "9:16",
            MAP,
            post="map_dim",
        )
    )

    # 5. Arenas -------------------------------------------------------------------------------------------
    arena_common = (
        " Seen from a high camera angle of about sixty degrees looking down. The middle two thirds of the frame is an "
        "EMPTY, flat, evenly lit open floor area with no objects, no people and no creatures, where a tactical grid "
        "will be overlaid. Props, walls and light sources only around the outer edges of the frame. No people."
    )
    jobs.append(
        _wide(
            "arena/streets.webp",
            "A battle arena in a blacked-out Neo-Seoul street: a wide wet asphalt road intersection with faded road "
            "markings and puddles in the centre; at the edges wrecked scooters, a torn pojangmacha tent, steaming "
            "manholes, traffic barriers, dead neon fixtures and the bases of apartment blocks, red drone light from above."
            + arena_common,
        )
    )
    jobs.append(
        _wide(
            "arena/undercity.webp",
            "A battle arena on the undercity canal: the broad flat deck of a large wooden-and-steel market barge in the "
            "centre with plank seams and rope coils at the rim; black water, moored boats, hanging paper lanterns, stacked "
            "crates and concrete pillars around the edges." + arena_common,
        )
    )
    jobs.append(
        _wide(
            "arena/industrial.webp",
            "A battle arena on an industrial factory floor under the city: a wide floor of steel plates and drainage "
            "grates in the centre, worn yellow hazard stripes without any lettering; pipes, machinery, cable bundles, "
            "steam vents and sparks around the edges, orange work lights mixing with teal."
            + arena_common,
        )
    )
    jobs.append(
        _wide(
            "arena/spire.webp",
            "A battle arena inside the ARK Spire: a wide polished white glass floor in the centre crossed by thin glowing "
            "red light lines; white columns, server monoliths and cold white light at the edges, sterile and clinical."
            + arena_common,
        )
    )

    # 6. Bosses -------------------------------------------------------------------------------------------
    boss_space = " The boss fills the right two thirds of the frame; the left side is darker for the boss name."
    jobs.append(
        _wide(
            "boss/a1_boss_haetae.webp",
            "Boss splash art: HAETAE, a massive armoured riot-suppression tank built in the shape of the mythical Korean "
            "haetae lion-dog guardian: heavy tank treads instead of legs, overlapping riot-shield armour plates forming "
            "its mane, a single horn on its brow, twin blinding searchlights for eyes, water cannons and sonic emitters "
            "on its shoulders, red warning beacons. It crouches menacingly in a rain-soaked blacked-out street, seen from "
            "a low dramatic angle." + boss_space,
        )
    )
    jobs.append(
        _wide(
            "boss/a2_boss_echo_eater.webp",
            "Boss splash art: the ECHO EATER, a towering glitching wraith made of corrupted memories: a tall hooded "
            "silhouette like the reference creature, its body shredded into torn holographic photographs, half-erased "
            "faces and pixel fragments streaming off it, magenta and cyan glitch bands tearing across it, one violet "
            "eye. It looms over the dark canal of the undercity night market, lanterns guttering."
            + boss_space,
            refs=[RES / "enemies" / "glitch-wraith.png"],
        )
    )
    jobs.append(
        _wide(
            "boss/a3_boss_ix.webp",
            "Final boss splash art: ADMINISTRATOR IX, a colossal perfectly symmetrical crystalline glass entity based on "
            "the reference figure, white glass and pale crystal, floating in a cathedral of white light, vast concentric "
            "glowing rings behind it, and a single piercing blood-red core at the centre of its chest (red, not blue). "
            "Overwhelming scale, cold divine presence." + boss_space,
            refs=[RES / "enemies" / "administrator-ix.png"],
        )
    )

    # 7. Endings ------------------------------------------------------------------------------------------
    jobs.append(
        _wide(
            "ending/ending_safe_refuge.webp",
            "Ending illustration, Safe Refuge: deep underground in an old subway transfer level turned into a home, a "
            "small group of people and companions sit together around a warm lantern, blankets, a hot pot steaming, "
            "children asleep; a concrete pillar covered in small paper notes and photos without readable writing. Warm "
            "gold light, quiet relief, the world above unchanged but no one is alone.",
        )
    )
    jobs.append(
        _wide(
            "ending/ending_code_rewrite.webp",
            "Ending illustration, Code Rewrite: the summit of the white ARK Spire at night, its great white screens "
            "flooded with cascading streams of abstract glowing light (patterns, not letters), the crystalline giant "
            "dissolving into static; above Neo-Seoul an impossible new moon rises, too large and softly teal. A lone "
            "hooded figure watches from the glass ledge.",
        )
    )
    jobs.append(
        _wide(
            "ending/ending_noble_sacrifice.webp",
            "Ending illustration, Noble Sacrifice: inside the heart of the Spire, a hooded figure presses both hands into "
            "a blazing core, their body dissolving into golden-white flame and drifting light particles that stream out "
            "through the shattered glass over the city; far below, every window and machine of Neo-Seoul lights up with a "
            "soft warm glow, like a dream.",
        )
    )
    jobs.append(
        _wide(
            "ending/ending_forced_erasure.webp",
            "Ending illustration, Forced Erasure: the whole city bleaching to white. An overexposed, almost blank white "
            "space where the skyline of Neo-Seoul dissolves upward into white pixels and pale grey dust, like a "
            "photograph being erased; a tiny distant hooded silhouette half turned into drifting pixels; in one lower "
            "corner a single small magenta-cyan glitch flicker still blinks. Quiet, cold, clinical, melancholic.",
        )
    )
    return jobs
