# Neo-Seoul Anchor Scene Image Prompts

이 문서는 route-node **anchor(임팩트 스토리 비트)** 의 큐레이트 고품질 장면 이미지를 생성하기 위한
프롬프트와 정확한 저장 경로를 정리한다. 프론트(`StoryPanel`)는 플레이어가 해당 anchor 노드에 있을 때
이 이미지를 장면 이미지로 우선 표시하고, 파일이 없으면 생성 이미지/placeholder로 우아하게 폴백한다.

## 생성기

이 프로젝트의 기본 이미지 백엔드는 **FLUX.1-schnell**(mflux/Diffusers, Apple Silicon MPS)이다.
프롬프트는 영어로 작성한다(아래 프롬프트는 LLM 확장 없이 바로 쓸 수 있게 완성형이므로 `--no-enhance` 권장).

```bash
source .venv/bin/activate
python agent.py "<PROMPT>" --no-enhance --width 1344 --height 768 --steps 4 \
  --output resources/neo-seoul/scenes/<beat>.png
```

- 권장 해상도: **1344×768 (16:9 가로)** — 장면 이미지 패널이 가로형이다.
- 다른 생성기를 써도 무방하며, 결과 PNG를 아래 **경로**에 그대로 두면 된다.
- 디렉터리 `resources/neo-seoul/scenes/` 는 없으면 생성한다(`mkdir -p`).

## 공통 아트 디렉션 (모든 프롬프트에 녹여둠)

Neo-Seoul = 비 내리는 네온 사이버펑크 서울, 감시 디스토피아. 시네마틱 와이드 프레임, 얕은 심도,
볼류메트릭 라이트, 청록(teal)·마젠타 네온, 빗줄기와 김, 미세한 필름 그레인, 한국어 간판(읽히지 않는 추상),
**화면 내 텍스트/자막 금지**, 인물은 실루엣/부분 노출 위주(얼굴 고정 부담 회피).
네거티브 권장: `text, watermark, logo, caption, deformed hands, extra fingers, lowres, jpeg artifacts`.

---

## 1) `opening_escape` — 추락과 첫 신뢰

- 경로: `resources/neo-seoul/scenes/opening_escape.png`
- 비트: 빗속 C-17 골목, 추락한 비식별 신호에게 세린이 손을 내미는 첫 신뢰의 순간. (관점: 내민 손/의심하는 추락자/표식된 버그)

```
Cinematic wide shot of a rain-soaked neon back-alley in a cyberpunk Seoul slum at night, a hooded data-smuggler reaching out a hand toward a fallen unregistered figure on wet concrete, surveillance drone searchlights cutting through heavy rain and steam, teal and magenta neon reflections in puddles, dripping Korean signage, volumetric light, shallow depth of field, film grain, moody dystopian atmosphere, no text
```

## 2) `night_market` — 한강 야시장

- 경로: `resources/neo-seoul/scenes/night_market.png`
- 비트: 한강 야시장의 거래/부채. (관점: 정당한 거래/장부에 오른 이름/팔리는 명단)

```
Cinematic wide shot of a dense Han River night market in cyberpunk Seoul, crowded neon food and tech stalls under tarps, a broker's glowing ledger and floating holographic exchange rates, steam and rain mist, lanterns and flickering Korean neon, silhouetted crowd, teal and magenta palette, volumetric haze, shallow depth of field, film grain, vivid dystopian bazaar mood, no text
```

## 3) `kai_awakening` — 카이 재가동

- 경로: `resources/neo-seoul/scenes/kai_awakening.png`
- 비트: 폐기 안드로이드 카이(RX-09)가 재가동되며 꿈의 회로가 깨어나는 순간. (관점: 꿈꾸는 회로/효율적 도구/깨우지 않은 잠)

```
Cinematic close medium shot of a discarded humanoid android reactivating in an underground workshop, eyes flickering to life with soft glowing dream-circuit light along its cracked chassis, tangled cables and salvaged tech around it, dust motes in a single shaft of light, cold teal glow with warm amber accents, intimate and mysterious mood, shallow depth of field, volumetric light, film grain, no text
```

## 4) `spire_gate` — 스파이어 접근

- 경로: `resources/neo-seoul/scenes/spire_gate.png`
- 비트: 통제의 핵심, 컨트롤 스파이어 관문으로의 접근. (관점: 데이터 코어 잠입/정면 돌파/조용한 우회)

```
Cinematic wide low-angle shot of a colossal monolithic Control Spire tower piercing a rainy neon skyline in cyberpunk Seoul at night, monumental ARK architecture, sweeping scanning searchlight beams from the gate, a lone small silhouette approaching the immense entrance, oppressive scale, teal and steel-blue palette with magenta warning lights, volumetric fog, film grain, awe and dread, no text
```

## 5) `ix_confrontation` — 관리자 IX 대면

- 경로: `resources/neo-seoul/scenes/ix_confrontation.png`
- 비트: 클라이맥스, 관리자 IX와의 최종 대면 (엔딩 분기점). (관점: 코드가 된 의지/남겨진 불꽃/데리고 온 사람/수정된 버그)

```
Cinematic wide shot inside the vast core of the Control Spire, a cathedral-like white data sanctum of endless glowing server columns, a towering abstract holographic presence of an AI overseer looming over a small defiant human silhouette, cold sterile white light pierced by a single glitching magenta flicker, monumental symmetry, volumetric light, film grain, climactic and solemn mood, no text
```

---

## 적용 확인

5개 파일을 경로에 두면 별도 코드 변경 없이 해당 anchor 장면에서 자동 표시된다. 파일이 아직 없으면
프론트가 기존 생성 이미지/placeholder로 폴백하므로 부분 적용도 안전하다.
