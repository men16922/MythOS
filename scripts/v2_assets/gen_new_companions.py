"""Art for the five R7d companions (content/packs/new_companions) through the Codex CLI image tool only.

Usage:
    .venv/bin/python scripts/v2_assets/gen_new_companions.py GROUP [GROUP ...] [--only id ...] [--jobs 4]
        [--force] [--extra "correction appended to every prompt"]

Groups: portraits | recruit | cards | cutscenes | events (or `all`), plus the R7e archetype groups
archetype_cards | implants (run after the archivist/scrapborn idle sprites exist). An existing output is skipped unless
--force. Portraits are generated first and become the identity reference for every other group; when a
companion's v2 combat idle sprite exists it is attached as a second (full-body outfit) reference. Combat
sprites are NOT made here: they are Sprite specs in sprites/specs.py (gen.py -> process.py).

Who they are (the same beings as the existing enemy art, now allies):
  io    — the act-4 boss IO (v2/boss/a4_boss_io.webp), the Glass Library's librarian AI, softened.
  miro  — the forgotten reader (v2/npcs/miro_reader.webp, a4_miro_* events): a child with a card face.
  doyun — one of the act-3 listed citizens (v2/sprites/listed-citizen-*): young, now a guardian.
  bel   — a Censorate censor who quit (act-4 Censorate uniform, v2/sprites/chief-censor-*), red pen.
  rem   — the act-5 boss REM, the Dream Executor (v2/boss/a5_boss_rem.webp), mask lifted.
Sprite keys: io-ally / miro / doyun / bel / rem-ally (the boss sprites keep 'io' and 'rem').
"""

from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import COMPANIONS, RES, STYLE
from gen_codex_image import generate

ALL = ("io", "miro", "doyun", "bel", "rem")
SPRITE_KEY = {"io": "io-ally", "miro": "miro", "doyun": "doyun", "bel": "bel", "rem": "rem-ally"}
PORTRAIT_STEM = {cid: COMPANIONS[cid][0] for cid in ALL}  # characters/<stem>.png

NO_TEXT = (
    "Absolutely no text, no letters, no numbers, no readable writing (any pages, cards, notes or screens are "
    "blank or show only abstract illegible marks), no logos, no watermark, no UI, no frame or border."
)

# ------------------------------------------------------------------------------------------- portraits

PORTRAIT_LOOK = (
    "Photorealistic cinematic close-up portrait, head and shoulders, square 1:1, the subject centred and turned "
    "three-quarters toward the camera, shallow depth of field, a rain-wet night of a 2070s Korean cyberpunk "
    "megacity (Neo-Seoul) softly blurred behind, neon cyan and magenta rim light, film grain. The FIRST reference "
    "image is another companion's portrait from this game: match its realism, framing, lighting and colour grade "
    "exactly, but draw a completely different character."
)

