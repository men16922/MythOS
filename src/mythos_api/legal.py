"""Public policy pages the app stores require: ``/privacy`` and ``/account-deletion`` (Korean + English).

The HTML lives in ``legal/`` with ``{{PLACEHOLDER}}`` slots filled once at startup:
- ``MYTHOS_CONTACT_EMAIL`` — the developer contact shown on both pages (a mailto link). Without it the pages
  disclose the missing contact; a nonexistent Play listing must not be presented as a working request path.
- ``MYTHOS_DEVELOPER_NAME`` — the developer name (default ``Project Mythos``); must match the Play listing.
"""

from __future__ import annotations

import html
import os
import re
from pathlib import Path

LEGAL_DIR = Path(__file__).parent / "legal"
#: Bump when the policy text changes (shown as the effective date).
EFFECTIVE_DATE = "2026-11-05"
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
        request_ko = (
            f"게임에 접속할 수 없으면 {link}로 <b>로그인에 쓴 Google 이메일</b>을 적어 삭제를 요청하세요. "
            "본인 확인 뒤 30일 안에 처리하고 결과를 알려 드립니다. 비밀번호나 로그인 코드는 보내지 마세요."
        )
        request_en = (
            f"If you cannot reach the game, email {link} with <b>the Google email you signed in with</b>. "
            "After confirming your identity, we process the request within 30 days and report the result. "
            "Do not send a password or sign-in code."
        )
    else:
        ko = "지원 이메일이 아직 등록되지 않았습니다. 현재 계정 삭제 요청 경로는 웹 게임의 설정 → 계정 삭제입니다."
        en = "A support email has not been configured. The current deletion path is Settings → Delete account in the web game."
        request_ko = (
            '앱 없이도 <a href="/">웹 게임</a>에 같은 Google 계정으로 로그인한 뒤 설정 → 계정 삭제를 사용할 수 있습니다. '
            "지원 이메일이 아직 등록되지 않아 로그인할 수 없는 경우의 별도 요청 경로는 현재 제공되지 않습니다."
        )
        request_en = (
            'Without the app, sign in with the same Google account in the <a href="/">web game</a> and use Settings → Delete account. '
            "A support email has not been configured, so a separate request path for users who cannot sign in is not yet available."
        )
    return {
        "STYLE": (LEGAL_DIR / "_style.css").read_text(encoding="utf-8"),
        "EFFECTIVE": EFFECTIVE_DATE,
        "DEVELOPER": html.escape(developer),
        "CONTACT_KO": ko,
        "CONTACT_EN": en,
        "REQUEST_KO": request_ko,
        "REQUEST_EN": request_en,
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
