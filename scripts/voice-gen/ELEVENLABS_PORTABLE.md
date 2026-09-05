# ElevenLabs 음성/음악 생성 가이드 (포터블)

이 문서 하나만 다른 repo에 복사하면 ElevenLabs로 **내레이션·캐릭터 대사 mp3**와 **BGM**을 만들 수 있다.
MythOS repo(`scripts/voice-gen/`, `scripts/cbt/`, `resources/*/audio/voice/`)에서 실제로 돌아간 설정만
추려낸 것이고, 본문의 스크립트는 **표준 라이브러리만 사용**하므로 `pip install` 없이 그대로 붙여넣어 쓴다.

- 원본: MythOS `scripts/voice-gen/VOICE_GUIDE.md` · `audition.py` · `generate_teaser_v2.py` ·
  `scripts/cbt/generate_teaser_bgm.py` · `resources/neo-seoul/audio/voice/voices.json`
- 실제 산출물 예: 영어 내레이션 10분할 mp3(1:49 티저), BGM 2종, 캐릭터 오디션 48개(8역 × 2언어 × 3후보)

---

## 0. 5분 시작

```bash
# 1) 키 준비 — 아래 두 이름 중 하나로 .env 또는 환경변수에 넣는다
echo 'ELEVENLABS_API_KEY=sk_...' >> .env

# 2) 아래 §7 스크립트를 tts.py로 저장

# 3) 한 줄 생성
python tts.py --voice-id JBFqnCBsd6RMkjVDRZzb --text "Neo-Seoul is falling. [pauses]" --out out/line01.mp3

# 4) 매니페스트 배치 생성
python tts.py --manifest narration.en.json --out-dir out/
```

> **함정 1 — 키 이름.** MythOS repo는 역사적으로 `ELEVENLAB_API_KEY`(S 없음)를 쓴다. 새 repo에서는
> 표준형인 `ELEVENLABS_API_KEY`를 권장하되, §7 스크립트는 **두 이름을 모두** 읽으므로 기존 `.env`를
> 그대로 가져와도 동작한다. 키는 절대 커밋하지 않는다(`.env`는 `.gitignore`).

---

## 1. API 3종 — 이게 전부다

인증은 전부 `xi-api-key` 헤더. 응답은 오디오 바이트 그대로(스트리밍 아님)라 `resp.read()`를 파일에 쓰면 끝.