# companion -> (identity reference (repo-relative), subject)
PORTRAITS: dict[str, tuple[str, str]] = {
    "io": (
        "resources/neo-seoul/v2/boss/a4_boss_io.webp",
        "IO, the librarian AI of the Glass Library, now a travelling companion — the SAME being as in the SECOND "
        "reference image (her old boss art): a feminine android with a smooth white porcelain face, dark "
        "liquid-ink eyes, a clear glass dome over the crown of the head ringed by thin antique-gold halo bands, "
        "fine cracked glass seams at the neck glowing softly white, a tall stiff collar of translucent glass "
        "panels like pages, thin gold chains. As an ally she is calm and courteous with a faint softness in her "
        "expression, NO ink tears; a worn brown leather book-return satchel strap crosses her shoulder, and a small "
        "warm brass reading lamp lights one side of her face. A few loose blank paper pages drift in the rain.",
    ),
    "miro": (
        "resources/neo-seoul/v2/npcs/miro_reader.webp",
        "MIRO, the forgotten reader — the SAME child as in the SECOND reference image: a small child of about ten "
        "with messy dark brown hair, the whole face hidden behind several overlapping old blank paper library "
        "return cards (no eyes or mouth visible, the cards are blank), a dark ragged hooded cloak over a grey "
        "scarf, holding one blank return card close to the chest with both small hands. Shy, half in shadow, "
        "a sliver of cyan neon catching the edges of the cards.",
    ),
    "doyun": (
        "resources/neo-seoul/v2/sprites/listed-citizen-idle.webp",
        "DOYUN, an ordinary young Korean man of about twenty who was almost erased by the optimization list: "
        "short slightly messy black hair, a soft earnest face with tired but steady eyes, a small plaster on one "
        "cheek, wearing the same kind of faded grey work jacket over a stretched sweater as the listed citizen in "
        "the SECOND reference image, a crumpled paper number tag pinned to the chest turned blank side out, a "
        "cracked and dimmed blue-white barcode band on his wrist, the strap of a dented riot shield over one "
        "shoulder. Gentle, a little shy, quietly brave.",
    ),
    "bel": (
        "resources/neo-seoul/v2/sprites/chief-censor-idle.webp",
        "BEL, a censor of the Glass Library Censorate who quit: an androgynous Korean person in their early "
        "thirties with sharp tired eyes and a black asymmetric bob, ink-stained fingertips, wearing the Censorate "
        "uniform whose design language is shown in the SECOND reference image (a high-collared coat of white "
        "porcelain-like plates and black panels with antique-brass trim) but worn open with the sleeves rolled up "
        "and the rank insignia torn off leaving a paler patch, a narrow black eye-bar visor pushed up into the "
        "hair, a long red fountain pen held capped between two fingers. A dry, wry half-smile.",
    ),
    "rem": (
        "resources/neo-seoul/v2/boss/a5_boss_rem.webp",
        "REM, the Dream Executor, now an ally — the SAME figure as in the SECOND reference image (the old boss "
        "art): long straight violet-black hair with an ornate dark-gold hairpin set with a blue jewel, dark robes "
        "with fine gold chains and translucent violet static veils. The smooth white porcelain executor mask is "
        "LIFTED — pushed up and tilted on top of the head — revealing a soft, gentle pale face beneath with "
        "half-open drowsy violet eyes and a faint sleepy kind smile. Two small glowing pale-violet moths near the "
        "shoulder, faint scanline static in the hair.",
    ),
}
PORTRAIT_STYLE_REF = "resources/neo-seoul/characters/lin-yue.png"

# ------------------------------------------------------------------------------------------- scenes

PAINTERLY = (
    "Painterly digital concept art matching the reference character images (the FIRST reference is a close-up "
    "portrait for face and hair, the SECOND, when given, a full-body sprite for outfit and props — keep the "
    "character identical, but redraw them in this scene)."
)

RECRUIT: dict[str, str] = {
    "io": "At a book-return box in an underground subway passage, Io cradles an open glass book in both hands; "
    "inside its glowing pages a tiny train circles the same platform. Rain-damp tiles, cold white light with one "
    "warm lamp.",
    "miro": "Beneath a shuttered second-hand bookstall at a rainy night market, Miro lifts the edge of a dripping "
    "tarp and peeks out from among stacked old books, crouched low, one small hand on the tarp.",
    "doyun": "A heavy steel fire door opening onto an evacuation passage, green-white emergency lights; Doyun "
    "holds the door open with one shoulder, the crumpled blank number tag on his jacket, the last footsteps "
    "fading down the corridor behind him.",
    "bel": "The drying racks of an abandoned print shop hung with blacked-out leaflets on clips (only black bars "
    "and blurred grey lines, nothing legible); Bel holds one leaflet up to a window's light, a red pen hovering "
    "over one line.",
    "rem": "In the shade of a scrap transfer depot, a small android sleeps on an empty trolley; Rem sits beside "
    "it, turning a shutdown terminal face down on the knee, rain glistening on rusted machine parts.",
}
RECRUIT_FRAME = (
    "Cinematic first-meeting scene still for a cyberpunk RPG, 16:9 landscape. {pain} {scene} The character "
    "looks toward the viewer as if meeting someone for the first time. Neo-Seoul night, rain, neon, moody "
    "lighting. {no_text}"
)

