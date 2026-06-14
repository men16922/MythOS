#!/usr/bin/env bash
#
# notify.sh SUBJECT [BODY] — 무인 overnight 루프 "실패" 알림을 호스트에서 본인에게 메일 발송.
# ----------------------------------------------------------------------------
# 루프 엔진(claude -p / codex exec / agy --print)은 헤드리스·샌드박스라 Gmail/Notion MCP 를
# 호출할 수 없다. 그래서 알림은 run.sh(호스트, 비샌드박스)가 종료 시 이 스크립트로 보낸다.
# 성공/정상 종료엔 부르지 않는다(run.sh 가 실패 클래스에서만 호출 — 과다 발송 방지).
#
# 발송 수단(우선순위):
#   1) SMTP(앱 비밀번호) — MYTHOS_SMTP_USER + MYTHOS_SMTP_PASS 설정 시. 무인 신뢰 최고.
#      (Gmail: smtp.gmail.com:587, 2단계인증+앱비밀번호. host/port override: MYTHOS_SMTP_HOST/PORT)
#   2) macOS Mail.app(osascript) — 자격증명 0. Mail 계정 설정 + 최초 자동화 권한 허용 필요.
# 수신자: MYTHOS_NOTIFY_TO, 없으면 git user.email.
# 어떤 경우에도 러너를 죽이지 않는다(항상 exit 0).
# ----------------------------------------------------------------------------
set -uo pipefail

SUBJECT="${1:-overnight 루프 알림}"
BODY="${2:-}"
TO="${MYTHOS_NOTIFY_TO:-$(git config user.email 2>/dev/null || true)}"

if [ -z "$TO" ]; then
  echo "notify: 수신자 없음 — MYTHOS_NOTIFY_TO 또는 git user.email 설정 필요(메일 생략)" >&2
  exit 0
fi

# --- 1) SMTP (앱 비밀번호) ---
if [ -n "${MYTHOS_SMTP_USER:-}" ] && [ -n "${MYTHOS_SMTP_PASS:-}" ]; then
  PY="$( [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3 )"
  MYTHOS_NOTIFY_TO="$TO" MYTHOS_NOTIFY_SUBJECT="$SUBJECT" MYTHOS_NOTIFY_BODY="$BODY" \
  "$PY" - <<'PY' && { echo "notify: SMTP 발송 완료 → $TO"; exit 0; }
import os, smtplib, ssl
from email.message import EmailMessage

host = os.environ.get("MYTHOS_SMTP_HOST", "smtp.gmail.com")
port = int(os.environ.get("MYTHOS_SMTP_PORT", "587"))
user = os.environ["MYTHOS_SMTP_USER"]
pw = os.environ["MYTHOS_SMTP_PASS"]
to = os.environ["MYTHOS_NOTIFY_TO"]

msg = EmailMessage()
msg["From"] = user
msg["To"] = to
msg["Subject"] = os.environ.get("MYTHOS_NOTIFY_SUBJECT", "overnight 알림")
msg.set_content(os.environ.get("MYTHOS_NOTIFY_BODY", ""))

ctx = ssl.create_default_context()
with smtplib.SMTP(host, port, timeout=30) as s:
    s.starttls(context=ctx)
    s.login(user, pw)
    s.send_message(msg)
PY
  echo "notify: SMTP 발송 실패 — Mail.app 폴백 시도" >&2
fi

# --- 2) macOS Mail.app (osascript) ---
if command -v osascript >/dev/null 2>&1; then
  /usr/bin/osascript - "$TO" "$SUBJECT" "$BODY" >/dev/null 2>&1 <<'APPLESCRIPT' && { echo "notify: Mail.app 발송 완료 → $TO"; exit 0; }
on run argv
  set toAddr to item 1 of argv
  set subj to item 2 of argv
  set bodyText to item 3 of argv
  tell application "Mail"
    set newMsg to make new outgoing message with properties {subject:subj, content:bodyText, visible:false}
    tell newMsg to make new to recipient with properties {address:toAddr}
    send newMsg
  end tell
end run
APPLESCRIPT
  echo "notify: Mail.app 발송 실패(계정 미설정/권한 거부 가능)" >&2
fi

echo "notify: 발송 수단 없음 — SMTP env(MYTHOS_SMTP_USER/PASS) 또는 macOS Mail.app 설정 필요" >&2
exit 0
