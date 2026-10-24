"""Play a whole run through the REAL UI with a bot, and fail on a stuck screen or any console error.

  .venv/bin/python scripts/dev/ui_playthrough.py [--runs 2] [--max-minutes 12] [--seed-daily] [--signal-plus]

`--signal-plus` plays as a Signal+ player (the server grants the bot's player id): background pick, districts first on
the map, every conversation, camp nights, thoughts and growth points.

`make test-e2e-v2` stops at the first fight; this goes on until the run ends (map → events → fights → rewards → shop →
safehouse → treasure → final choice → ending), so it exercises the screens as they follow each other — the stat voices,
bond cutscenes, IX's mirror, implant set cards, mutator chip — not one at a time. The bot is simple and not meant to
win: it reads which screen it is on from the dev hook (`window.__m2.run.screen.kind`, needs `npx vite`, started here
on private ports) and then acts only by clicking real buttons / pressing real keys, like a player.

`PLAYTHROUGH_TOUR=<dir>` saves two screenshots of every screen kind it meets plus each toured screen (UX review);
`PLAYTHROUGH_LANG=en` plays in English.

Always muted (`?mute=1`), one tab, never the owner's dev ports. Exit code 0 = every run reached an ending screen
without a stuck state or a console error; 1 otherwise (the screen kind it was stuck on and the last state are printed).
"""

from __future__ import annotations

import argparse
import contextlib
import os
import re
import socket
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
UI = ROOT / "src" / "mythos_ui"
STUCK_SECONDS = 70
#: Player id the server treats as Signal+ in `--signal-plus` runs (MYTHOS_PLUS_GRANT).
PLUS_PLAYER = "uiplaythrough_plus01"


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_http(url: str, tries: int = 80) -> None:
    import urllib.request

    for _ in range(tries):
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.4)
    raise SystemExit(f"server did not come up: {url}")


def snapshot(page: Page) -> dict:
    return page.evaluate(
        """() => { const r = window.__m2 && window.__m2.run; if (!r) return { kind: 'none' };
          const s = r.screen; return { kind: s.kind, act: r.act, hp: r.hp, node: r.nodeId, visited: r.visited.length,
            combatTurn: s.kind === 'combat' ? s.combat.turn : null, foes: s.kind === 'combat' ? s.combat.units.filter((u) => u.side === 'enemy').map((u) => u.hp).join(',') : null, me: s.kind === 'combat' ? (s.combat.units.find((u) => u.defId === 'connector') || {}).hp : null, hand: s.kind === 'combat' ? s.combat.hand.length : null, energy: s.kind === 'combat' ? s.combat.energy : null, phase: s.kind === 'combat' ? s.combat.phase : null,
            resolved: s.kind === 'event' ? !!(s.resolved || (s.improvised && s.improvised.rolled)) : null, rng: r.rng, seed: r.seed,
            crpg: !!r.crpg, districts: Object.values(r.map.nodes).filter((n) => n.kind === 'district').map((n) => n.id).join(',') } }"""
    )


def click_first(page: Page, selector: str, timeout: int = 1500) -> bool:
    loc = page.locator(selector)
    for i in range(loc.count()):
        item = loc.nth(i)
        try:
            if item.is_visible() and item.is_enabled():
                item.click(
                    timeout=timeout, force=True
                )  # pulsing buttons are never 'stable'; still a real mouse click
                return True
        except Exception as exc:
            if os.environ.get("PLAYTHROUGH_DEBUG"):
                print(
                    f"   click_first({selector!r}) #{i}: {' | '.join(str(exc).splitlines()[:7])[:500]}"
                )
            continue
    return False


def result_of(page: Page) -> str:
    return page.evaluate(
        "() => { const s = window.__m2 && window.__m2.run && window.__m2.run.screen; return s && s.kind === 'ended' ? s.result + ' / ' + s.endingId : 'unknown' }"
    )


CENTERS_JS = """(sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })"""


def centers(page: Page, selector: str) -> list[tuple[float, float]]:
    return [(x, y) for x, y in page.evaluate(CENTERS_JS, selector)]


DEBUG_STEPS = {"on": False}