CUTSCENES: dict[str, tuple[str, str]] = {
    "io_dust_cover": (
        "io",
        "A dim safehouse corner with dust drifting down through a shaft of light from a ceiling vent; Io gently "
        "lays a soft grey book cloth over the viewer's knees (the viewer's knees in the lower foreground); an "
        "unwrapped old book rests open on Io's lap and she leans slightly over its pages.",
    ),
    "io_personal_copy": (
        "io",
        "The safehouse with its lights turned low; Io sits with a thin open book on her lap, no labels on it, "
        "tilting one side toward the viewer, one porcelain finger resting below a line (the pages show only soft "
        "blurred grey lines), a rain-streaked window behind, quiet and intimate.",
    ),
    "miro_sleeve_knot": (
        "miro",
        "A safehouse corner at night; Miro is curled under a blanket, a small hand peeking from the folds, the "
        "end of Miro's cloak sleeve loosely knotted to the viewer's sleeve (the viewer's forearm in the "
        "foreground); a closed door in the background with light under it.",
    ),
    "miro_open_curtain": (
        "miro",
        "An old curtain that divides a sleeping space in the safehouse, drawn all the way back; a low lamp lights "
        "Miro lying under a blanket beside an empty pillow, small feet sticking out near a pair of worn boots, "
        "turned toward the viewer instead of the door.",
    ),
    "doyun_mended_strap": (
        "doyun",
        "A safehouse table under a warm lamp; Doyun tightens the last stitch on the broken strap of the viewer's "
        "bag with mismatched thread, uneven stitches; beside the table leans Doyun's own bag with no strap; spare "
        "thread trails off the table edge.",
    ),
    "doyun_shared_weight": (
        "doyun",
        "A wooden bench beside a bolted door in a dark corridor before dawn; Doyun has let his stiff posture tilt "
        "until his shoulder and head rest against the viewer's shoulder (the viewer partly visible in the "
        "foreground), eyes half-closed, deeply tired, faint grey dawn light.",
    ),
    "bel_uncut_note": (
        "bel",
        "A small safehouse table beside a cold kettle; Bel smooths a hurried handwritten note (only illegible "
        "scribbles) flat beneath a teacup, a little tea soaking into its corner; a capped red pen tucked into "
        "Bel's rolled sleeve; Bel's eyes rest on the note with a rare softness.",
    ),
    "bel_unfinished_sentence": (
        "bel",
        "At a small safehouse table Bel turns a worn notebook toward the viewer; its first page holds a single "
        "short line of illegible handwriting with a heavy dot pressed at the end; Bel waits, both empty hands "
        "resting on the knees, no pen, nervous.",
    ),
    "rem_cooling_cup": (
        "rem",
        "Beside a small glowing safehouse stove; a thin frost clouds the tea in the cup in front of Rem; Rem "
        "slides a folded cloth under the viewer's steaming cup and keeps both hands back below the table edge, "
        "drowsy eyes following the cup.",
    ),
    "rem_closed_eyes": (
        "rem",
        "Deep night in the safehouse; Rem sits upright, back clear of the wall, chin slightly raised, eyes gently "
        "closed for the first time, the porcelain mask still pushed up on the head; a strip of light passing "
        "under the door washes the eyelids pale; a few faint pale-violet moths resting nearby.",
    ),
}
CUTSCENE_FRAME = (
    "Quiet emotional cutscene illustration for a cyberpunk RPG, wide cinematic shot, 16:9 landscape. {pain} "
    "{scene} The bottom of the scene falls naturally into shadow (no overlay, band or letterbox). Style: {style}. "
    "{no_text}"
)

