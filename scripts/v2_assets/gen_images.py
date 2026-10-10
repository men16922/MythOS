"""Generate Mythos 2.0 images into resources/neo-seoul/v2/.

Usage (repo venv):
  .venv/bin/python scripts/v2_assets/gen_images.py static            # items 1-7
  .venv/bin/python scripts/v2_assets/gen_images.py events cards       # content-driven groups
  .venv/bin/python scripts/v2_assets/gen_images.py cards --only packet_shot,jab
  .venv/bin/python scripts/v2_assets/gen_images.py static --force title,act2
  .venv/bin/python scripts/v2_assets/gen_images.py all --dry-run
  .venv/bin/python scripts/v2_assets/gen_images.py static --only act1 --repost   # re-crop cached raw, no API

Groups: static, events, cards, implants, consumables, all. Existing outputs are skipped unless forced
(--force takes output stems such as 'title' or 'packet_shot', output keys, or 'all').
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import ImageJob, repost_image_job, run_image_jobs

GROUPS = ("static", "events", "cards", "implants", "consumables")


def jobs_for(group: str) -> list[ImageJob]:
    if group == "static":
        from specs_static import static_jobs

        return static_jobs()
    import specs_content

    return getattr(specs_content, f"{group}_jobs")()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("groups", nargs="+", choices=(*GROUPS, "all"))
    ap.add_argument("--force", default="", help="comma list of stems/keys to regenerate, or 'all'")
    ap.add_argument("--only", default="", help="comma list of stems/keys to restrict to")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument(
        "--repost", action="store_true", help="re-crop/post-process from cached raw images (no API)"
    )
    ap.add_argument(
        "--reverse",
        action="store_true",
        help="process jobs last-first (a second lane on another model)",
    )
    args = ap.parse_args(argv)

    groups = GROUPS if "all" in args.groups else args.groups
    jobs: list[ImageJob] = []
    for g in groups:
        jobs.extend(jobs_for(g))
    only = {s for s in args.only.split(",") if s}
    if only:
        jobs = [
            j for j in jobs if j.key in only or j.key.rsplit("/", 1)[-1].rsplit(".", 1)[0] in only
        ]
    if args.reverse:
        jobs.reverse()
    if args.repost:
        for j in jobs:
            print(repost_image_job(j))
        return 0
    force = {s for s in args.force.split(",") if s}
    print(f"{len(jobs)} jobs ({', '.join(groups)})", flush=True)
    results = run_image_jobs(jobs, force=force, dry=args.dry_run, workers=args.workers)
    return 1 if any(r.startswith(("FAIL", "ERROR")) for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
