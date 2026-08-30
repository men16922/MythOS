"""Experiment runner. ``python -m experiments.run <slug> [options]``

Every run writes ``experiments/results/<UTC stamp>-<slug>/`` containing
``report.md``, ``provenance.json`` and ``raw/data.json``. Reports are never
overwritten — a stamped directory per run is the point, so two runs of the same
experiment can be diffed instead of one silently replacing the other.
"""

from __future__ import annotations

import sys

from experiments import exp_context_overflow, exp_workload_profile

EXPERIMENTS = {
    exp_workload_profile.SLUG: exp_workload_profile,
    exp_context_overflow.SLUG: exp_context_overflow,
}


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if not args or args[0] in {"-h", "--help", "list"}:
        print("experiments:")
        for slug, module in EXPERIMENTS.items():
            first = (module.__doc__ or "").strip().splitlines()[0]
            print(f"  {slug:22s} {first}")
        print("\nusage: python -m experiments.run <slug> [--trace DIR] [...]")
        return 0
    slug, rest = args[0], args[1:]
    module = EXPERIMENTS.get(slug)
    if module is None:
        print(f"unknown experiment: {slug}\nknown: {', '.join(EXPERIMENTS)}", file=sys.stderr)
        return 2
    return int(module.main(rest))


if __name__ == "__main__":
    raise SystemExit(main())