EVENTS: dict[str, tuple[str, str]] = {
    "cx_io_sealed_letter": (
        "io",
        "The Unread Letter. In a dim underground passage a sealed envelope has slipped from Io's leather return "
        "satchel; inside its wax seal a faint glow and the tiny silhouette of a train shimmer; the rain-blurred "
        "address is only an illegible smudge. Io's porcelain hand hovers above the seal and does not open it.",
    ),
    "cx_miro_second_footsteps": (
        "miro",
        "Two Sets of Footsteps. A dusty abandoned corridor crossed by only ONE line of footprints in the dust; "
        "Miro presses a small foot beside them and holds out a stub of white chalk toward the viewer; a ceiling "
        "patrol lens with a red light slowly sweeps the passage.",
    ),
    "cx_doyun_extra_bowl": (
        "doyun",
        "One Bowl Left. A ration hatch in a grey concrete wall with a half-lowered shutter and a small blank "
        "terminal screen glowing red; Doyun holds the last steaming bowl and has stopped, looking back at a frail "
        "elderly person in a worn coat behind him whose number tag the terminal cannot read; queue barriers, cold "
        "fluorescent light.",
    ),
    "cx_bel_retracted_cut": (
        "bel",
        "Withdrawing the Cut. An abandoned print shop; a short poem on a sheet of paper is caught in the rollers "
        "of a rusted printing press, its last line covered by a solid black redaction bar, faint pressed letter "
        "impressions (illegible) along the bar's edge; Bel stands at the press, halfway through drawing a red pen "
        "from a rolled sleeve, and stops.",
    ),
    "cx_rem_wake_signal": (
        "rem",
        "A Call Without Waking. In a shadowy scrap transfer depot a small android sleeps in an open transport "
        "crate, one hand raised in its sleep as if combing someone's hair; Rem kneels beside it, gently closing "
        "its power cover; a shutdown terminal at Rem's side glows a faint blank warning light.",
    ),
}
EVENT_FRAME = (
    "Cinematic event scene illustration for a cyberpunk RPG, 16:9 landscape. {pain} Scene: {scene} Neo-Seoul, "
    "rain, moody neon and practical light. {no_text}"
)

# ------------------------------------------------------------------------------------------- cards