def shot_step(page: Page, name: str) -> None:
    d = os.environ.get("PLAYTHROUGH_SHOT")
    if d and DEBUG_STEPS["on"]:
        page.screenshot(path=f"{d}/step_{name}.png")


GRID_W = 7
PLAN_JS = """async () => {
  const r = window.__m2 && window.__m2.run
  if (!r || r.screen.kind !== 'combat') return null
  const m = await import('/src/v2/engine/combatSim.ts')
  const c = r.screen.combat
  return { plan: m.planGreedyTurn(c, window.__m2.C), hand: c.hand.map((x) => x.uid),
           units: Object.fromEntries(c.units.map((u) => [u.uid, u.pos])) }
}"""
SIG_JS = """() => { const r = window.__m2.run; if (!r || r.screen.kind !== 'combat') return 'gone'
  const c = r.screen.combat; return JSON.stringify([c.hand.map((x) => x.uid), c.energy, c.units.map((u) => [u.uid, u.pos, u.hp]), c.phase]) }"""
DIRS = {"up": (0, -1), "down": (0, 1), "left": (-1, 0), "right": (1, 0)}


def click_tile(page: Page, pos: dict) -> None:
    tiles = centers(page, ".m2c-hitgrid polygon")
    index = int(pos["y"]) * GRID_W + int(pos["x"])
    if index >= len(tiles):
        return  # the fight ended between planning and clicking (the board is gone): nothing to click
    x, y = tiles[index]
    page.mouse.click(x, y)
    page.wait_for_timeout(350)


def run_step(page: Page, step: dict, info: dict) -> None:
    """Take one planned step through the real UI: select the unit by its tile, press the card's number, click the target."""
    here = dict(info["units"][step["uid"] if step["kind"] == "move" else step["origin"]])
    if step["kind"] == "move":
        click_tile(page, here)
        click_tile(page, step["to"])
        return
    if step["spot"]:
        click_tile(page, here)
        click_tile(page, step["spot"])
        here = dict(step["spot"])
    click_tile(
        page, here
    )  # select the acting unit (a card with no fixed owner uses the selected unit)
    page.keyboard.press(str(info["hand"].index(step["cardUid"]) + 1))
    page.wait_for_timeout(300)
    target = step["target"]
    if "pos" in target:
        click_tile(page, target["pos"])
    elif "dir" in target:
        dx, dy = DIRS[target["dir"]]
        click_tile(page, {"x": here["x"] + dx, "y": here["y"] + dy})
    else:
        click_tile(page, here)  # an untargeted card plays when its own tile is clicked


def play_combat_turn(page: Page) -> None:
    """Play the turn the simulator's expert (greedy) bot would, but only through real clicks and keys."""
    if len(centers(page, ".m2c-hitgrid polygon")) != GRID_W * 5:
        page.wait_for_timeout(600)  # the board is still loading in
        return
    fails = 0
    for _ in range(14):
        data = page.evaluate(PLAN_JS)
        if not data or not data["plan"]:
            break
        before = page.evaluate(SIG_JS)
        run_step(page, data["plan"][0], data)
        page.wait_for_timeout(500)
        if page.evaluate(SIG_JS) == before:
            fails += 1
            page.keyboard.press("Escape")  # disarm a half-made selection before trying again
            page.wait_for_timeout(200)
            if fails >= 2:
                break
    page.keyboard.press("e")
    page.wait_for_timeout(2500)


