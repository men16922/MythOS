"""ElevenLabs voice audition kit for MythOS characters (G6 stage 1).

Rules follow scripts/voice-gen/VOICE_GUIDE.md: eleven_v3, KO/EN with the SAME
voice per role, v3 audio tags for emotional direction, lines ≥250 chars
(shorter prompts are unstable per the official best practices), stability
Natural(0.5) so voices compare fairly.

Usage:
  .venv/bin/python scripts/voice-gen/audition.py                 # all roles, both langs
  .venv/bin/python scripts/voice-gen/audition.py se_rin ix       # specific roles
  AUDITION_LANGS=ko .venv/bin/python scripts/voice-gen/audition.py

Output: outputs/voice-auditions/<lang>/<role>/<voice-name>.mp3
Pin choices in resources/<scenario>/audio/voice/voices.json.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MODEL_ID = "eleven_v3"
STABILITY = 0.5  # Natural — fair voice comparison; Creative(0.0) only for final takes
OUT_DIR = REPO / "outputs" / "voice-auditions"

# In-character audition lines WITH v3 audio tags (emotion shifts only — no
# over-tagging). KO is the source register; EN is an authored translation.
LINES: dict[str, dict[str, str]] = {
    "se_rin": {
        "ko": "[urgent] 일어나. 시간이 없어. 관리망이 이 구역을 지우기 전에 움직여야 해. [whispers] 수색등이 지나갈 때까지 숨을 죽여. 셋, 둘… 지금이야. [determined] 내 손을 잡아 — 이번 루프에서는, 반드시 너를 데리고 나간다. 무슨 일이 있어도.",
        "en": "[urgent] Wake up. There's no time. We have to move before the Grid erases this sector. [whispers] Hold your breath until the searchlight passes. Three, two… now. [determined] Take my hand — this loop, I am getting you out. No matter what it costs.",
    },
    "kai": {
        "ko": "[excited] 찾았어! 백도어 루트 — 수색등이 꺼지는 딱 3초, 그게 우리한테 주어진 전부야! [nervous] 아니 잠깐, 잠깐만. 저 드론… 아까도 저기 있었나? [laughs] 에이, 뭐 어때. 형이 먼저 뛰면 나도 뛰는 거지. 이쪽이야, 빨리!",
        "en": "[excited] Found it! The backdoor route — we get exactly three seconds when the searchlight cycles, that's all we need! [nervous] Wait. Wait, hold on. That drone… was it there before? [laughs] Ah, whatever. You jump first, I jump. This way, hurry!",
    },
    "lin_yue": {
        "ko": "[sarcastic] 관리자 IX가 이번엔 꽤나 집요하네. 내 구역까지 사냥개를 풀다니. [flatly] 비식별 신호, 거기 숨어 있는 거 다 알아. [mischievously] 자, 선택해. 쥐새끼처럼 떨고만 있을 건가, 아니면… 내게 쓸모를 증명할 건가? 야시장의 거래는 언제나 공평하니까.",
        "en": "[sarcastic] Administrator IX is persistent this time. Loosing hounds in my territory, of all places. [flatly] Unregistered signal — I know you're hiding there. [mischievously] So choose. Keep trembling like a rat, or… prove your worth to me? The Night Market always deals fair.",
    },
    "han": {
        "ko": "[playfully] 지름길이 있어. 관리망 사각지대 — 나만 아는 길이지. 데이터 러너가 밥값을 어떻게 하는지 보여줄게. [curious] 근데 너, 그 손목의 표식… 비접속자였어? [pauses] 재밌네. 따라올 거면 지금이야. 두 번은 안 물어봐.",
        "en": "[playfully] There's a shortcut. A blind spot in the Grid — a route only I know. Let me show you how a data runner earns his keep. [curious] Wait, that mark on your wrist… you're a Ghost? [pauses] Interesting. If you're coming, it's now. I don't ask twice.",
    },
    "su_ah": {
        "ko": "[playfully] ARK 볼트 잠금? 3초면 열어. 농담 아니고 진짜 3초. [excited] 대신 조건이 하나 있어 — 안에서 뭘 보게 되든, 나랑 반씩이야. [deadpan] 아, 그리고 경보 울리면… 그건 네 탓인 걸로 하자. 준비됐지?",
        "en": "[playfully] The ARK vault lock? Give me three seconds. Not a joke — three, actual, seconds. [excited] One condition though — whatever we find inside, we split it half and half. [deadpan] Oh, and if the alarm goes off… we're agreeing that's on you. Ready?",
    },
    "tae_o": {
        "ko": "[pauses] 관리망에 뭘 잃었는지는… 묻지 마라. [sighs] 오래된 이야기고, 좋게 끝나는 판본은 없으니까. [resigned tone] 싸울 이유는 그거면 충분해. 방패는 내가 든다. 너는 그저… 살아서 다음 루프를 봐라. 그거면 된 거다.",
        "en": "[pauses] What I lost to the Grid… don't ask. [sighs] It's an old story, and no version of it ends well. [resigned tone] That reason is enough to fight. I'll carry the shield. You just… live to see the next loop. That will be enough.",
    },
    "ix": {
        "ko": "[flatly] 비식별 신호 감지. 최적화 대상으로 분류합니다. 저항은 무의미하며, 기록될 뿐입니다. [pauses] …흥미롭군요. 당신은 이 대화를 이미 아홉 번 반복했습니다. 그런데도 매번, 같은 선택을 하는군요. 인간의 결함입니까, 아니면… 의지입니까.",
        "en": "[flatly] Unregistered signal detected. Classifying for optimization. Resistance is meaningless; it will merely be recorded. [pauses] …Curious. You have repeated this conversation nine times. And yet each time, you make the same choice. Is that a human defect, or… will.",
    },
    "narrator": {
        "ko": "네오서울의 밤은 데이터의 비처럼 내린다. 네온 아래 잠든 도시, 그 밑을 흐르는 것은 지워진 이름들의 강. [pauses] 그리고 어떤 기억은 — 지워져도, 돌아온다. … 접속이 시작된다. 이번 루프가, 마지막이 될지도 모른다.",
        "en": "Night falls on Neo-Seoul like a rain of data. Beneath the neon-lit sleep of the city runs a river of erased names. [pauses] And some memories — even erased — find their way back. … The connection begins. This loop may be the last.",
    },
}

# Candidate voice ids in the account library (2026-07-05 snapshot).
# KO-* voices are Korean natives added from the shared library (role-cast by
# gender/age/baseline per VOICE_GUIDE.md §3); the rest are English premades.
VOICES: dict[str, str] = {
    # English premades
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
    # Korean natives (shared-library adds, KO- prefix in the account)
    "Yooni": "n2fbxG88jqAoaVPUy3IG",
    "KeleeK": "5DWGv3VDkihNUcbvaonB",
    "MonoBeige": "SE9upoSoM2ipDUdAVW8q",
    "Sanggyu": "nbUV0COSeBNcyu0Dr8z0",
    "Minjoon": "8cOkLISXzLWeGEsu0cZC",
    "KimChiNam": "gKy4twPAmGgskTXd6GER",
    "YuHaon": "B8rl62CpT9zOQ7RC3Mdl",
    "Esther": "dJlwSfdSqMaQjm3NSl3B",
    "Junsung": "ll1QRYG8HXKW38zKFQWa",
    "Juan": "8lidWTlnwgjObqCImnE2",
    "YongGyu": "h5eZa8VFAq0EQ8E81dfL",
    "JY": "bQlkYuipD5BHEhntA5iz",
    "Totoring": "d4fa1MBr1OVekaed8x4e",
    "Ethan": "K349x43DIDecCYoQWw7U",
    "Dae": "HHlsD8ZpKBtIAyvlCGoz",
    "Elias": "19t6kH7z0NFOs68PQy4n",
    "Junjin": "xt81Ccro1aAJisdOM64x",
    "Jihu": "i4rvH83fgM9aBqIBZ5zH",
    "Jaeil": "HYALOqtTLlRjxo4uBKeg",
    "Nara": "qWofGdsKN4woEPGCzrdX",
}

# lang -> role -> candidates. KO auditions use Korean natives ONLY; EN uses
# English premades (native-EN localization casting).
CANDIDATES: dict[str, dict[str, list[str]]] = {
    "ko": {
        "se_rin": ["Yooni", "KeleeK", "MonoBeige"],
        "kai": ["Sanggyu", "Minjoon", "KimChiNam"],
        "lin_yue": ["MonoBeige", "YuHaon", "Esther"],
        "han": ["Junsung", "Juan", "YongGyu"],
        "su_ah": ["JY", "Totoring", "Yooni"],
        "tae_o": ["Ethan", "Dae", "Elias"],
        "ix": ["Junjin", "Elias", "Dae"],
        "narrator": ["Jihu", "Jaeil", "Nara"],
    },
    "en": {
        "se_rin": ["Sarah", "Jessica", "Lily"],
        "kai": ["Will", "Liam", "Charlie"],
        "lin_yue": ["Lily", "Laura", "Alice"],
        "han": ["Chris", "Charlie", "Liam"],
        "su_ah": ["Jessica", "Laura", "Sarah"],
        "tae_o": ["Callum", "Bill", "Adam"],
        "ix": ["Adam", "Brian", "River"],
        "narrator": ["George", "Daniel", "Brian"],
    },
}


def synthesize(api_key: str, voice_id: str, text: str, dest: Path) -> None:
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        "?output_format=mp3_44100_128"
    )
    body = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {"stability": STABILITY},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        dest.write_bytes(resp.read())


def main() -> int:
    env = (REPO / ".env").read_text(encoding="utf-8")
    match = re.search(r"^ELEVENLAB_API_KEY=(\S+)", env, re.M)
    if not match:
        print("ELEVENLAB_API_KEY not found in .env")
        return 2
    api_key = match.group(1)

    langs = [x for x in os.getenv("AUDITION_LANGS", "ko,en").split(",") if x]
    roles = sys.argv[1:] or list(LINES)
    for lang in langs:
        for role in roles:
            line = LINES[role][lang]
            out = OUT_DIR / lang / role
            out.mkdir(parents=True, exist_ok=True)
            for name in CANDIDATES[lang][role]:
                dest = out / f"{name}.mp3"
                if dest.exists():
                    print(f"skip (exists): {dest.relative_to(REPO)}")
                    continue
                try:
                    synthesize(api_key, VOICES[name], line, dest)
                    print(f"ok: {dest.relative_to(REPO)} ({dest.stat().st_size // 1024}KB)")
                except Exception as exc:  # noqa: BLE001 — audition tool, report and continue
                    print(f"FAIL {lang}/{role}/{name}: {exc}")
    print(f"\nListen under {OUT_DIR.relative_to(REPO)}/<lang>/ then pin choices in "
          "resources/<scenario>/audio/voice/voices.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
