"""Generate raw combat-sprite PNGs with the Codex CLI image tool.

Usage:
    .venv/bin/python scripts/v2_assets/sprites/gen.py haetae:attack echo_eater:idle ... [--jobs 3] [--force]
    .venv/bin/python scripts/v2_assets/sprites/gen.py --adopt haetae:idle <png>   # register an existing PNG

Each target runs `codex exec --json` once. The thread id is parsed from the `thread.started` event and the
image is collected from ~/.codex/generated_images/<thread id>/ so parallel calls never mix up outputs.
Raws land in RAW_DIR (outside the repo); a regenerated raw keeps the old one as <key>-<pose>.rejN.png.
Non-idle poses use the idle raw as the `-i` reference. Every call is recorded in ledger.json.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from specs import BY_KEY, RAW_DIR, ROOT, build_prompt, raw_path

CODEX_IMG = Path.home() / ".codex" / "generated_images"
LEDGER = Path(__file__).resolve().parent / "ledger.json"
LOG_DIR = RAW_DIR / "logs"
# batch 1 (bosses/archetypes/elites) was capped at 70; batches 2-3 (variants, companions) raised it.
BUDGET = int(os.getenv("V2_SPRITE_BUDGET", "99"))
_lock = threading.Lock()


def ledger() -> dict:
    if LEDGER.exists():
        return json.loads(LEDGER.read_text())
    return {"codex_calls": 0, "failed": 0, "outputs": {}}


def ledger_write(d: dict) -> None:
    LEDGER.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")


def _archive_old(dst: Path) -> None:
    if not dst.exists():
        return
    n = 1
    while (rej := dst.with_name(f"{dst.stem}.rej{n}.png")).exists():
        n += 1
    dst.rename(rej)


def gen_one(key: str, pose: str, extra: str = "") -> tuple[str, bool, str]:
    s = BY_KEY[key]
    refs: list[Path] = []
    if pose == "idle":
        if s.idle_ref:
            refs.append(ROOT / s.idle_ref)
    else:
        idle = raw_path(key, "idle")
        if not idle.exists():
            return f"{key}:{pose}", False, "idle raw missing"
        refs.append(idle)
    refs += [ROOT / r for r in s.extra_refs]
    prompt = build_prompt(s, pose, has_ref=bool(refs))
    if extra:
        prompt += f" IMPORTANT CORRECTION: {extra}"
    with _lock:
        d = ledger()
        if d["codex_calls"] >= BUDGET:
            return f"{key}:{pose}", False, "budget exhausted"
        d["codex_calls"] += 1
        ledger_write(d)
    cmd = [
        "codex",
        "exec",
        prompt,
        "--cd",
        str(ROOT),
        "--sandbox",
        "workspace-write",
        "-c",
        "approval_policy=never",
        "--skip-git-repo-check",
        "--json",
    ]
    for r in refs:
        cmd += ["-i", str(r)]
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log = LOG_DIR / f"{key}-{pose}-{int(time.time())}.jsonl"
    t0 = time.time()
    proc = subprocess.run(
        cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=900
    )
    log.write_text(proc.stdout + "\n--- stderr ---\n" + proc.stderr)
    thread = None
    for line in proc.stdout.splitlines():
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if ev.get("type") == "thread.started":
            thread = ev.get("thread_id")
            break
    pngs = (
        sorted((CODEX_IMG / thread).glob("*.png"), key=lambda p: p.stat().st_mtime)
        if thread
        else []
    )
    ok = bool(pngs)
    with _lock:
        d = ledger()
        if ok:
            dst = raw_path(key, pose)
            _archive_old(dst)
            shutil.copy2(pngs[-1], dst)
            d["outputs"][f"{key}-{pose}"] = {
                "thread": thread,
                "src": str(pngs[-1]),
                "secs": round(time.time() - t0),
                "prompt": prompt,
                "refs": [str(r) for r in refs],
            }
        else:
            d["failed"] += 1
        ledger_write(d)
    return f"{key}:{pose}", ok, f"thread={thread} {round(time.time() - t0)}s log={log.name}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*")
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--extra", default="", help="correction appended to every prompt in this batch")
    ap.add_argument("--adopt", nargs=2, metavar=("KEY:POSE", "PNG"))
    a = ap.parse_args()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if a.adopt:
        key, pose = a.adopt[0].split(":")
        dst = raw_path(key, pose)
        _archive_old(dst)
        shutil.copy2(a.adopt[1], dst)
        with _lock:
            d = ledger()
            d["outputs"][f"{key}-{pose}"] = {"adopted": a.adopt[1]}
            ledger_write(d)
        print("adopted", dst)
        return
    todo = []
    for t in a.targets:
        key, pose = t.split(":")
        if key not in BY_KEY:
            sys.exit(f"unknown key {key}")
        if raw_path(key, pose).exists() and not a.force:
            print(f"skip {t} (raw exists)")
            continue
        todo.append((key, pose))
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        futs = [ex.submit(gen_one, k, p, a.extra) for k, p in todo]
        for f in as_completed(futs):
            name, ok, info = f.result()
            print(("OK  " if ok else "FAIL"), name, info, flush=True)
    print("codex calls so far:", ledger()["codex_calls"])


if __name__ == "__main__":
    main()