def play_combat_turn_simple(page: Page) -> None:
    """Step toward the nearest foe, then play each card on its first legal target (or any unit), then end the turn."""
    uids = page.evaluate(
        "() => window.__m2.run.screen.combat.units.filter((u) => u.side === 'enemy' && u.hp > 0).map((u) => u.uid)"
    )
    foes = [c for uid in uids for c in centers(page, f'[data-uid="{uid}"] .m2c-u-hit')]
    steps = centers(page, ".m2c-move")
    if steps and foes:
        fx, fy = foes[0]
        bx, by = min(steps, key=lambda c: (c[0] - fx) ** 2 + (c[1] - fy) ** 2)
        page.mouse.click(bx, by)
        page.wait_for_timeout(500)
        shot_step(page, "0_move")
    for slot in range(1, 6):
        page.keyboard.press(str(slot))
        page.wait_for_timeout(150)
        shot_step(page, f"{slot}_selected")
        arrows = centers(page, ".m2c-dir")
        if arrows and foes:  # a directional card: aim at the arrow that points to the nearest foe
            fx, fy = foes[0]
            ax, ay = min(arrows, key=lambda c: (c[0] - fx) ** 2 + (c[1] - fy) ** 2)
            page.mouse.click(ax, ay)
            page.wait_for_timeout(500)
            continue
        targets = centers(page, ".m2c-target")
        if targets:
            page.mouse.click(*targets[0])
            page.wait_for_timeout(500)
            continue
        hits = page.locator(".m2c-u-hit")
        for k in range(hits.count() - 1, -1, -1):
            with contextlib.suppress(Exception):  # a unit that is not a legal target does nothing
                hits.nth(k).click(timeout=300, force=True)
            page.wait_for_timeout(60)
        page.wait_for_timeout(250)
    page.keyboard.press("e")
    page.wait_for_timeout(2500)


def act_once(page: Page, state: dict) -> bool:
    """One real-UI action for the current screen. Returns False when it found nothing to do."""
    kind = state["kind"]
    if kind == "act_intro":
        loc = page.locator(".m2-actintro")
        if loc.count():
            loc.first.click()
            return True
        return False
    if kind == "map":
        # Thoughts on offer and growth points first (both sit in the map's side panel), then a node.
        if click_first(page, ".m2-thought .m2-btn--primary:not([disabled])", timeout=300):
            return True
        if click_first(page, ".m2-growth__stats button:not([disabled])", timeout=300):
            return True
        # A Signal+ player plans the route through the act's district (like aiming for a StS elite).
        toward = page.evaluate(TOWARD_DISTRICT_JS)
        if toward and click_first(page, f'.m2-node[data-node="{toward}"].is-reach', timeout=500):
            return True
        # Like a careful player: districts, safehouse, shop, chest and street events before plain fights, elites last.
        for k in ("district", "rest", "shop", "treasure", "event", "combat", "elite", "boss"):
            if click_first(page, f".m2-node--{k}.is-reach"):
                return True
        return click_first(page, ".m2-node.is-reach")
    if kind == "event":
        if state.get("resolved"):
            return click_first(page, ".m2-outcome .m2-btn--primary")
        # Prefer an option with a visible stat check (so the roll animation and the stat voice run), else the first open one.
        return click_first(page, ".m2-options .m2-option:not(.is-locked):not([disabled])")
    if kind == "combat":
        # The first fight opens a coach overlay (a real new player sees it too): skip it like a player would.
        if click_first(
            page, "button:has-text('튜토리얼 건너뛰기'), button:has-text('Skip tutorial')"
        ):
            return True
        if state.get("phase") == "player":
            play_combat_turn(page)
            return True
        page.wait_for_timeout(700)
        return True
    if kind == "reward":
        # An open card-choice overlay comes first (pick the first card), then an implant pick, then the plain rows, then leave.
        if page.locator(".m2-overlay .m2-choice").count():
            page.wait_for_timeout(700)  # the fan animates in
            return click_first(page, ".m2-choice__slot:not(.is-picked)")
        for sel in (
            ".m2-rpick__opt:not([disabled])",
            ".m2-rrow--implant:not([disabled])",
            "button.m2-rrow:not([disabled]):not(.is-taken)",  # the echo row is a plain div: not clickable,
        ):
            if click_first(page, sel):
                return True
        return click_first(page, ".m2-reward__foot .m2-btn")
    if kind == "card_reward":
        if click_first(page, ".m2-cardchoice:not([disabled]), .m2-rcard:not([disabled])"):
            return True
        return click_first(page, "button:has-text('건너'), button:has-text('Skip')")
    if kind == "shop":
        return click_first(
            page, ".m2-shop__leave, button:has-text('떠난다'), button:has-text('Leave')"
        )
    if kind == "district":
        if click_first(page, ".m2-poi:not([disabled])"):
            return True
        return click_first(page, ".m2-district__panel > .m2-btn")
    if kind == "dialogue":
        if click_first(
            page, ".m2-dialogue__panel > .m2-btn--primary", timeout=300
        ):  # the conversation ended
            return True
        if page.locator(".m2-pending").count():
            page.wait_for_timeout(500)  # the d20 lands
            return click_first(
                page,
                ".m2-pending__actions .m2-btn:has-text('영감'), .m2-pending__actions .m2-btn--primary",
            )
        return click_first(page, ".m2-dialogue .m2-option:not(.is-locked):not([disabled])")
    if kind == "rest":
        if click_first(page, ".m2-camp", timeout=300):
            return True
        if click_first(page, ".m2-restopt--heal") or click_first(page, ".m2-restopt"):
            return True
        return click_first(page, ".m2-rest__done .m2-btn--primary")
    if kind == "treasure":
        if click_first(page, ".m2-treasure__loot .m2-btn--primary"):
            return True
        return click_first(page, ".m2-cache")  # the chest opens on click
    if kind == "card_pick":
        # Confirm when a card is selected; otherwise select the first one (a second click would deselect it).
        if click_first(
            page,
            ".m2-pick__actions .m2-btn--primary:not([disabled]), .m2-pick__actions .m2-btn--danger:not([disabled])",
        ):
            return True
        return click_first(page, ".m2-cardgrid > *")
    if kind == "final_choice":
        return click_first(page, ".m2-final button:not([disabled])")
    return False