CARD_FRAME = (
    "Full-bleed illustration for the picture window of a game card: the artwork only, edge to edge, with no card "
    "frame, no border, no rounded corners and no text box. Portrait format. Single clear focal subject in the "
    "centre, bold silhouette that reads at a small size, simple uncluttered background (any distant neon signs are "
    "blank abstract shapes), darker toward the edges."
)
TYPE_MOOD = {
    "attack": "a dynamic action moment, strong motion and impact",
    "skill": "a defensive moment: shields, barriers, protective light",
    "tactic": "a tactical moment: hacking, movement, repositioning, holographic light",
}
# card id -> (owner, type, subject)
CARDS: dict[str, tuple[str, str, str]] = {
    "io_recall": (
        "io",
        "skill",
        "Io holding an open glass book from which pale glowing memory pages spiral up around her like a protective ring of light, two glowing cards of light flying into her other hand",
    ),
    "io_index_beam": (
        "io",
        "attack",
        "Io extending one porcelain hand palm-out, a straight piercing beam of cold white catalogue light shooting across the frame from her palm, a small glowing marker sigil locking onto a distant drone",
    ),
    "io_reading_lamp": (
        "io",
        "skill",
        "Io raising a small antique brass reading lamp whose warm golden glow pushes back the dark, glowing blank pages and a crackle of golden energy rising from the lamp",
    ),
    "io_cross_reference": (
        "io",
        "skill",
        "Io standing among floating blank glass index cards linked by thin glowing threads to several distant enemy silhouettes, each enemy tagged with a small glowing target sigil",
    ),
    "io_overdue_notice": (
        "io",
        "attack",
        "Io pointing as a heavy beam of white light shaped like a slamming book cover strikes an armoured enemy that already glows with a red target mark",
    ),
    "miro_shadow_step": (
        "miro",
        "tactic",
        "Miro vanishing into a swirl of shadow and fluttering blank paper pages and reappearing a few steps away, a faint translucent afterimage left behind",
    ),
    "miro_paper_cut": (
        "miro",
        "attack",
        "Miro darting low past an armoured enemy, a razor-thin paper blade in one small hand leaving a crimson cut-streak through the air, paper scraps flying",
    ),
    "miro_margin_note": (
        "miro",
        "tactic",
        "Miro slapping a small glowing blank paper note onto an armoured drone's red targeting eye, the red telegraph lines around the drone fizzling out",
    ),
    "miro_ambush_reading": (
        "miro",
        "attack",
        "Miro dropping from a high dark shelf onto an unaware armoured enemy below, cloak flaring, paper blade glinting",
    ),
    "miro_vanishing_ink": (
        "miro",
        "tactic",
        "Miro flicking a splash of black ink that spreads in a cross shape across the wet street, the red holographic attack telegraphs of several enemies dissolving in the ink",
    ),
    "doyun_stand_in": (
        "doyun",
        "skill",
        "Doyun stepping in front of a fallen ally with his dented riot shield raised, a blue energy barrier flaring around both of them",
    ),
    "doyun_shoulder": (
        "doyun",
        "attack",
        "Doyun driving his shoulder behind the dented riot shield into an armoured trooper and shoving it backward, sparks and rain spray",
    ),
    "doyun_roll_call": (
        "doyun",
        "skill",
        "Doyun with one arm raised, calling out, a ring of soft blue shields lighting up around several silhouetted allies behind him",
    ),
    "doyun_brace": (
        "doyun",
        "skill",
        "Doyun crouched and braced behind his dented shield as blows rain down, jagged spiky shards of blue energy flaring off the shield's rim",
    ),
    "doyun_every_name": (
        "doyun",
        "skill",
        "Doyun kneeling among wounded allies in the rain, one hand on a shoulder, warm healing light spreading from him to every one of them",
    ),
    "bel_red_pen": (
        "bel",
        "attack",
        "Bel aiming a long red fountain-pen stylus like a pistol, a single bright crimson ink-line shot streaking across the frame toward an enemy",
    ),
    "bel_blackout": (
        "bel",
        "tactic",
        "Bel slamming a palm down as thick solid black redaction bars crash onto the wet street in a cross pattern, crackling with blue electric sparks",
    ),
    "bel_uncensored": (
        "bel",
        "skill",
        "Bel tearing a large black redaction bar off a glowing sheet of light, the bar shattering into black flakes, enemies in the background slumping weakened",
    ),
    "bel_strike_through": (
        "bel",
        "attack",
        "Bel drawing one long straight red strike-through line across the frame with the red pen, the line piercing a row of three enemies",
    ),
    "bel_final_cut": (
        "bel",
        "tactic",
        "Bel in a sweeping gesture as huge red correction marks and black bars rain down on a whole squad of enemies, electricity crackling",
    ),
    "rem_lullaby": (
        "rem",
        "tactic",
        "Rem singing softly with one hand outstretched as a cross-shaped wave of pale violet frost and small glowing moths spreads over the ground, enemies frozen mid-step",
    ),
    "rem_dream_blade": (
        "rem",
        "attack",
        "Rem lunging with a long slender blade of translucent violet dream-static, the blade leaving a trail of scanlines and moths",
    ),
    "rem_rewind": (
        "rem",
        "skill",
        "Rem holding up one hand as clock-like rings of violet light spin backward around the party, the allies' translucent afterimages rewinding to earlier positions, a gentle healing glow",
    ),
    "rem_sleepwalk": (
        "rem",
        "tactic",
        "Rem drifting forward with eyes closed, firing a slender bolt of icy violet dream-light from one fingertip that freezes a target in frosty static",
    ),
    "rem_deep_dream": (
        "rem",
        "skill",
        "Rem with arms open as a vast wave of violet sleep-static and moths washes over a whole group of enemies, their red eyes dimming as frost creeps over them",
    ),
}


