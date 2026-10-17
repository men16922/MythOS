"""Public policy pages the app stores require: ``/privacy`` and ``/account-deletion`` (Korean + English).

The HTML lives in ``legal/`` with ``{{PLACEHOLDER}}`` slots filled once at startup:
- ``MYTHOS_CONTACT_EMAIL`` — the developer contact shown on both pages (a mailto link). Without it the pages point
  at the developer email of the store listing instead, so a deploy without the variable is still truthful.
- ``MYTHOS_DEVELOPER_NAME`` — the developer name (default ``Project Mythos``); must match the Play listing.
"""

from __future__ import annotations

import html
import os
import re
from pathlib import Path

LEGAL_DIR = Path(__file__).parent / "legal"
#: Bump when the policy text changes (shown as the effective date).
EFFECTIVE_DATE = "2026-10-18"
DEFAULT_DEVELOPER = "Project Mythos"
PAGES = {"privacy": "privacy.html", "account-deletion": "account-deletion.html"}

_EMAIL_RE = re.compile(r"^[^@\s<>\"']+@[^@\s<>\"']+\.[A-Za-z]{2,}$")
_SLOT_RE = re.compile(r"\{\{([A-Z_]+)\}\}")


def contact_email(raw: str | None) -> str | None:
    value = (raw or "").strip()
    return value if _EMAIL_RE.fullmatch(value) else None


def _slots(email: str | None, developer: str) -> dict[str, str]:
    if email:
        link = f'<a href="mailto:{html.escape(email)}">{html.escape(email)}</a>'
        ko, en = f"문의: {link}", f"Email: {link}"
        ko_inline = en_inline = link
    else:
        ko = "Google Play 스토어 등록정보에 있는 개발자 이메일로 연락하세요."
        en = "Use the developer email shown on the game's Google Play store listing."
        ko_inline = "Google Play 스토어 등록정보의 개발자 이메일"
        en_inline = "the developer email on the game's Google Play store listing"
    return {
        "STYLE": (LEGAL_DIR / "_style.css").read_text(encoding="utf-8"),
        "EFFECTIVE": EFFECTIVE_DATE,
        "DEVELOPER": html.escape(developer),
        "CONTACT_KO": ko,
        "CONTACT_EN": en,
        "CONTACT_KO_INLINE": ko_inline,
        "CONTACT_EN_INLINE": en_inline,
    }


def render(page: str, *, email: str | None = None, developer: str = DEFAULT_DEVELOPER) -> str:
    """The filled HTML of ``page`` (a key of ``PAGES``). An unknown slot raises ``KeyError``."""
    slots = _slots(email, developer)
    source = (LEGAL_DIR / PAGES[page]).read_text(encoding="utf-8")
    return _SLOT_RE.sub(lambda m: slots[m.group(1)], source)


def render_all_from_env() -> dict[str, str]:
    email = contact_email(os.getenv("MYTHOS_CONTACT_EMAIL"))
    developer = (os.getenv("MYTHOS_DEVELOPER_NAME") or "").strip() or DEFAULT_DEVELOPER
    return {page: render(page, email=email, developer=developer) for page in PAGES}