#: The reachable node that leads to an unvisited district (null when none does).
TOWARD_DISTRICT_JS = """() => { const r = window.__m2 && window.__m2.run; if (!r || !r.crpg) return null;
  const nodes = r.map.nodes; const target = Object.values(nodes).find((n) => n.kind === 'district' && !r.visited.includes(n.id));
  if (!target) return null;
  const leads = (id) => id === target.id || (nodes[id] ? nodes[id].next.some(leads) : false);
  const from = r.nodeId === null ? r.map.startIds : (nodes[r.nodeId] ? nodes[r.nodeId].next : []);
  return from.find(leads) || null }"""

SET_SCREEN_JS = """(screen) => { const r = window.__m2.run; window.__m2.setRun({ ...r, screen: typeof screen === 'function' ? screen(r) : screen }) }"""


def kind_of(page: Page) -> str:
    return str(snapshot(page)["kind"])


def tour_screens(page: Page) -> list[str]:
    """Jump the live run to the screens a bot rarely reaches (shop, safehouse, treasure, final choice) and use each through
    its real buttons. Returns a list of problems (empty = every screen rendered, accepted a real click and moved on)."""
    problems: list[str] = []

    def put(build_js: str) -> None:
        page.evaluate(
            f"() => {{ const r = window.__m2.run; const next = ({build_js})(r); window.__m2.setRun({{ ...r, ...next }}) }}"
        )
        page.wait_for_timeout(700)
        tour = os.environ.get("PLAYTHROUGH_TOUR")
        if tour:
            page.screenshot(path=f"{tour}/tour_{kind_of(page)}.png")

    def expect(label: str, ok: bool, detail: str = "") -> None:
        if not ok:
            problems.append(f"{label}{': ' + detail if detail else ''}")

    # shop: buy a card, then leave
    put(
        """(r) => ({ credits: 400, screen: { kind: 'shop', stock: {
            cards: r.pools.cards.slice(0, 3).map((id, i) => ({ cardId: id, price: 40 + i * 10, sold: false })),
            implants: r.pools.implants.slice(0, 2).map((id) => ({ implantId: id, price: 90, sold: false })),
            consumables: [], removePrice: 50, removeUsed: false, healPrice: 30, scrubPrice: 40 } } })"""
    )
    before = page.evaluate("() => [window.__m2.run.deck.length, window.__m2.run.credits]")
    expect("shop renders", page.locator(".m2-shop").count() > 0)
    click_first(
        page, ".m2-shop__item:not(.is-sold) .m2-card, .m2-shop__item:not(.is-sold) > *:first-child"
    )
    page.wait_for_timeout(400)
    after = page.evaluate("() => [window.__m2.run.deck.length, window.__m2.run.credits]")
    expect(
        "shop purchase", after[0] == before[0] + 1 and after[1] < before[1], f"{before} -> {after}"
    )
    click_first(page, ".m2-shop button.m2-btn--lg")
    expect("shop leave -> map", kind_of(page) == "map", kind_of(page))

    # safehouse: heal, then done
    put("(r) => ({ hp: 10, screen: { kind: 'rest', done: false } })")
    expect("rest renders", page.locator(".m2-rest").count() > 0)
    click_first(page, ".m2-restopt--heal")
    page.wait_for_timeout(500)
    healed = page.evaluate("() => window.__m2.run.hp")
    expect("rest heal", healed > 10, f"hp {healed}")
    click_first(page, ".m2-rest__done .m2-btn--primary, .m2-rest .m2-btn--primary")
    expect("rest done -> map", kind_of(page) == "map", kind_of(page))

    # treasure: open, take, continue
    put(
        "(r) => ({ screen: { kind: 'treasure', implantId: r.pools.implants[0], credits: 25, opened: false } })"
    )
    owned = page.evaluate("() => window.__m2.run.implants.length")
    click_first(page, ".m2-cache, .m2-treasure .m2-cache")
    page.wait_for_timeout(600)
    click_first(page, ".m2-treasure__loot .m2-btn--primary")
    page.wait_for_timeout(400)
    got = page.evaluate("() => window.__m2.run.implants.length")
    expect("treasure gives the implant", got == owned + 1, f"{owned} -> {got}")
    expect("treasure -> map", kind_of(page) == "map", kind_of(page))

    # final choice -> ending
    put("(r) => ({ act: 3, screen: { kind: 'final_choice' } })")
    expect("final choice renders", page.locator(".m2-final").count() > 0)
    click_first(page, ".m2-ending-opt:not(.is-locked):not([disabled])")
    page.wait_for_timeout(1500)
    expect("final choice -> ended", kind_of(page) == "ended", kind_of(page))
    page.wait_for_selector(".m2-ending", timeout=8000)
    tour = os.environ.get("PLAYTHROUGH_TOUR")
    if tour:
        page.wait_for_timeout(6000)  # the tally counts up and the chronicle settles
        page.screenshot(path=f"{tour}/tour_ending.png", full_page=True)
        with contextlib.suppress(Exception):
            page.get_by_role("button", name=re.compile("아카이브로|To the Archive")).first.click(
                timeout=3000
            )
            page.wait_for_timeout(2500)
            page.screenshot(path=f"{tour}/tour_archive.png")
    return problems