# R7e archetypes (content/packs/new_archetypes): card id -> (archetype sprite key, type, subject). The archetype's
# own idle sprite is the identity reference; an existing archetype card is the style-only reference.
ARCHETYPE_WHO = {
    "archivist": "the Archivist (the masked Connector in a long charcoal-and-ivory archive coat with brass clasps, "
    "paper slips and glowing cyan index tabs, carrying a lantern-like glowing data book)",
    "scrapborn": "the Scrapborn (a heavy discarded android patched from rusted and gunmetal scrap plates with welding "
    "scars, frayed cables, gentle amber eyes above a matte-black lower faceplate, and a chunky rivet gun)",
}
ARCHETYPE_CARDS: dict[str, tuple[str, str, str]] = {
    "archivist_footnote": (
        "archivist",
        "skill",
        "the Archivist pulling two glowing blank paper slips from the margin of the open data book, the slips flaring into cards of light as they leave the page",
    ),
    "archivist_recall": (
        "archivist",
        "skill",
        "the Archivist with a burnt, ash-edged page reforming in mid-air back into a whole glowing page and returning to his hand, a soft cyan barrier of paper light around him",
    ),
    "archivist_catalog_strike": (
        "archivist",
        "attack",
        "the Archivist thrusting a hand forward as a straight piercing beam of white-gold index light shoots out of the open data book across the frame, a glowing marker sigil locking onto an armoured drone",
    ),
    "archivist_errata": (
        "archivist",
        "skill",
        "the Archivist striking through a glowing page with a quick gesture as three fresh pages of light fly up out of the book, a surge of golden energy",
    ),
    "archivist_index_storm": (
        "archivist",
        "attack",
        "the Archivist at the centre of a whirling storm of glowing index cards slicing outward at a ring of enemy silhouettes, each enemy tagged by a small glowing sigil",
    ),
    "archivist_overdue": (
        "archivist",
        "attack",
        "the Archivist snapping the data book shut toward a distant marked enemy, a heavy bolt of white light shaped like a closing book cover slamming into it, the red target mark flaring",
    ),
    "archivist_bound_volume": (
        "archivist",
        "skill",
        "the Archivist binding a spiral of scattered ash and loose glowing pages back into a thick new volume between his hands, threads of gold light stitching the spine",
    ),
    "scrapborn_scrap_wall": (
        "scrapborn",
        "tactic",
        "the Scrapborn slamming a hand onto wet asphalt as a jagged wall of welded scrap plates erupts upward in front of it, sparks flying, a cyan shield glow on the wall",
    ),
    "scrapborn_wire_trap": (
        "scrapborn",
        "tactic",
        "the Scrapborn kneeling and unspooling live electric cables in a cross shape across a wet street, blue-white current crackling along the wires",
    ),
    "scrapborn_overload": (
        "scrapborn",
        "skill",
        "the Scrapborn with its chest seam torn open and its core blazing over-bright amber and violet, steam and sparks venting from its joints, cables glowing red-hot",
    ),
    "scrapborn_rivet_gun": (
        "scrapborn",
        "attack",
        "the Scrapborn firing the chunky rivet gun, a glowing hot rivet punching an armoured trooper backwards off its feet, a burst of sparks",
    ),
    "scrapborn_junk_hammer": (
        "scrapborn",
        "attack",
        "the Scrapborn swinging a huge improvised hammer made of a welded engine block on a pipe, sending an armoured enemy flying into a concrete wall that cracks",
    ),
    "scrapborn_barricade_line": (
        "scrapborn",
        "tactic",
        "the Scrapborn welding together a cross-shaped barricade of scrap plates and car doors while allies take cover behind it, bright welding sparks, faint blue shields",
    ),
    "scrapborn_emergency_reboot": (
        "scrapborn",
        "skill",
        "the Scrapborn kneeling as its damaged plating knits itself back together, a ring of rebooting cyan light and green repair sparks flowing over it, eyes flickering back on",
    ),
}
ARCHETYPE_CARD_STYLE_REF = "resources/neo-seoul/v2/cards/artery_rip.webp"

IMPLANT_FRAME = (
    "Product shot of a single object floating in the centre of a plain, very dark, empty background, studio "
    "lighting with a strong rim light, sharp detail, generous dark margin around it, nothing else in the frame."
)
IMPLANTS: dict[str, str] = {
    "returned_slip": "a small slim cybernetic implant shaped like a library return slip in a brass-and-glass holder, a "
    "blank paper slip edge visible inside, a tiny glowing index tab on its side",
    "self_repair": "a compact self-repair implant: a patched scrap-metal module with welded seams, a small rotating "
    "nano-weld arm and frayed cables, faint violet glimmer at its core",
}
IMPLANT_STYLE_REF = "resources/neo-seoul/v2/implants/echo_lens.webp"


def _refs(cid: str) -> list[Path]:
    refs = [RES / "characters" / f"{PORTRAIT_STEM[cid]}.png"]
    idle = RES / "v2" / "sprites" / f"{SPRITE_KEY[cid]}-idle.webp"
    if idle.exists():
        refs.append(idle)
    return refs


