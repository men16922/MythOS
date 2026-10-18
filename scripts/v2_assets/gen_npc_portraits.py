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
}


def generate(npc: str, force: bool) -> str:
    from PIL import Image

    out = OUT / f"{npc}.webp"
    if out.exists() and not force:
        return f"{npc}: exists"
    prompt = (
        "Generate exactly one image with your image generation tool, square (1024x1024), and do nothing else "
        f"(no files, no code). {NPCS[npc]} {LOOK}"
    )
    png = codex_image(prompt, [REF])
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