def play_one(
    page: Page,
    base: str,
    max_seconds: float,
    daily: bool,
    god: bool,
    max_nodes: int = 0,
    plus: bool = False,
) -> tuple[bool, str, Counter]:
    seen: Counter = Counter()
    page.goto(f"{base}/?mute=1")
    page.evaluate(
        "() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mythos2')) localStorage.removeItem(k); localStorage.setItem('mythos2.mute','1') }"
    )
    if plus:
        page.evaluate(f"() => localStorage.setItem('mythos2.playerId', '{PLUS_PLAYER}')")
    page.reload()
    page.wait_for_function("() => !!window.__m2", timeout=15000)
    # Fast animations keep the whole run short; everything else is the shipped game.
    page.evaluate(
        "() => window.__m2.setProfile((p) => ({ ...p, settings: { ...p.settings, fastAnim: true } }))"
    )
    if os.environ.get("PLAYTHROUGH_LANG") == "en":  # English pass (text review)
        page.evaluate(
            "() => window.__m2.setProfile((p) => ({ ...p, settings: { ...p.settings, lang: 'en' } }))"
        )
    if daily:
        page.locator(".m2-menu-item--daily").click()
    else:
        page.locator(
            ".m2-menu-item", has_text=re.compile("새 루프|New loop", re.IGNORECASE)
        ).first.click()
    if plus:
        page.locator(".m2-bgs button").first.wait_for(timeout=15000)  # the Signal+ background pick
        page.locator(".m2-bgs button").last.click()
    page.get_by_role("button", name=re.compile(r"^\s*(접속|Connect)\s*$")).first.click()
    page.wait_for_timeout(600)
    page.keyboard.press("Escape")  # skip the prologue
    deadline = time.time() + max_seconds
    last_sig, last_change = "", time.time()
    while time.time() < deadline:
        if page.locator(".m2-ending").count() > 0 and page.locator(".m2-ending").first.is_visible():
            return True, f"ended ({result_of(page)})", seen
        st = snapshot(page)
        if st["kind"] == "ended" or (st["kind"] == "none" and page.locator(".m2-ending").count()):
            return True, f"ended ({result_of(page)})", seen
        if god and st["kind"] not in ("none", "ended"):
            # QA stress mode: the bot is dumb, so keep it alive to reach the later screens (HP is the only thing changed).
            res = page.evaluate(
                """() => { const r = window.__m2.run; if (!r) return 'norun';
                  const c = r.screen.kind === 'combat' ? r.screen.combat : null;
                  const me = c && c.units.find((u) => u.defId === 'connector');
                  if (me && me.hp < 30) { me.hp = me.maxHp = 120; window.__m2.setRun({ ...r }) }
                  else if (!c && r.hp < 60) { window.__m2.setRun({ ...r, hp: 150, maxHp: 150 }); return 'topped' } return 'noop' }"""
            )
            if os.environ.get("PLAYTHROUGH_DEBUG"):
                print("   god:", res)
        seen[st["kind"]] += 1
        tour = os.environ.get("PLAYTHROUGH_TOUR")
        if tour and seen[st["kind"]] in (2, 6):
            # Review tour: two shots of every screen kind (settled, then later in the run).
            page.screenshot(path=f"{tour}/{st['kind']}_{seen[st['kind']]}.png")
        if max_nodes and st["kind"] == "map" and (st.get("visited") or 0) >= max_nodes:
            return True, f"quick: {st['visited']} map nodes played", seen
        if god and st["kind"] == "combat" and (st.get("combatTurn") or 0) % 1000 in (12, 24):
            # The bot hits too softly to finish some fights (the engine's own bots win them in ~6 turns). Wear the foes
            # down to 1 HP through the dev hook (bumping `turn` makes the screen adopt the edited state), so the fight
            # is still ended by a real card played with real clicks.
            page.evaluate(
                """() => { const r = window.__m2.run; const c = r.screen.combat;
                  const units = c.units.map((u) => u.side === 'enemy' ? { ...u, hp: 1, block: 0, armor: 0 } : u);
                  window.__m2.setRun({ ...r, screen: { ...r.screen, combat: { ...c, units, turn: c.turn + 1000 } } }) }"""
            )
        DEBUG_STEPS["on"] = st["kind"] == "combat" and (st.get("combatTurn") or 0) % 1000 == 14
        if st["kind"] == "combat" and (st.get("combatTurn") or 0) % 1000 > 30:
            return (
                True,
                f"bot stalled in a fight (turn {st['combatTurn']}, {st['foes']} foe HP) — a bot limit, not a stuck screen",
                seen,
            )
        shot = os.environ.get("PLAYTHROUGH_SHOT")
        if shot and st["kind"] == "combat" and (st.get("combatTurn") or 0) in (12, 30):
            page.screenshot(path=f"{shot}/turn{st['combatTurn']}_{st['node']}.png")
            print(f"   shot: {st}")
        if os.environ.get("PLAYTHROUGH_DEBUG"):
            print(f"   [{time.time() - deadline + max_seconds:5.1f}s] {st}")
        sig = repr(sorted(st.items(), key=lambda kv: kv[0]))
        if sig != last_sig:
            last_sig, last_change = sig, time.time()
        elif time.time() - last_change > STUCK_SECONDS:
            shot = os.environ.get("PLAYTHROUGH_SHOT")
            if shot:
                page.screenshot(path=f"{shot}/stuck_{st['kind']}.png")
                print(
                    "   stuck buttons:",
                    page.evaluate(
                        "() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.className.split(' ')[0] + (b.disabled ? '[disabled]' : '') + ':' + b.textContent.trim().slice(0, 24)))"
                    ),
                )
            return False, f"stuck on {st['kind']} for {STUCK_SECONDS}s: {st}", seen
        if not act_once(page, st):
            page.wait_for_timeout(500)
        else:
            page.wait_for_timeout(250)
    return False, f"time limit; last state {snapshot(page)}", seen


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--runs", type=int, default=2)
    ap.add_argument("--max-minutes", type=float, default=12.0, help="per run")
    ap.add_argument(
        "--daily", action="store_true", help="play the daily seed instead of a normal loop"
    )
    ap.add_argument(
        "--no-god", action="store_true", help="do not top up HP: the bot usually dies in act 1-2"
    )
    ap.add_argument(
        "--signal-plus",
        action="store_true",
        help="play as a Signal+ player (districts, dialogue, camp nights)",
    )
    ap.add_argument(
        "--max-nodes",
        type=int,
        default=0,
        help="stop playing after this many map nodes, then tour the shop/safehouse/treasure/final choice (quick check)",
    )
    args = ap.parse_args()
    api_port, ui_port = free_port(), free_port()
    if {api_port, ui_port} & {8010, 5173}:
        raise SystemExit("picked an owner dev port; rerun")
    env = {
        **os.environ,
        "MYTHOS_V2_STORE": "memory",
        "MYTHOS_AUTH": "open",
        "MYTHOS_FIREBASE_WEB_CONFIG": "{}",
        "MYTHOS_V2_GM": "off",
        "MYTHOS_PLUS_GRANT": PLUS_PLAYER,
        "PYTHONPATH": str(ROOT / "src"),
    }
    api = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "mythos_api.app:create_app",
            "--factory",
            "--port",
            str(api_port),
            "--log-level",
            "error",
        ],
        env=env,
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
    )
    ui = subprocess.Popen(
        ["npx", "vite", "--port", str(ui_port), "--strictPort"],
        env={**os.environ, "MYTHOS_DEV_API": f"http://127.0.0.1:{api_port}"},
        cwd=UI,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    failures = 0
    try:
        wait_http(f"http://127.0.0.1:{api_port}/api/v2/health")
        wait_http(f"http://localhost:{ui_port}/")
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for n in range(1, args.runs + 1):
                # ko-KR: a brand-new profile follows the browser language; the bot reads Korean labels.
                page = browser.new_page(viewport={"width": 1280, "height": 720}, locale="ko-KR")
                errors: list[str] = []
                page.on("pageerror", lambda e, errors=errors: errors.append(f"pageerror: {e}"))
                page.on(
                    "console",
                    lambda m, errors=errors: (
                        errors.append(f"console: {m.text}")
                        if m.type == "error"
                        and "Failed to load resource" not in m.text
                        and "favicon" not in m.text
                        else None
                    ),
                )
                started = time.time()
                ok, why, seen = play_one(
                    page,
                    f"http://localhost:{ui_port}",
                    args.max_minutes * 60,
                    args.daily,
                    not args.no_god,
                    args.max_nodes,
                    args.signal_plus,
                )
                if ok and kind_of(page) != "ended":
                    try:
                        issues = tour_screens(page)
                    except Exception as exc:
                        issues = [f"tour crashed: {str(exc).splitlines()[0][:200]}"]
                    if issues:
                        ok = False
                        why += "; screen tour: " + " | ".join(issues)
                    else:
                        why += "; screen tour OK (shop, safehouse, treasure, final choice → ending)"
                took = time.time() - started
                shown = ", ".join(f"{k} {v}" for k, v in seen.most_common())
                if errors:
                    ok = False
                    why = f"{why}; {len(errors)} console/page errors, first: {errors[0][:200]}"
                print(
                    f"run {n}: {'OK' if ok else 'FAIL'} in {took:.0f}s — {why}\n   screens seen (polls): {shown}"
                )
                failures += 0 if ok else 1
                page.close()
            browser.close()
    finally:
        for proc in (ui, api):
            proc.terminate()
        for proc in (ui, api):
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.kill()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