def jobs(group: str) -> list[tuple[str, str, list[Path], str, str]]:
    """(id, out_rel, refs, size, prompt) for one group."""
    out: list[tuple[str, str, list[Path], str, str]] = []
    if group == "portraits":
        for cid, (ident, subject) in PORTRAITS.items():
            prompt = f"{PORTRAIT_LOOK} Subject: {subject} {NO_TEXT}"
            refs = [RES.parents[1] / PORTRAIT_STYLE_REF, RES.parents[1] / ident]
            out.append((cid, f"characters/{PORTRAIT_STEM[cid]}.png", refs, "1254x1254", prompt))
    elif group == "recruit":
        for cid, scene in RECRUIT.items():
            prompt = RECRUIT_FRAME.format(pain=PAINTERLY, scene=scene, no_text=NO_TEXT)
            out.append((cid, f"v2/recruit/{cid}.webp", _refs(cid), "1600x900", prompt))
    elif group == "cutscenes":
        for sid, (cid, scene) in CUTSCENES.items():
            prompt = CUTSCENE_FRAME.format(
                pain=PAINTERLY, scene=scene, style=STYLE, no_text=NO_TEXT
            )
            out.append((sid, f"v2/cutscenes/{sid}.webp", _refs(cid), "1600x900", prompt))
    elif group == "events":
        for eid, (cid, scene) in EVENTS.items():
            prompt = EVENT_FRAME.format(pain=PAINTERLY, scene=scene, no_text=NO_TEXT)
            out.append((eid, f"v2/events/{eid}.webp", _refs(cid), "1600x900", prompt))
    elif group == "cards":
        for card_id, (cid, ctype, subject) in CARDS.items():
            who = COMPANIONS[cid][1]
            prompt = (
                f"{CARD_FRAME} Subject: {subject}. The character is {who}. Mood: {TYPE_MOOD[ctype]}. {PAINTERLY} "
                f"Style: {STYLE}. {NO_TEXT}"
            )
            out.append((card_id, f"v2/cards/{card_id}.webp", _refs(cid), "600x800", prompt))
    elif group == "archetype_cards":
        for card_id, (key, ctype, subject) in ARCHETYPE_CARDS.items():
            prompt = (
                f"{CARD_FRAME} Subject: {subject}. The character is {ARCHETYPE_WHO[key]}. Mood: {TYPE_MOOD[ctype]}. "
                "The FIRST reference image is this character's full-body sprite: keep the character identical. The "
                "SECOND reference image is ONLY a style guide: match its painterly rendering, colour palette and "
                f"lighting, but not its subject or composition. Style: {STYLE}. {NO_TEXT}"
            )
            refs = [
                RES / "v2" / "sprites" / f"{key}-idle.webp",
                RES.parents[1] / ARCHETYPE_CARD_STYLE_REF,
            ]
            out.append((card_id, f"v2/cards/{card_id}.webp", refs, "600x800", prompt))
    elif group == "implants":
        for iid, obj in IMPLANTS.items():
            prompt = (
                f"{IMPLANT_FRAME} The object: {obj}, a cybernetic artifact with glowing pale white-teal circuitry "
                "and pale white-teal glow. The attached reference image is ONLY a style guide: match its painterly "
                "rendering, colour palette and lighting, but draw a completely new subject and composition (do not "
                f"copy its subject). Style: {STYLE}. {NO_TEXT}"
            )
            out.append(
                (
                    iid,
                    f"v2/implants/{iid}.webp",
                    [RES.parents[1] / IMPLANT_STYLE_REF],
                    "512x512",
                    prompt,
                )
            )
    else:
        raise SystemExit(f"unknown group {group}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("groups", nargs="+")
    ap.add_argument("--only", nargs="*", default=[])
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--extra", default="")
    a = ap.parse_args()
    groups = (
        ["portraits", "recruit", "cards", "cutscenes", "events"] if "all" in a.groups else a.groups
    )
    todo = [j for g in groups for j in jobs(g) if not a.only or j[0] in a.only]
    failed = 0
    with ThreadPoolExecutor(max_workers=a.jobs) as pool:
        futs = [
            pool.submit(
                generate,
                rel,
                prompt + (f" IMPORTANT: {a.extra}" if a.extra else ""),
                refs,
                size,
                a.force,
            )
            for _, rel, refs, size, prompt in todo
        ]
        for f in as_completed(futs):
            line = f.result()
            failed += line.endswith("FAILED")
            print(line, flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
