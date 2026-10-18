# 시네마틱 트레일러 Veo 영상 수동 생성 가이드 (Gemini 웹 앱 전용)

> **비용 정책 (2026-10-18 Owner 지침)**: Vertex AI Veo API 호출(`scripts/trailer/gen_veo.py`)은 클립당 과금(17클립 ₩73,916, 10월 GCP 전체 청구액의 91%)이 크므로 **전면 금지**되었습니다. `scripts/trailer/gen_veo.py` 및 `make cinematic-assets`에서 자동 Vertex Veo 호출은 차단되어 있습니다.
>
> 영상 클립 추가·교체가 필요할 때는 추가 API 과금이 없는 **Gemini 웹 앱(https://gemini.google.com)** 에서 아래 레퍼런스 이미지와 프롬프트를 그대로 붙여넣어 생성한 뒤, 다운로드한 `.mp4` 파일을 지정 경로에 넣으면 됩니다.

---

## 1. 현재 디스크 보유 현황 (추가 생성 불필요)

현재 로컬 디스크에는 8개 샷의 두 스타일(`art`, `photo`) 총 **16개 `.mp4` 클립이 모두 존재**합니다:

- **게임 원화 스타일 (`outputs/trailer/cinematic/veo/<shot>.mp4`)**: `title`, `blackout`, `se_rin`, `haetae`, `echo_eater`, `ix`, `rewrite`, `spire_dawn` (8/8 보유)
- **실사 포토리얼 스타일 (`outputs/trailer/cinematic/veo_photo/<shot>.mp4`)**: `title`, `blackout`, `se_rin`, `haetae`, `echo_eater`, `ix`, `rewrite`, `spire_dawn` (8/8 보유)

따라서 기존 클립으로 예고편을 다시 편집할 때는 영상 생성 없이 바로 아래 명령만 실행하면 됩니다:

```bash
make cinematic
```

특정 샷의 연출이 마음에 들지 않아 **새 테이크로 교체하고 싶을 때만** 아래 절차를 진행하세요.

---

## 2. Gemini 웹 앱에서 수동 생성 및 교체하는 방법

1. 브라우저에서 **[Gemini 웹 앱](https://gemini.google.com)** 에 접속한 뒤, 도구 메뉴에서 **동영상(Video / Veo)** 생성 모드를 선택합니다.
2. **참조 이미지 첨부 (`+` 버튼)**:
   - **Store / 원화 컷 (`veo`)** 교체 시: `resources/neo-seoul/v2/...` 아래의 해당 `.webp` 이미지를 첨부합니다. (Gemini 웹이 `.webp` 첨부를 거부할 경우 Finder/미리보기에서 PNG로 내보내거나 `outputs/trailer/cinematic/stills/<shot>.png`를 사용하세요.)
   - **YouTube / 실사 컷 (`veo_photo`)** 교체 시: `outputs/trailer/cinematic/stills/<shot>.png` 파일을 첨부합니다.
3. **프롬프트 복사·붙여넣기**: 아래 표에서 해당 샷의 프롬프트 블록 전체를 복사해 입력창에 붙여넣고 생성합니다.
   - 터미널에서 빠르게 확인하려면 `make cinematic-prompts`를 실행해도 동일하게 출력됩니다.
4. **MP4 다운로드 및 배치**:
   - 생성된 8초(16:9) 영상을 다운로드하여 아래 경로에 덮어씁니다:
     - 원화 스타일: `outputs/trailer/cinematic/veo/<shot>.mp4`
     - 실사 스타일: `outputs/trailer/cinematic/veo_photo/<shot>.mp4`
5. **트레일러 재편집 (무료, 로컬 ffmpeg)**:
   ```bash
   make cinematic
   ```
   완료되면 `outputs/trailer/cinematic/mythos2_cinematic_photo.mp4` (YouTube/SNS용) 및 `outputs/trailer/cinematic/mythos2_cinematic_store.mp4` (Play 스토어용)가 갱신됩니다.

---

## 3. 샷별 참조 이미지 및 복사·붙여넣기용 프롬프트 (8종)

### 공통 접미 프롬프트 안내
- **원화 스타일(`art`)** 은 각 프롬프트 끝에 아래 문장이 포함되어 있습니다:
  > `Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.`
- **실사 스타일(`photo`)** 로 뽑을 때는 첫 문장만 아래로 바꿔 붙여넣으세요:
  > `Photorealistic live-action film footage, real camera, natural motion blur; keep the exact composition, faces, costumes and lighting of the reference frame. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.`

---

### ① `title` (오프닝 옥상 — 네오서울과 하얀 첨탑)
- **원화 참조 이미지**: `resources/neo-seoul/v2/art/title.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/title.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/title.mp4` (실사: `veo_photo/title.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
Cinematic slow push-in on a lone figure in a long coat standing on the edge of a wet rooftop in a rain-soaked cyberpunk Seoul at night. Heavy rain streaks through cyan and magenta neon. Far away a white spire rises into storm clouds, a single red eye at its top slowly brightens. Small drones drift past with blinking red lights. The coat moves in the wind. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ② `blackout` (1막 — 정전된 골목과 감시 드론)
- **원화 참조 이미지**: `resources/neo-seoul/v2/art/act1.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/blackout.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/blackout.mp4` (실사: `veo_photo/blackout.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A dark blacked-out alley in a cyberpunk city at night, rain falling on puddles. Two surveillance drones overhead sweep red search beams slowly across the wet ground, the orange tarp and the parked scooters. Steam drifts. Slow lateral camera move, tense and quiet. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ③ `se_rin` (한세린 — 빗속 골목의 조우)
- **원화 참조 이미지**: `resources/neo-seoul/v2/cutscenes/se_rin_first_light.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/se_rin.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/se_rin.mp4` (실사: `veo_photo/se_rin.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A young Korean woman with long black hair in a black leather jacket stands in a rainy neon alley at night holding a paper coffee cup, steam rising from it. Police lights flash red and blue far behind her. She slowly lifts her eyes to the camera with a guarded, wry look. Gentle push-in, rain drops, shallow depth of field. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ④ `haetae` (1막 보스 — 진압기 해태)
- **원화 참조 이미지**: `resources/neo-seoul/v2/boss/a1_boss_haetae.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/haetae.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/haetae.mp4` (실사: `veo_photo/haetae.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A massive armoured suppression tank shaped like a mythical Korean haetae lion with tank treads, stone-and-steel scales and glowing golden eyes, advances slowly through a rainy neon street at night. Its red warning lights spin, treads grind, rain bounces off the armour, the eyes flare brighter. Low camera angle, slow dolly back, heavy and threatening. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ⑤ `echo_eater` (2막 보스 — 잔향 포식자)
- **원화 참조 이미지**: `resources/neo-seoul/v2/boss/a2_boss_echo_eater.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/echo_eater.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/echo_eater.mp4` (실사: `veo_photo/echo_eater.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A hooded glitch-wraith made of black shredded data and violet light floats in a flooded underground market tunnel lit by lanterns. Fragments of broken screens orbit it and flicker. Its single violet eye pulses, its clawed hands slowly open, digital glitch artefacts ripple across its body. Slow push-in, eerie. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ⑥ `ix` (3막 보스 — 관리 AI IX)
- **원화 참조 이미지**: `resources/neo-seoul/v2/boss/a3_boss_ix.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/ix.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/ix.mp4` (실사: `veo_photo/ix.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A towering white humanoid administrator AI made of porcelain-like armour plates stands in front of concentric white halo rings in a dark void. A red crystal core glows in its chest. The halo rings slowly rotate, the red core pulses like a heartbeat, faint particles of light rise. The figure stays perfectly still and calm. Slow, monumental push-in. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ⑦ `rewrite` (엔딩 — 고귀한 희생 / 균열 봉인)
- **원화 참조 이미지**: `resources/neo-seoul/v2/ending/ending_noble_sacrifice.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/rewrite.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/rewrite.mp4` (실사: `veo_photo/rewrite.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A cloaked figure presses both hands into a burning golden rupture inside a giant sphere of black cables above a night city. Streams of golden light particles pour out and flow over the skyline, sparks and embers flying, cables straining. Slow orbiting camera, triumphant and tragic. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```

### ⑧ `spire_dawn` (엔딩 — 코드 재작성 / 새벽의 첨탑)
- **원화 참조 이미지**: `resources/neo-seoul/v2/ending/ending_code_rewrite.webp`
- **실사 참조 이미지**: `outputs/trailer/cinematic/stills/spire_dawn.png`
- **저장 경로**: `outputs/trailer/cinematic/veo/spire_dawn.mp4` (실사: `veo_photo/spire_dawn.mp4`)
- **복사용 프롬프트 (원화 스타일)**:
```text
A lone figure stands on a high ledge looking at a vast white spire covered in glowing data panels under a pale moon above a cyberpunk city at night. The data panels slowly flicker and dissolve into drifting particles, the city lights twinkle below. Slow pull-back, quiet and hopeful. Keep the exact composition, characters, palette and painterly style of the reference image. Audio: ambient sound effects only (rain, distant city hum, machinery) — no music, no speech, no voices. Avoid text, letters, subtitles, watermark, logo, music, speech, extra limbs.
```
