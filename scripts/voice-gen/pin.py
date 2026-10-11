"""Pin the voices you chose after listening to the auditions.

  .venv/bin/python scripts/voice-gen/pin.py --list                       # roles, candidates, what is pinned now
  .venv/bin/python scripts/voice-gen/pin.py se_rin=Yooni kai=Minjoon      # pin Korean voices by candidate name
  .venv/bin/python scripts/voice-gen/pin.py --lang en se_rin=Sarah        # pin an English voice

Listen first: outputs/voice-auditions/<lang>/<role>/<Name>.mp3 (made by audition.py; already present for ko and en).
The choice is written to resources/neo-seoul/v2/voice/voices.json, which the batch generator will read.
Each role takes one voice per language (the same voice speaks every line of that role).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VOICES = REPO / "resources" / "neo-seoul" / "v2" / "voice" / "voices.json"


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("choices", nargs="*", help="role=CandidateName, e.g. se_rin=Yooni")
    ap.add_argument("--lang", default="ko", choices=("ko", "en"))
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    data = json.loads(VOICES.read_text(encoding="utf-8"))
    roles = data["roles"]
    if args.list or not args.choices:
        for role, langs in roles.items():
            for lang, entry in langs.items():
                pinned = next(
                    (n for n, vid in entry["candidates"].items() if vid == entry["voice_id"]), None
                )
                print(
                    f"{role:9} {lang}  pinned: {pinned or '—':10} candidates: {', '.join(entry['candidates'])}"
                )
        return 0

    for item in args.choices:
        role, _, name = item.partition("=")
        entry = roles.get(role, {}).get(args.lang)
        if entry is None:
            print(f"unknown role {role!r} (roles: {', '.join(roles)})")
            return 2
        if name not in entry["candidates"]:
            print(
                f"{role}/{args.lang}: {name!r} is not a candidate (choose from {', '.join(entry['candidates'])})"
            )
            return 2
        entry["voice_id"] = entry["candidates"][name]
        print(f"pinned {role}/{args.lang} = {name}")
    VOICES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
