"""Pure renderers for the terminal radar / tactical board.

Kept UI-framework-agnostic (returns HTML strings) so it can be unit-tested and
reused. Consumes the ``render_radar`` snapshot from ``mythos_combat`` directly.
Rendered via ``st.markdown`` (no iframe) so reruns swap HTML in place without the
flicker an embedded component causes; the radar "blink" is a CSS animation.
"""

from __future__ import annotations

import html
from typing import Any

_FACTION_COLOR = {
    "player": "#29ffc6",
    "ally": "#5aa0ff",
    "enemy": "#ff5a7a",
}


def _hp_bar(ratio: float, width: int = 10) -> str:
    filled = max(0, min(width, round(ratio * width)))
    return "█" * filled + "░" * (width - filled)


def render_radar_html(radar: dict[str, Any]) -> str:
    """Build the radar grid + contact list as a self-contained HTML block."""
    arena = radar.get("arena", {"w": 8, "h": 6})
    w, h = int(arena.get("w", 8)), int(arena.get("h", 6))
    blips = radar.get("blips", [])
    by_cell: dict[tuple[int, int], dict[str, Any]] = {}
    for blip in blips:
        if blip.get("alive", True):
            by_cell[(int(blip["x"]), int(blip["y"]))] = blip

    rows: list[str] = []
    for gy in range(h - 1, -1, -1):  # higher y on top
        cells: list[str] = []
        for gx in range(w):
            blip = by_cell.get((gx, gy))
            if blip is None:
                cells.append('<span class="rdr-cell rdr-empty">·</span>')
                continue
            color = _FACTION_COLOR.get(str(blip.get("faction")), "#cccccc")
            glyph = html.escape(str(blip.get("glyph", "●")))
            cls = "rdr-cell rdr-blip"
            if str(blip.get("faction")) == "enemy":
                cls += " rdr-pulse"
            title = html.escape(str(blip.get("name", "")))
            cells.append(
                f'<span class="{cls}" style="color:{color}" title="{title}">{glyph}</span>'
            )
        rows.append('<div class="rdr-row">' + "".join(cells) + "</div>")

    contacts: list[str] = []
    for blip in blips:
        color = _FACTION_COLOR.get(str(blip.get("faction")), "#cccccc")
        name = html.escape(str(blip.get("name", "")))
        hp = int(blip.get("hp", 0))
        max_hp = int(blip.get("max_hp", 1)) or 1
        ratio = hp / max_hp
        dead = "" if blip.get("alive", True) else " rdr-dead"
        bar = _hp_bar(ratio)
        defending = " ◛" if blip.get("defending") else ""
        contacts.append(
            f'<div class="rdr-contact{dead}">'
            f'<span style="color:{color}">{html.escape(str(blip.get("glyph", "●")))}</span> '
            f'<span class="rdr-name">{name}</span>{defending} '
            f'<span class="rdr-hp">{bar} {hp}/{max_hp}</span></div>'
        )

    round_no = int(radar.get("round", 1))
    outcome = radar.get("outcome")
    status = f"OUTCOME // {html.escape(str(outcome))}" if outcome else f"ROUND // {round_no:02d}"

    style = """
    <style>
      .rdr-wrap{background:rgba(2,10,9,0.95);border:1px solid rgba(41,255,198,0.35);
        border-radius:6px;padding:12px 14px;font-family:'SF Mono',Menlo,Consolas,monospace;
        color:#cffff1;box-shadow:0 0 22px rgba(41,255,198,0.08);}
      .rdr-head{color:#29ffc6;font-size:0.78rem;letter-spacing:1px;margin-bottom:8px;}
      .rdr-grid{display:inline-block;background:#040d0c;border:1px solid #163a33;
        border-radius:4px;padding:6px 8px;margin-bottom:10px;}
      .rdr-row{display:flex;}
      .rdr-cell{width:18px;height:18px;display:flex;align-items:center;justify-content:center;
        font-size:13px;line-height:1;}
      .rdr-empty{color:#16302a;}
      .rdr-pulse{animation:rdr-blink 1s steps(2,end) infinite;}
      @keyframes rdr-blink{0%{opacity:1;}50%{opacity:0.25;}100%{opacity:1;}}
      .rdr-contact{font-size:0.8rem;line-height:1.6;}
      .rdr-contact.rdr-dead{opacity:0.4;text-decoration:line-through;}
      .rdr-name{color:#e9fff9;}
      .rdr-hp{color:#7fd9c6;}
    </style>
    """
    return (
        style
        + '<div class="rdr-wrap">'
        + f'<div class="rdr-head">TACTICAL RADAR :: {status}</div>'
        + '<div class="rdr-grid">'
        + "".join(rows)
        + "</div>"
        + "".join(contacts)
        + "</div>"
    )


__all__ = ["render_radar_html"]
