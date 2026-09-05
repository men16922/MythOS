#!/usr/bin/env python3
"""Headless combat-simulation runner — play a single encounter (default: the IX boss
fight ``ix_confrontation``) straight through the deterministic engine and print the
turn-by-turn log, so you can watch the boss skill/phase behavior without the story route.

Usage (venv active, or via ``make sim-boss``)::

    python scripts/sim_boss.py                       # 1 verbose IX boss playthrough
    python scripts/sim_boss.py --trials 60           # win-rate over 60 seeds (quiet)
    python scripts/sim_boss.py --encounter mech_siege --party se_rin
    python scripts/sim_boss.py --seed 7 --party se_rin,kai

The party plays a conservative greedy policy (approach nearest enemy + basic attack,
no player skills) — the SAME policy the balance invariant uses — so a verbose run shows
the boss's own skills/phases against a baseline party.
"""

from __future__ import annotations

import argparse
import sys

from mythos_combat import (
    CombatEngine,
    PlayerAction,
    build_ally_combatant,
    build_encounter,
    build_player_combatant,
)
from mythos_combat.models import Combatant, CombatState, distance
from mythos_runtime.scenario import load_scenario

_PLAYER_STATS = {"strength": 8, "intelligence": 6, "charisma": 5, "agility": 7, "perception": 6}


def _player(combat: dict, archetype: str) -> Combatant:
    return build_player_combatant(
        combatant_id="player",
        name="P",
        stats=_PLAYER_STATS,
        weapon_ids=combat["archetype_loadout"][archetype],
        weapons_pool=combat["weapons"],
        x=0,
        y=0,
        skills=combat["archetype_base_skills"][archetype],
    )


def _ally(combat: dict, ally_id: str) -> Combatant:
    return build_ally_combatant(
        entry=combat["allies"][ally_id], weapons_pool=combat["weapons"], x=0, y=0, controllable=True
    )


def _greedy(engine: CombatEngine, state: CombatState) -> PlayerAction:
    """Active controllable: approach the nearest enemy, then basic-attack (no skills)."""
    actor = state.active_actor()
    enemies = state.living_enemies()
    if actor is None or not enemies:
        return PlayerAction(type="defend")
    target = min(enemies, key=lambda e: distance(actor.x, actor.y, e.x, e.y))
    actions = engine.available_actions(state)
    best_tile = None
    best_d = distance(actor.x, actor.y, target.x, target.y)
    for tx, ty in actions.get("reachable", []):
        d = distance(tx, ty, target.x, target.y)
        if d < best_d:
            best_d = d
            best_tile = (tx, ty)
    return PlayerAction(type="attack", target_id=target.id, move_to=best_tile)


def _play(
    combat: dict, encounter_id: str, party: tuple[str, ...], archetype: str, seed: str
) -> CombatState:
    engine = CombatEngine()
    allies = [_ally(combat, a) for a in party]
    state = build_encounter(
        combat, encounter_id, player=_player(combat, archetype), allies=allies, seed=seed,
        engine=engine,
    )
    guard = 0
    while state.active and guard < 300:
        guard += 1
        actor = state.active_actor()
        if actor is None:
            break
        action = _greedy(engine, state) if actor.is_controllable else PlayerAction(type="defend")
        state = engine.take_player_turn(state, action)
    return state


def _print_run(state: CombatState) -> None:
    cur_round = None
    for e in state.log:
        if e.round != cur_round:
            cur_round = e.round
            print(f"\n── Round {cur_round} ──")
        skill = e.detail.get("skill") if isinstance(e.detail, dict) else None
        tag = f" «{e.action}»" if e.action in ("skill", "info", "defeat") else ""
        marker = "  ⚡" if skill else "  •" if e.action in ("info", "defeat") else "   "
        print(f"{marker}{tag} {e.text}")
    print("\n" + "=" * 60)
    print(f"OUTCOME: {state.outcome}")
    for c in state.combatants:
        side = c.faction.upper()
        rage = " [ENRAGED]" if getattr(c, "enraged", False) else ""
        print(f"  [{side:6}] {c.name:18} HP {c.hp:>3}/{c.max_hp:<3}{rage}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--scenario", default="neo-seoul")
    ap.add_argument("--encounter", default="ix_confrontation")
    ap.add_argument("--party", default="se_rin,kai", help="comma-separated ally ids ('' = solo)")
    ap.add_argument("--archetype", default="ghost")
    ap.add_argument("--seed", default="0")
    ap.add_argument("--trials", type=int, default=1, help=">1 ⇒ quiet win-rate over N seeds")
    args = ap.parse_args(argv)

    combat = load_scenario(args.scenario).combat
    if args.encounter not in combat["encounters"]:
        print(f"unknown encounter '{args.encounter}'. choices: {sorted(combat['encounters'])}")
        return 2
    party = tuple(p for p in args.party.split(",") if p)

    if args.trials > 1:
        wins = 0
        boss_skill_runs = 0
        enrage_runs = 0
        for i in range(args.trials):
            state = _play(combat, args.encounter, party, args.archetype, f"{args.encounter}:{i}")
            wins += state.outcome == "player_victory"
            logged = [e.action for e in state.log]
            boss_skill_runs += any(
                e.action == "skill" and (s := state.by_id(e.actor)) is not None and s.faction == "enemy"
                for e in state.log
            )
            enrage_runs += any("overload" in e.text.lower() or "과부하" in e.text for e in state.log)
            _ = logged
        n = args.trials
        print(f"encounter={args.encounter} party={'+'.join(party) or 'solo'} trials={n}")
        print(f"  win_rate         : {wins / n:.2f} ({wins}/{n})")
        print(f"  boss-used-skill  : {boss_skill_runs / n:.2f} of runs")
        print(f"  reached enrage   : {enrage_runs / n:.2f} of runs")
        return 0

    state = _play(combat, args.encounter, party, args.archetype, f"{args.encounter}:{args.seed}")
    print(f"# {args.scenario} / {args.encounter} / party={'+'.join(party) or 'solo'} / seed={args.seed}")
    _print_run(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
