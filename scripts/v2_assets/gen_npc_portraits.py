"""Generate CRPG NPC dialogue portraits with the Codex CLI image tool (no GCP billing).

Usage:
    .venv/bin/python scripts/v2_assets/gen_npc_portraits.py [npc_id ...] [--jobs 4] [--force]

Writes resources/neo-seoul/v2/npcs/<id>.webp (512x512). An existing file is skipped unless --force.
Every call goes through `codex exec --json`; the image is collected from ~/.codex/generated_images/<thread>/
so parallel calls never mix outputs (same pattern as scripts/v2_assets/sprites/gen.py). The companion
portrait `characters/tae-o.png` is attached as the look reference so NPCs match the cast. Calls are
counted in ledger.json (`codex_image_calls`) and each output is recorded there.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RES, codex_image, ledger_record

OUT = RES / "v2" / "npcs"
REF = RES / "characters" / "tae-o.png"

LOOK = (
    "Photorealistic cinematic head-and-shoulders portrait, square 1:1, subject centered and facing the camera "
    "three-quarters, shallow depth of field, rain-wet night street of a 2070s Korean cyberpunk megacity "
    "(Neo-Seoul) behind them, neon cyan and magenta rim light, film grain. Korean faces and Korean signage only, "
    "no readable text, no logos, no watermark, no frame or border. Match the lighting, realism and color grade "
    "of the attached reference portrait, but a completely different person."
)

# DLC districts (2026-10-26) set some NPCs indoors or in the act-4 Glass Library: SETTING swaps the default
# rain-street look for a scene-specific one, and Glass Library NPCs use an act-4 event image as the style ref.
_COMMON = (
    "no readable text, no letters, no logos, no watermark, no frame or border. Match the lighting, realism and "
    "color grade of the attached reference image, but a completely different subject."
)
_HUMAN = (
    "Photorealistic cinematic head-and-shoulders portrait, square 1:1, subject centered and facing the camera "
    "three-quarters, shallow depth of field, film grain, Korean faces only, "
)
LOOKS: dict[str, str] = {
    "flood": _HUMAN
    + "a flooded night alley of 2070s Neo-Seoul behind them (knee-deep black water, half-sunk "
    "washing machines and dead arcade cabinets), neon cyan and magenta reflections on the water, "
    + _COMMON,
    "shelter": _HUMAN
    + "a dim welfare-capsule shelter behind them (stacked white sleep capsules, a cold "
    "scanning light sweeping overhead), muted cyan night lighting with one warm lamp, " + _COMMON,
    "underpass": _HUMAN
    + "a concrete underpass beneath a cyberpunk night market behind them (cart rails, "
    "pillars, tiny red sensor dots in the dark ceiling), warm lantern light with cyan and magenta rim, "
    + _COMMON,
    "pawnshop": _HUMAN
    + "a night-market pawnshop behind them (brass scales behind glass, cases of softly "
    "glowing memory vials), warm amber lamp light with cyan and magenta rim, " + _COMMON,
    "ark": _HUMAN
    + "a sterile white-and-steel ARK facility interior behind them (frosted panels, pipes, cold "
    "white light with ice-cyan accents), clinical and quiet, " + _COMMON,
    "barracks": _HUMAN
    + "a darkened enforcer barracks behind them (rows of numbered riot shields on racks, "
    "steel lockers), cold blue-grey light with a red roll-call light, " + _COMMON,
    "glass": "Cinematic painterly-photoreal head-and-shoulders portrait, square 1:1, subject centered facing "
    "the camera three-quarters, shallow depth of field. Setting: the Glass Library, a vast archive of towering "
    "frosted and clear glass shelves with antique brass fittings, cold white light with ice-blue glints and a "
    "few warm gold lamps, drifting paper pages and dust motes. " + _COMMON,
}
GLASS_REF = RES / "v2" / "events" / "a4_catalog_shards.webp"
SETTING: dict[str, str] = {
    **dict.fromkeys(("sd_bok", "sd_moru", "sd_naru"), "flood"),
    **dict.fromkeys(("ls_eunsol", "ls_hyeon", "ls_warden_cho"), "shelter"),
    **dict.fromkeys(("rs_yul", "rs_dami", "rs_odo"), "underpass"),
    **dict.fromkeys(("br_sae", "br_gyeom", "br_mijin"), "pawnshop"),
    **dict.fromkeys(("vault_clerk_yeon", "vault_tech_dam", "vault_insider_naru"), "ark"),
    **dict.fromkeys(("wound_captain_jeok", "wound_medic_ryu", "wound_keeper_mun"), "barracks"),
    **dict.fromkeys(
        (
            "dream_cataloguer_sio",
            "dream_binder_ol",
            "dream_reader_bom",
            "returns_clerk_tess",
            "miro_reader",
            "returns_apprentice_ves",
        ),
        "glass",
    ),
}
# Identity references (an existing image of the same character), attached after the style reference.
IDENTITY_REF: dict[str, Path] = {"miro_reader": RES / "v2" / "events" / "a4_miro_high_shelf.webp"}

NPCS: dict[str, str] = {
    "madam_ku": "Madam Ku, a sharp-eyed Korean woman in her sixties who runs the lamp market and sells patrol "
    "schedules; permed grey hair, gold-rimmed glasses, a padded market vest over a silk blouse, a ledger tablet.",
    "kiosk_dal": "Dal, an IX-licensed welfare kiosk robot: a battered public kiosk with a cracked screen face "
    "showing a glitching cartoon smile, rain dripping off its casing, stickers peeling — a machine, not a person.",
    "min_courier": "Min, a Korean delivery courier in his twenties hiding from debt collectors; hood up, "
    "scuffed rider jacket with reflective strips, a cracked helmet under one arm, nervous darting eyes.",
    "oh_gisa": "Old Oh, an unlicensed Korean electrician in his sixties; weathered face, grease on his cheek, "
    "coveralls with rolled sleeves, a coil of cable over his shoulder, warm yellow work-lamp light.",
    "bora": "Bora, a cheerful, clever Korean kid of about twelve who collects a small toll from passers-by; "
    "oversized yellow raincoat with the hood down, a sly grin, holding a clear umbrella, warm market lights.",
    "sgt_yun": "Sergeant Yun, a Korean patrol sergeant in his forties; tired stern eyes, wet riot-police "
    "armor with a cracked visor pushed up, red patrol light on his shoulder.",
    "auctioneer_palle": "Palle, the auctioneer of a memory auction house; androgynous Korean person in a "
    "sharp velvet suit, slicked hair, a holographic gavel glowing in one hand, a showman's thin smile.",
    "iseul": "Iseul, a Korean teenage girl selling her own memories to pay a debt; pale, a neural jack port "
    "with a bandage behind her ear, school jacket too thin for the rain, quiet sad eyes.",
    "collector_do": "Mr. Do, an elderly Korean collector who only buys childhood memories; immaculate grey "
    "suit, white gloves, a small glass vial of glowing memory in his fingers, unsettlingly gentle smile.",
    "stationmaster_yeom": "Stationmaster Yeom, an old Korean stationmaster guarding the timetable of a stopped "
    "train; faded railway uniform and cap, a pocket watch on a chain, flooded subway platform behind him.",
    "toll_king": "Boss Ma, the Korean man who owns the transfer-corridor tollgate; heavyset, gold chain, "
    "a cheap fur-collared coat, cigarette smoke, a toll scanner on his wrist, confident grin.",
    "scav_pyo": "Pyo, a Korean scavenger who fishes fuel cells out of flooded rail tunnels; diving mask "
    "pushed up on the forehead, wet waders, a headlamp, a dented fuel cell under one arm.",
    "curator_baek": "Curator Baek, an 'optimized citizen' curator of a glass atrium; flawless Korean woman "
    "in a pristine white high-collar outfit, too-perfect calm face, sterile white light instead of neon.",
    "yeon_cleaner": "Yeon, a Korean window cleaner who hangs from the outer wall of a spire; climbing harness, "
    "safety rope, wind-whipped hair, squeegee in hand, the city's lights far below.",
    "citizen_mun": "Citizen No. 0451, a Korean man at the very end of an 'optimization' queue; grey uniform "
    "jumpsuit with a number patch, shaved head, a blank exhausted stare, white corridor behind him.",
    "archivist_07": "Archivist 07, a records-floor android that reads each name aloud once and deletes it; "
    "white porcelain-like synthetic face with fine seams, a small frost on its casing, a record chip at its "
    "fingertips, cold archive shelves behind it.",
    "mother_so": "Mrs. So, a Korean mother in her fifties disguised as a maintenance worker to find her son's "
    "name; maintenance coveralls with sleeves rolled three times, hands red with cold, determined wet eyes.",
    "auditor_pyo": "Auditor Pyo, a Korean auditor who counts deletion quotas; thin, rimless glasses with a "
    "data overlay, a grey bureaucrat suit, holding a tally tablet, emotionless.",
    # ---- DLC districts (2026-10-26)
    "sd_bok": "Bok, a Korean laundress in her late fifties who keeps the clothes nobody came back for; cropped "
    "grey-streaked hair, a rubber apron over a faded cardigan, sleeves rolled, an empty wire hanger in her hand, a "
    "small yellow child's raincoat hanging on a high nail behind her shoulder, grief held in check.",
    "sd_moru": "Moru, a Korean arcade repairman in his forties standing in a flooded arcade; wiry, stubble, heavy "
    "rubber work gloves, a coil of black power cable over one shoulder, a small handheld voice recorder clipped "
    "to his work vest, dark claw machines behind him.",
    "sd_naru": "Naru, a Korean flood ferryman in his thirties who carries people across the water on an old door "
    "lashed to empty plastic jugs; sun-darkened skin, a wet tank top under an open rain poncho, a coil of rope "
    "over his shoulder, a long pole in his hand, a wry half-smile.",
    "ls_eunsol": "Park Eun-sol, a Korean canteen worker in her thirties hiding in a sleep capsule; hairnet pushed "
    "back, plain white canteen uniform, a name badge turned face-down in her hand, frightened but resolute eyes, "
    "seen through the narrow gap of a capsule door.",
    "ls_hyeon": "Hyeon, a Korean night attendant in her forties at a welfare shelter; a worn cardigan over a "
    "shelter staff uniform, a folded grey blanket held to her chest, tired kind eyes, a tiny desk lamp glow.",
    "ls_warden_cho": "Enforcer Cho, a Korean ARK enforcer in his thirties checking transfer lists; white-and-steel "
    "enforcer armor with the helmet visor raised, a handheld list tablet throwing cold blue-white light up onto "
    "his impassive face (the screen faces away from the viewer).",
    "rs_yul": "Yul, a Korean courier-guide in her twenties who maintains a chalk route map; short bob haircut, "
    "chalk dust on her fingers and cheek, half a stick of white chalk in her hand, a scuffed courier backpack, "
    "alert clever eyes.",
    "rs_dami": "Dami, a Korean weighmaster in her forties who charges carts by the wheel; sturdy, a heavy canvas "
    "apron, several cargo seal tags wrapped around her wrist like bracelets, leaning on a cart scale, a shrewd "
    "amused look.",
    "rs_odo": "Odo, an old Korean relay technician who listens to machines without plugging in; thick knit cap, "
    "round glasses, a paper cup pressed to an open relay box like a stethoscope, rubber caps over the sockets, no "
    "implants or ports, concentrating.",
    "br_sae": "Sae, a young Korean pawnshop clerk; neat bob, a cardigan with black sleeve protectors, holding a "
    "sealed envelope with a small gold hairpin drawn on it, polite guarded smile, standing behind a glass counter.",
    "br_gyeom": "Gyeom, a Korean pawn-vault keeper in his fifties; a waistcoat over a rolled-sleeve shirt, a heavy "
    "ring of old keys at his belt, a thick ledger under one arm, wiping dust off a glass case with the back of "
    "his hand, meticulous.",
    "br_mijin": "Mijin, a Korean memory courier woman in her thirties who never asks what is inside; a fitted "
    "rider jacket, a receipt stamp in one hand, an empty hard-shell carrying case over her shoulder, calm and "
    "professional.",
    "vault_clerk_yeon": "Clerk Yeon, a precise Korean woman ARK records clerk in her forties; immaculate high-collared "
    "white-and-grey ARK uniform, hair in a tight bun, a pen poised above two perfectly squared blank forms, "
    "composed and exacting.",
    "vault_tech_dam": "Technician Dam, a Korean ARK maintenance technician in his fifties; grey coveralls, thick "
    "heat gloves patched in three layers on the same spot, long tongs in hand, safety goggles pushed up on his "
    "forehead, steam from coolant pipes behind him.",
    "vault_insider_naru": "Naru, a young Korean off-grid woman working inside ARK disguised as staff; short "
    "cropped hair, an ARK staff jacket with its name badge turned inward, a bare neck with no data port, a small "
    "softly glowing memory shard held between her fingers, sharp watchful eyes.",
    "wound_captain_jeok": "Captain Jeok, a Korean enforcer captain in his fifties; grey crew cut, a dark dress "
    "uniform, polishing a blank metal nameplate with a cloth, stern and unreadable.",
    "wound_medic_ryu": "Medic Ryu, a Korean enforcer unit medic in her forties; a plain white armband with a single teal "
    "stripe (no cross, no emblem) over a dark uniform, a stethoscope, a folded white sheet over her arm, empty infirmary cots behind her, quiet steady "
    "gaze.",
    "wound_keeper_mun": "Quartermaster Mun, a heavyset Korean quartermaster in his sixties; reading glasses low on "
    "his nose, a dark work uniform, holding up a dented old riot shield by its grip, weary and careful.",
    "dream_cataloguer_sio": "Sio, a catalogue being of the Glass Library: a library construct whose body is built "
    "from many small glass-and-brass index-card drawers, some half open, a smooth faceless head of frosted glass "
    "with a softly glowing seam, long slender fingers made of brass shelf-mark tags — a construct, not a person.",
    "dream_binder_ol": "Ol, a censor-binder of the Glass Library: a tall figure wearing a heavy dark bookbinder's "
    "leather apron, a smooth white porcelain mask for a face, and where a body should be beneath the apron, slowly "
    "turning thread spools and long needles trailing pale thread — unsettling, quiet, not human.",
    "dream_reader_bom": "Bom, a forgotten reader of the Glass Library: a translucent human head-and-shoulders "
    "outline formed entirely of drifting paper bookmarks and silk ribbon markers, a gentle tired face suggested "
    "by the bookmarks, hovering above an empty antique reading chair — a ghost made of bookmarks.",
    "returns_clerk_tess": "Tess, the returns-clerk construct of the Glass Library: a slender porcelain-and-brass "
    "automaton with a calm porcelain face and a transparent glass chest in which a small receipt printer turns, a "
    "blank paper receipt strip feeding out, polite and mechanical.",
    "miro_reader": "Miro, a small child whose whole face is covered by overlapping cream-coloured library return "
    "cards (no visible eyes or mouth), messy dark hair, a dark patterned hooded coat and scarf, holding a small "
    "blank paper queue ticket in both hands — exactly the same child as the second reference image.",
    "returns_apprentice_ves": "Ves, a young apprentice censor of the Glass Library; androgynous and pale, short "
    "silver-grey hair, grey-and-white censor robes with antique brass clasps, ink-stained fingers holding a large "
    "eraser, grey eraser dust drifting, a puzzled frown.",
}


def generate(npc: str, force: bool) -> str:
    from PIL import Image

    out = OUT / f"{npc}.webp"
    if out.exists() and not force:
        return f"{npc}: exists"
    setting = SETTING.get(npc)
    look = LOOKS[setting] if setting else LOOK
    refs = [GLASS_REF if setting == "glass" else REF]
    if npc in IDENTITY_REF:
        refs.append(IDENTITY_REF[npc])
    prompt = (
        "Generate exactly one image with your image generation tool, square (1024x1024), and do nothing else "
        f"(no files, no code). {NPCS[npc]} {look}"
    )
    png = codex_image(prompt, refs)
    if png is None:
        return f"{npc}: FAILED"
    raw = OUT / f"{npc}.codex_raw.png"
    shutil.copy2(png, raw)
    im = Image.open(raw).convert("RGB")
    side = min(im.size)
    left, top = (im.width - side) // 2, (im.height - side) // 2
    im.crop((left, top, left + side, top + side)).resize((512, 512), Image.Resampling.LANCZOS).save(
        out, "WEBP", quality=86
    )
    raw.unlink()
    ledger_record(f"v2/npcs/{npc}.webp", {"model": "codex-image", "prompt": prompt})
    return f"{npc}: ok"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("ids", nargs="*", help="NPC ids (default: all)")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    ids = args.ids or list(NPCS)
    unknown = [i for i in ids if i not in NPCS]
    if unknown:
        raise SystemExit(f"unknown npc ids: {unknown}")
    OUT.mkdir(parents=True, exist_ok=True)
    failed = 0
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for fut in as_completed(pool.submit(generate, i, args.force) for i in ids):
            msg = fut.result()
            failed += "FAILED" in msg
            print(msg, flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
