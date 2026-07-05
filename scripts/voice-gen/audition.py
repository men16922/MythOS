"""ElevenLabs voice audition kit for MythOS characters (G6 stage 1, plan 2026-07-05).

Generates in-character Korean sample lines for candidate voices so a human can
pick and pin one voice id per character. Reads ELEVENLAB_API_KEY from .env.

Usage:
  .venv/bin/python scripts/voice-gen/audition.py            # all roles
  .venv/bin/python scripts/voice-gen/audition.py se_rin ix  # specific roles

Output: outputs/voice-auditions/<role>/<voice-name>.mp3
The chosen mapping is pinned by hand in resources/<scenario>/audio/voice/voices.json.
"""
from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MODEL_ID = "eleven_v3"
OUT_DIR = REPO / "outputs" / "voice-auditions"

# In-character KO audition lines (story-bible register; lin_yue's is a real
# in-game line). Short on purpose — audition cost is per character.
LINES: dict[str, str] = {
    "se_rin": "일어나. 시간이 없어. 관리망이 이 구역을 지우기 전에 움직여야 해. 내 손을 잡아.",
    "kai": "나 여기 있어! 백도어 루트를 찾았어 — 수색등이 꺼지는 3초, 그게 우리 전부야. 이쪽이야!",
    "lin_yue": "관리자 IX가 이번엔 꽤나 집요하네. 쥐새끼처럼 떨고만 있을 건가, 아니면 내게 쓸모를 증명할 건가?",
    "han": "지름길이 있어. 관리망 사각지대 — 나만 아는 길이지. 따라올 거면 지금이야.",
    "su_ah": "ARK 볼트 잠금? 3초면 열어. 대신 조건이 하나 있어. 안에서 뭘 보게 되든, 나랑 반씩이야.",
    "tae_o": "관리망에 뭘 잃었는지는 묻지 마라. 싸울 이유는… 그거면 충분하니까.",
    "ix": "비식별 신호 감지. 최적화 대상으로 분류합니다. 저항은 무의미하며, 기록될 뿐입니다.",
    "narrator": "네오서울의 밤은 데이터의 비처럼 내린다. 그리고 어떤 기억은 — 지워져도, 돌아온다.",
}

# Candidate voice ids from the account library (2026-07-05 snapshot).
VOICES: dict[str, str] = {
    "Sarah": "EXAVITQu4vr4xnSDxMaL",
    "Jessica": "cgSgspJ2msm6clMCkdW9",
    "Lily": "pFZP5JQG7iQjIQuC4Bku",
    "Laura": "FGY2WhTYpPnrIDTdsKH5",
    "Alice": "Xb7hH8MSUJpSbSDYk0k2",
    "Will": "bIHbv24MWmeRgasZH58o",
    "Liam": "TX3LPaxmHKxFdv7VOQHJ",
    "Chris": "iP95p4xoKVk53GoZ742B",
    "Charlie": "IKne3meq5aSn9XLyUdCD",
    "Callum": "N2lVS1w4EtoT3dr4eOWO",
    "Bill": "pqHfZKP75CvOlQylNhV4",
    "Adam": "pNInz6obpgDQGcFmaJgB",
    "Brian": "nPczCjzI2devNBz1zQrb",
    "Daniel": "onwK4e9ZLuTAKqWW03F9",
    "River": "SAz9YHcvj6GT2YYXdXww",
    "George": "JBFqnCBsd6RMkjVDRZzb",
    "Jicheol": "CtfB5gGKt7VmWeObgBhO",
    "Sejong": "VXuKlbrqxbag8VQNsvHo",
}

# role -> candidate voice names (2-3 each; profiles from the story bible).
CANDIDATES: dict[str, list[str]] = {
    "se_rin": ["Sarah", "Jessica", "Jicheol"],  # 젊고 결단력 있는 가이드
    "kai": ["Will", "Liam", "Jicheol"],  # 재기동된 청년, 밝음+취약
    "lin_yue": ["Lily", "Laura", "Alice"],  # 야시장 브로커, 서늘/능글
    "han": ["Chris", "Charlie", "Jicheol"],  # 데이터 러너, 잽싼
    "su_ah": ["Jessica", "Laura", "Sarah"],  # 해커, 장난기+예리
    "tae_o": ["Callum", "Bill", "Adam"],  # 흉터의 베테랑, 낮고 거친
    "ix": ["Adam", "Brian", "River"],  # 관리자, 차가운 합성 권위
    "narrator": ["Sejong", "George", "Jicheol"],  # 오프닝/컷신 내레이션
}


def synthesize(api_key: str, voice_id: str, text: str, dest: Path) -> None:
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        "?output_format=mp3_44100_128"
    )
    body = {"text": text, "model_id": MODEL_ID}
    import json

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def main() -> int:
    env = (REPO / ".env").read_text(encoding="utf-8")
    match = re.search(r"^ELEVENLAB_API_KEY=(\S+)", env, re.M)
    if not match:
        print("ELEVENLAB_API_KEY not found in .env")
        return 2
    api_key = match.group(1)

    roles = sys.argv[1:] or list(CANDIDATES)
    for role in roles:
        line = LINES[role]
        out = OUT_DIR / role
        out.mkdir(parents=True, exist_ok=True)
        for name in CANDIDATES[role]:
            dest = out / f"{name}.mp3"
            if dest.exists():
                print(f"skip (exists): {dest.relative_to(REPO)}")
                continue
            try:
                synthesize(api_key, VOICES[name], line, dest)
                print(f"ok: {dest.relative_to(REPO)} ({dest.stat().st_size // 1024}KB)")
            except Exception as exc:  # noqa: BLE001 — audition tool, report and continue
                print(f"FAIL {role}/{name}: {exc}")
    print(f"\nListen under {OUT_DIR.relative_to(REPO)}/ then pin choices in "
          "resources/<scenario>/audio/voice/voices.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