### 1-1. TTS (대사·내레이션)

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
Headers: xi-api-key: <KEY> · Content-Type: application/json
Body: {"text": "...", "model_id": "eleven_v3", "voice_settings": {"stability": 0.5}}
→ 200: mp3 바이너리
```

타임아웃은 **180초** 권장(긴 문단에서 60초로는 부족했음).

### 1-2. Music (BGM)

```
POST https://api.elevenlabs.io/v1/music          ← 먼저 시도
POST https://api.elevenlabs.io/v1/music/compose  ← 실패 시 폴백
Body: {"prompt": "...", "music_length_ms": 120000}
→ 200: mp3 바이너리
```

> **함정 2 — 뮤직 엔드포인트가 계정/시점에 따라 다르다.** MythOS는 `/v1/music`과 `/v1/music/compose`
> **둘 다 순차 시도**하는 폴백을 넣어야 성공했다. 한쪽만 하드코딩하지 말 것. 타임아웃 **600초**.

### 1-3. 보이스 목록 (voice_id 찾기)

```
GET https://api.elevenlabs.io/v1/voices   → {"voices": [{"voice_id": ..., "name": ..., "labels": {...}}]}
```

공유 라이브러리에서 언어별로 골라 **계정에 추가한 뒤에야** 이 목록에 뜬다.

---

## 2. 모델 / 설정 규칙

| 항목 | 값 | 이유 |
|---|---|---|
| `model_id` | **`eleven_v3`** 고정 | 74개 언어(한국어 포함) + 오디오 태그 감정 지시 지원 |
| `output_format` | `mp3_44100_128` | 영상 편집 믹스에 충분, 용량 합리적 |
| `stability` | **0.5 (Natural)** 기본 | 보이스 자체를 공정 비교. 최종 연출 컷만 0.0(Creative) 시도 |
| `stability` 금지값 | **1.0 (Robust)** | 태그 반응이 죽어서 감정 지시가 무시된다 |
| 프롬프트 길이 | **250자 이상 권장** | 짧으면 출력이 불안정해진다(공식 best practice) |
| SSML `<break>` | **미지원** | 포즈는 `[pauses]` 태그 · 말줄임(…) · 문단 분리로 만든다 |

`stability` 0.0(Creative)은 감정 폭이 커지는 대신 **환각(어색한 발화)** 위험이 있다 — 반드시 재생성 여지를 두고 쓴다.

---

## 3. 오디오 태그 (v3 감정 지시)

대괄호 태그가 **그 지점 이후의 전달 방식**을 바꾼다.

```
[whispers] [sighs] [excited] [nervous] [sarcastic] [curious] [laughs]
[crying] [flatly] [playfully] [pauses] [urgent] [determined] [deadpan]
[mischievously] [resigned tone]
```

규칙:

- **과태깅 금지.** 감정이 실제로 바뀌는 지점에만 붙인다. 문장마다 붙이면 오히려 출력이 불안정해진다.
- **보이스 베이스라인과 태그를 맞춘다.** 속삭이는 톤 보이스에 `[shout]`는 안 먹힌다. 역할과 반대 성향인
  보이스를 태그로 교정하려 하지 말고 **보이스를 바꾼다.**
- 강조는 대문자(영어)/문장부호, 무게는 말줄임(…).
  예: `"It was a VERY long day [sighs] … nobody listens."`
- 실험 태그(`[strong korean accent]`, `[sings]` 등)는 보이스별 편차가 크다 — 채택 전 개별 테스트 필수.
- **태그는 소스 스크립트에 인라인으로 보존**(재생성 재현성). 자막·화면 텍스트에는 태그 제거본을 쓴다.

---

## 4. 캐스팅 규칙 — 언어별로 보이스를 분리한다

**핵심 원칙: 성별·연령·에너지 베이스라인이 역할과 일치하는 보이스를 고르고, 감정 변주는 태그로 만든다.**

> **함정 3 — 영어 보이스에 한국어를 시키지 말 것.** 억양이 무너진다. 한국어는 **한국어 네이티브 보이스만**
> (공유 라이브러리에서 `language=ko` 검색 → 계정에 추가), 영어는 영어 네이티브 프리메이드를 쓴다.
> 역할당 ko/en **각각 1개** voice_id를 핀으로 고정한다. "IX 같은 합성 존재"처럼 무국적 컨셉도
> 영어 보이스가 아니라 **KO 네이티브의 cold 톤**으로 푼다.

중립(neutral) 베이스라인 보이스가 언어 간 가장 안정적이다. 한국어 발음/억양은 **반드시 KO 샘플로 귀 검증.**

### 역할 프로필 표 (MythOS 캐스팅 — 다른 작품에도 그대로 유형 매핑 가능)

| 역할 유형 | 성별/연령 | 베이스라인 | 대표 감정 태그 |
|---|---|---|---|
| 주역 조력자 (se_rin) | 여/20대 | 단단함+온기, 낮은 긴박 | `[urgent] [whispers] [determined]` |
| 밝은 소년 (kai) | 남/10대말–20대초 | 밝음, 빠름, 취약 | `[excited] [nervous] [laughs]` |
| 서늘한 브로커 (lin_yue) | 여/20–30대 | 서늘, 허스키, 여유 | `[sarcastic] [mischievously] [flatly]` |
| 건들거리는 러너 (han) | 남/20대 | 잽쌈, 능글 | `[playfully] [curious]` |
| 톡톡 튀는 해커 (su_ah) | 여/10대말–20대초 | 예리, 경쾌 | `[playfully] [excited] [deadpan]` |
| 노장 방패 (tae_o) | 남/40대+ | 낮고 거침, 절제 | `[sighs] [resigned tone] [pauses]` |
| 인공 권위체 (ix) | 중성/합성 | 무감정, 권위 | `[flatly]` — **태그 최소가 오히려 섬뜩하다** |
| 내레이터 | 남 or 중성/중년 | 차분, 시네마틱 | `[pauses]` 위주, 감정 태그 절제 |

### 검증된 voice_id (2026-07 계정 스냅샷)

영어 프리메이드(공용 — 어느 계정에서나 동일 id):

| 이름 | voice_id | 이름 | voice_id |
|---|---|---|---|
| Sarah | `EXAVITQu4vr4xnSDxMaL` | Adam | `pNInz6obpgDQGcFmaJgB` |
| Jessica | `cgSgspJ2msm6clMCkdW9` | Brian | `nPczCjzI2devNBz1zQrb` |
| Lily | `pFZP5JQG7iQjIQuC4Bku` | Daniel | `onwK4e9ZLuTAKqWW03F9` |
| Laura | `FGY2WhTYpPnrIDTdsKH5` | George | `JBFqnCBsd6RMkjVDRZzb` |
| Alice | `Xb7hH8MSUJpSbSDYk0k2` | River | `SAz9YHcvj6GT2YYXdXww` |
| Will | `bIHbv24MWmeRgasZH58o` | Callum | `N2lVS1w4EtoT3dr4eOWO` |
| Liam | `TX3LPaxmHKxFdv7VOQHJ` | Bill | `pqHfZKP75CvOlQylNhV4` |
| Chris | `iP95p4xoKVk53GoZ742B` | Charlie | `IKne3meq5aSn9XLyUdCD` |

한국어 네이티브(공유 라이브러리에서 **계정에 추가해야** 쓸 수 있다):

| 이름 | voice_id | 이름 | voice_id |
|---|---|---|---|
| Yooni | `n2fbxG88jqAoaVPUy3IG` | Junsung (경상 사투리 러너 톤) | `ll1QRYG8HXKW38zKFQWa` |
| KeleeK | `5DWGv3VDkihNUcbvaonB` | Juan | `8lidWTlnwgjObqCImnE2` |
| MonoBeige | `SE9upoSoM2ipDUdAVW8q` | YongGyu | `h5eZa8VFAq0EQ8E81dfL` |
| Sanggyu | `nbUV0COSeBNcyu0Dr8z0` | JY (트렌디) | `bQlkYuipD5BHEhntA5iz` |
| Minjoon | `8cOkLISXzLWeGEsu0cZC` | Totoring | `d4fa1MBr1OVekaed8x4e` |
| KimChiNam | `gKy4twPAmGgskTXd6GER` | Ethan (40대 중저음) | `K349x43DIDecCYoQWw7U` |
| YuHaon | `B8rl62CpT9zOQ7RC3Mdl` | Dae | `HHlsD8ZpKBtIAyvlCGoz` |
| Esther | `dJlwSfdSqMaQjm3NSl3B` | Elias | `19t6kH7z0NFOs68PQy4n` |
| Jihu | `i4rvH83fgM9aBqIBZ5zH` | Junjin (cold) | `xt81Ccro1aAJisdOM64x` |
| Jaeil | `HYALOqtTLlRjxo4uBKeg` | Nara | `qWofGdsKN4woEPGCzrdX` |

> voice_id는 **계정 라이브러리 상태에 종속**이다. 위 목록으로 404가 나면 `GET /v1/voices`로 실제 id를
> 다시 확인한다. 프리메이드는 대개 그대로 동작한다.

IVC(보이스 클론)를 쓴다면 훈련 샘플에 **감정 범위를 넓게** 넣는다 — 단일 톤 클론은 태그 반응이 죽는다.

---

## 5. 워크플로우 — 오디션 → 핀 고정 → 배치 → QA

1. **오디션**: 역할별 후보 3개 × 언어별로 같은 대사를 생성 → `out/auditions/<lang>/<role>/<Voice>.mp3`
   - 오디션 대사는 **인캐릭터 + 태그 포함 + 250자 이상**으로 쓴다. 짧은 샘플로는 판단이 안 된다.
   - 비교 공정성을 위해 오디션은 전부 `stability=0.5` 고정.
2. **핀 고정**: 사람이 듣고 `voices.json`의 `voice_id`를 채운다(역할당 언어별 1개).
3. **배치 생성**: `voices.json` + 대사 매니페스트 → 정적 mp3 자산.
4. **QA**: 사람 귀 검수 후 커밋. 음성은 생성물이지만 **채택본은 git 추적**한다(아이콘 아트와 동일 정책).
   기계 검증은 `ffprobe`로 길이/코덱만 확인 — 품질 판정은 사람이 한다.

```bash
ffprobe -v error -show_entries format=duration,bit_rate -of default=nw=1 out/01_line.mp3
```

### 파일 네이밍

```
<scenario>/audio/voice/<lang>/<beat_id>__<role>.mp3
```

`beat_id`는 대사 스크립트/디렉티브의 **stable id**와 일치시킨다(콘텐츠와 1:1). 그래야 대사를 고칠 때
어느 mp3를 재생성해야 하는지 자동으로 결정된다.

### 범위 규칙

루프/씬 전체를 음성화하지 말고 **키 비트 한정**(오프닝 컷·컷신·엔딩·보스 텔레그래프)으로 시작한다.
전체 서사 음성화는 동적 TTS 단계에서 별도 결정.

---

## 6. 데이터 파일 스키마 2종

### 6-1. `voices.json` — 역할×언어 보이스 핀

```json
{
  "_doc": "Per-character, per-language ElevenLabs voice pinning. model: eleven_v3. KO uses Korean-native voices, EN uses English premades. Fill each voice_id after listening to the auditions.",
  "model_id": "eleven_v3",
  "roles": {
    "se_rin": {
      "ko": { "voice_id": null, "candidates": { "Yooni": "n2fbxG88jqAoaVPUy3IG", "KeleeK": "5DWGv3VDkihNUcbvaonB", "MonoBeige": "SE9upoSoM2ipDUdAVW8q" } },
      "en": { "voice_id": null, "candidates": { "Sarah": "EXAVITQu4vr4xnSDxMaL", "Jessica": "cgSgspJ2msm6clMCkdW9", "Lily": "pFZP5JQG7iQjIQuC4Bku" } }
    },
    "narrator": {
      "ko": { "voice_id": null, "candidates": { "Jihu": "i4rvH83fgM9aBqIBZ5zH", "Jaeil": "HYALOqtTLlRjxo4uBKeg", "Nara": "qWofGdsKN4woEPGCzrdX" } },
      "en": { "voice_id": "JBFqnCBsd6RMkjVDRZzb", "candidates": { "George": "JBFqnCBsd6RMkjVDRZzb", "Daniel": "onwK4e9ZLuTAKqWW03F9", "Brian": "nPczCjzI2devNBz1zQrb" } }
    }
  }
}
```

`candidates`를 남겨두는 이유: 채택본이 마음에 안 들 때 **다시 오디션을 짜지 않고** 바로 갈아끼우기 위해서.

### 6-2. 내레이션 매니페스트 — 타임라인 + 원문을 한 파일에

세그먼트를 쪼개 두면 **한 줄만 고쳐서 그 mp3만 재생성**할 수 있고, 영상 편집 타임라인과 1:1로 붙는다.
`voice_id`를 매니페스트에 박아두되 CLI로 오버라이드 가능하게 하면, 나레이터 교체 시 전체가 결정적으로 재생성된다.

```json
{
  "project": "Project MythOS CBT Teaser V2",
  "language": "en",
  "model_id": "eleven_v3",
  "voice": { "name": "V3 narrator", "voice_id": "n1PvBOwxb8X6m7tahp2h", "status": "user-selected; regenerated 2026-07-12" },
  "segments": [
    { "order": 1, "start": "00:00", "end": "00:08", "file": "01_neo_seoul_is_falling.mp3",
      "text": "Neo-Seoul is falling. And somewhere beneath its rain, you wake up with no name. [pauses]" },
    { "order": 2, "start": "00:08", "end": "00:18", "file": "02_every_street_has_a_price.mp3",
      "text": "Every street has a price. Every signal has a history." }
  ]
}
```

---

## 7. 복사해서 쓰는 스크립트 (`tts.py` · 표준 라이브러리 전용)

```python
"""Portable ElevenLabs TTS. stdlib only.

  python tts.py --voice-id <id> --text "..." --out out/line.mp3
  python tts.py --manifest narration.en.json --out-dir out/
  python tts.py --manifest narration.en.json --out-dir out/ --voice-id <other> --force
  python tts.py --music "cinematic synthwave ..." --out out/bgm.mp3 --length-ms 120000
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

MODEL_ID = "eleven_v3"
STABILITY = 0.5  # Natural. Creative(0.0) only for final takes; Robust(1.0) kills tag response.
TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128"
MUSIC_URLS = ("https://api.elevenlabs.io/v1/music", "https://api.elevenlabs.io/v1/music/compose")


def api_key() -> str:
    """Env first, then .env. Accepts both spellings (this repo historically drops the S)."""
    for name in ("ELEVENLABS_API_KEY", "ELEVENLAB_API_KEY"):
        if os.environ.get(name):
            return os.environ[name]
    dotenv = Path(".env")
    if dotenv.exists():
        for line in dotenv.read_text(encoding="utf-8").splitlines():
            for name in ("ELEVENLABS_API_KEY=", "ELEVENLAB_API_KEY="):
                if line.startswith(name):
                    return line.partition("=")[2].strip().strip("\"'")
    raise SystemExit("ELEVENLABS_API_KEY not found (env or .env)")


def _post(url: str, key: str, body: dict, timeout: int) -> bytes:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def speak(key: str, voice_id: str, text: str, dest: Path, model_id: str = MODEL_ID) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    audio = _post(
        TTS_URL.format(vid=voice_id),
        key,
        {"text": text, "model_id": model_id, "voice_settings": {"stability": STABILITY}},
        timeout=180,
    )
    dest.write_bytes(audio)
    print(f"ok: {dest} ({len(audio) // 1024}KB)")


def compose(key: str, prompt: str, dest: Path, length_ms: int) -> int:
    """The music endpoint shape varies by account/date — try both before failing."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    body = {"prompt": prompt, "music_length_ms": length_ms}
    last = ""
    for url in MUSIC_URLS:
        try:
            audio = _post(url, key, body, timeout=600)
            dest.write_bytes(audio)
            print(f"ok: {dest} ({len(audio) / 1e6:.1f} MB)")
            return 0
        except Exception as exc:  # noqa: BLE001 — report and try the alternate shape
            detail = ""
            if hasattr(exc, "read"):
                try:
                    detail = exc.read().decode()[:300]  # type: ignore[attr-defined]
                except Exception:
                    pass
            last = f"{url}: {exc} {detail}"
            print(f"  failed: {last}", file=sys.stderr)
    print(f"music generation failed; last error: {last}", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text")
    parser.add_argument("--manifest")
    parser.add_argument("--music")
    parser.add_argument("--voice-id", help="overrides the manifest voice")
    parser.add_argument("--out", type=Path, default=Path("out/output.mp3"))
    parser.add_argument("--out-dir", type=Path, default=Path("out"))
    parser.add_argument("--length-ms", type=int, default=120000)
    parser.add_argument("--force", action="store_true", help="regenerate existing files")
    args = parser.parse_args()
    if not (args.music or args.manifest or (args.text and args.voice_id)):
        parser.error("need --text + --voice-id, or --manifest, or --music")
    key = api_key()

    if args.music:
        return compose(key, args.music, args.out, args.length_ms)

    if args.manifest:
        manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        voice_id = args.voice_id or manifest["voice"]["voice_id"]
        model_id = manifest.get("model_id", MODEL_ID)
        for segment in manifest["segments"]:
            dest = args.out_dir / segment["file"]
            if dest.exists() and not args.force:
                print(f"skip: {dest}")
                continue
            speak(key, voice_id, segment["text"], dest, model_id)
        return 0

    speak(key, args.voice_id, args.text, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

### 오디션 루프 (역할×언어×후보 일괄)

위 `speak()`를 그대로 재사용한다. 핵심은 **이미 있으면 건너뛰기**(재실행 비용 방지)와
**실패해도 계속 진행**(한 보이스 404가 전체를 죽이지 않게).

```python
LINES = {"se_rin": {"ko": "[urgent] 일어나. 시간이 없어. …(250자 이상)", "en": "[urgent] Wake up. There's no time. …"}}
CANDIDATES = {"ko": {"se_rin": ["Yooni", "KeleeK", "MonoBeige"]},
              "en": {"se_rin": ["Sarah", "Jessica", "Lily"]}}
VOICES = {"Yooni": "n2fbxG88jqAoaVPUy3IG", "Sarah": "EXAVITQu4vr4xnSDxMaL"}  # §4 표에서 채운다

key = api_key()
for lang in ("ko", "en"):
    for role, line in ((r, LINES[r][lang]) for r in LINES):
        for name in CANDIDATES[lang][role]:
            dest = Path("out/auditions") / lang / role / f"{name}.mp3"
            if dest.exists():
                print(f"skip (exists): {dest}")
                continue
            try:
                speak(key, VOICES[name], line, dest)
            except Exception as exc:  # noqa: BLE001 — audition tool: report and continue
                print(f"FAIL {lang}/{role}/{name}: {exc}")
```

---

## 8. BGM 프롬프트 작성법 (검증된 예시)

**구조를 초 단위로 지시**하는 게 핵심이다. 분위기 형용사만 나열하면 통제가 안 된다.
아래는 2분 게임 티저용으로 실제 채택된 프롬프트.

```text
Cinematic mainstream synthwave / melodic electronic trailer track, instrumental only.
Rainy neon cyberpunk Seoul at night: warm analog synth pads, a simple memorable lead melody,
soft side-chained bass, subtle vinyl rain texture. Structure for a 2-minute game teaser:
0-15s atmospheric intro with a lonely piano-like motif over rain; 15-50s the motif grows
hopeful with pulsing synths and light percussion; 50-85s tension rises into a driving tactical
beat with punchy drums and arpeggios; 85-105s emotional lift, wide and heroic but restrained;
final 15s clean resolving outro that decays to a single echoing note.
Accessible, catchy, modern; no vocals, no harsh dissonance, no aggressive dubstep.
```

체크리스트: ① 장르+"instrumental only" ② 악기/텍스처 구체화 ③ **구간별 타임라인** ④ 금지 목록(no vocals…).
내레이션 아래 깔 트랙이면 **instrumental only를 반드시 명시**한다.

---

## 9. 함정 모음 (겪은 것만)

1. **키 이름 `ELEVENLAB_API_KEY`** — S가 빠진 철자를 쓰는 기존 repo가 있다. 양쪽 다 읽게 만든다.
2. **뮤직 엔드포인트 2종** — `/v1/music`과 `/v1/music/compose` 폴백 필수.
3. **영어 보이스로 한국어 금지** — 억양이 무너진다. 언어별 네이티브 보이스를 따로 핀.
4. **`stability: 1.0` 금지** — 태그가 무시된다.
5. **250자 미만 프롬프트 불안정** — 짧은 대사는 앞뒤 문맥을 붙여 길이를 확보하거나 결과를 여러 번 뽑는다.
6. **SSML `<break>` 미지원** — `[pauses]`/…/문단으로 대체.
7. **태그가 자막에 새어나감** — 소스에는 태그 인라인 보존, 자막용은 태그 제거본을 따로 만든다.
8. **voice_id는 계정 종속** — 공유 라이브러리 보이스는 계정에 추가해야 404가 안 난다.
9. **타임아웃** — TTS 180초, 뮤직 600초. 기본값(짧은 값)으로는 긴 요청이 끊긴다.
10. **재실행 비용** — 존재하는 파일은 건너뛰고 `--force`로만 재생성. 크레딧이 실제로 나간다.
11. **화면 캡처엔 오디오가 없다** — Playwright/CDP 캡처는 무음이 정상. 오디오는 최종 믹스 단계에서만 합친다.
12. **채택본은 git 추적** — 생성물이지만 재생성이 비결정적이므로, 최종 채택 mp3는 커밋한다.

---

## 참고 소스

- Best practices: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- v3 Audio Tags: https://elevenlabs.io/blog/eleven-v3-audio-tags-expressing-emotional-context-in-speech
- Audio tags FAQ: https://help.elevenlabs.io/hc/en-us/articles/35869142561297
