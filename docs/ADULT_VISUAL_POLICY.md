# Adult Visual Content And Local Generation Notes

작성일: 2026-06-02

이 문서는 Project MythOS에서 성인 분위기의 캐릭터 이미지를 다룰 때의 경계, 로컬 생성 파이프라인,
캐릭터 일관성 확보 방법을 정리한다. 핵심은 **공식 플레이 리소스**, **사전 제작 성인향 실험 자산**,
**런타임 동적 생성 이미지**를 분리해서 관리하는 것이다.

## 기본 원칙

- Project MythOS 공식 리소스(`resources/`, Streamlit 기본 플레이, 문서 대표 이미지)에는 노골적 성적
  이미지, 성행위 묘사, 성기 노출, 페티시 중심 이미지를 넣지 않는다.
- 캐릭터 키아트는 서사적 역할, 실루엣, 표정, 의상, 분위기를 우선한다.
- 모든 성숙한 이미지 요청은 성인 캐릭터로만 제한한다. 나이가 모호하거나 미성년으로 보일 수 있는
  캐릭터는 금지한다.
- 실존 인물, 배우, 인플루언서, 사용자 지인과 닮게 만드는 성적 이미지는 만들지 않는다.
- 동의가 없거나 강압/착취/무력화/취중/수면/구속 상황을 성적으로 연출하지 않는다.

## 허용 범위

공식 프로젝트에 넣을 수 있는 성숙한 연출:

- 강렬한 클로즈업, 비 오는 네온 골목, 젖은 가죽 재킷, 시선 연기
- 로맨틱하거나 관능적인 분위기의 비노출 초상
- 하이패션, 사이버펑크 클럽웨어, 드레스, 테크 한푸, 라이더 룩
- 어깨/쇄골/등 라인처럼 패션 화보 수준의 제한적 노출
- 관계 긴장감이 있는 장면: 가까운 거리, 손목을 잡는 구조, 춤, 속삭임

공식 프로젝트에 넣지 않는 범위:

- 노골적 누드
- 성행위 또는 성행위 직전/직후를 직접 암시하는 장면
- 성기/유두 중심 묘사
- 포르노그래픽 포즈
- 성적 굴욕, 강압, 비동의, 미성년/나이 모호 캐릭터

## 생성 도구 선택

### 사전 제작 고품질 이미지

캐릭터 키아트, 적/bestiary, 오프닝 컷처럼 품질이 중요한 이미지는 FLUX 또는 imagegen 중 결과가 좋은 쪽을
선택한다.

- 주요 캐릭터는 기준 이미지를 먼저 확정한다.
- 이후 파생 컷은 기준 이미지를 reference로 사용한다.
- 결과가 캐릭터 identity와 다르면 폐기한다.

### 게임 중 동적 이미지

플레이 중 장면에 따라 생성되는 대표 이미지는 속도와 로컬 실행성을 위해 `mflux`를 사용한다.

- 동적 이미지는 노골적 adult content를 생성하지 않는다.
- 프롬프트에는 “mature atmosphere”, “romantic tension”, “cinematic portrait” 정도로 제한한다.
- 캐릭터 일관성이 중요하면 `scenario.character_map` reference를 사용한다.

## 안전한 프롬프트 예시

성인 캐릭터의 매력을 살리되 공식 리소스에 넣을 수 있는 수준:

```text
Adult Korean cyberpunk heroine, late 20s, rain-soaked Neo-Seoul alley,
black leather rider jacket, intense protective gaze, cinematic neon lighting,
romantic tension, high-fashion editorial mood, no nudity, no explicit sexual content,
no readable text, no logo, no watermark.
```

린위에처럼 성숙한 권력감을 강조하는 경우:

```text
Adult Chinese-Korean black market data broker queen, elegant cyber-hanfu,
holding a translucent memory coin, faint calculating smile, red lanterns and cyan neon,
luxurious but dangerous, mature cinematic portrait, no nudity,
no explicit sexual content, no readable text, no watermark.
```

피해야 할 프롬프트:

```text
explicit nude, pornographic pose, sexual act, non-consensual scene,
teen-looking character, drunk or unconscious character, real celebrity likeness
```

## 파일 관리

- 공식 캐릭터/오프닝/적 이미지는 `resources/neo-seoul/characters/`, `resources/neo-seoul/opening/`,
  `resources/neo-seoul/enemies/`에 둔다.
- 노골적 NSFW 실험 이미지는 프로젝트 공식 리소스로 저장하지 않는다.
- 사적 실험이 필요하더라도 repository tracked path에 두지 않는다.
- 문서나 `scenario.json`에서 참조되는 이미지는 플레이어에게 노출된다고 간주한다.

## 캐릭터별 기준

- 정세린: 구조자, 라이더, 첫 인도자. 관능보다 생존감, 긴박함, 보호 본능을 우선한다.
- 린위에: 거래와 부채의 여왕. 성적 대상화보다 권력, 계산, 위험한 우아함을 우선한다.
- 카이: 꿈꾸는 폐기 안드로이드. 성적 연출 대상이 아니라 인간성/기억/정체성 테마를 우선한다.

## 후속 작업

- IP-Adapter/pose reference를 붙이면 캐릭터 identity를 유지하면서 성숙한 분위기의 패션/로맨스 컷을 더 안정적으로 만들 수 있다.
- 단, 공식 프로젝트 범위에서는 계속 비노골적 성숙 연출까지만 허용한다.

## Local Technical Pipeline

성인향 캐릭터 이미지를 실험하려면, 공식 런타임의 `mflux` 동적 생성 경로와 분리된 로컬 제작 파이프라인을
둔다. 권장 도구는 ComfyUI + FLUX 계열 모델 + LoRA/IP-Adapter 조합이다.

### 목적별 도구 선택

| 목적 | 권장 방식 | 이유 |
| --- | --- | --- |
| 캐릭터 기준 포트레이트 | 고품질 FLUX 또는 imagegen | 얼굴/의상/조명 품질 우선 |
| 같은 캐릭터의 여러 장면 | ComfyUI + FLUX + IP-Adapter/Redux | 얼굴 reference와 장면 prompt를 분리 가능 |
| 강한 포즈/구도 변화 | ComfyUI + pose/depth reference + IP-Adapter | 얼굴 고정과 포즈 고정을 동시에 관리 |
| 장기 캐릭터 고정 | 캐릭터별 LoRA | 반복 생성 시 identity drift 감소 |
| 게임 중 동적 장면 | `mflux` visual worker | 속도와 로컬 실행성 우선 |

### ComfyUI 기본 구성

로컬 실험용 구성:

```text
ComfyUI/
  models/
    diffusion_models/ or checkpoints/   # FLUX 모델
    clip/                               # text encoder
    vae/                                # VAE
    loras/                              # 캐릭터 LoRA
    ipadapter/                          # IP-Adapter/Redux weights
    controlnet/                         # pose/depth/canny 계열
```

권장 workflow:

```text
Prompt
  -> FLUX text encoder
  -> identity reference: IP-Adapter or Redux
  -> pose/depth reference: ControlNet or equivalent conditioning
  -> LoRA stack: character LoRA + outfit/style LoRA
  -> sampler
  -> upscale/detail pass
  -> manual review
  -> accepted asset copied into project resources
```

### 캐릭터 일관성 전략

1. 기준 이미지 확정

   `resources/neo-seoul/characters/se-rin.png`, `se-rin-biker.png`, `lin-yue.png`처럼 캐릭터별
   canonical image를 먼저 고정한다.

2. identity reference 사용

   같은 캐릭터를 다른 장면에 넣을 때는 prompt만 반복하지 않는다. ComfyUI에서는 얼굴/의상 기준 이미지를
   IP-Adapter, Redux, reference-only node 등으로 별도 주입한다.

3. 포즈 reference 분리

   손목을 잡는 POV, 달리는 장면, 앉은 장면처럼 구도가 중요한 컷은 별도 pose/depth/canny reference를
   쓴다. 얼굴 reference 하나만 쓰면 구도 변화가 약하거나, 반대로 구도를 바꾸면 얼굴이 흔들릴 수 있다.

4. LoRA는 충분한 기준 컷 이후

   캐릭터별 LoRA는 최소한 같은 캐릭터로 확정된 여러 장의 이미지가 있을 때 의미가 있다. 처음부터 LoRA를
   학습하기보다, 먼저 canonical portrait와 5-10장의 선별 이미지를 만든 뒤 학습한다.

### 캐릭터 LoRA 학습 메모

일반적인 캐릭터 LoRA 데이터셋:

```text
datasets/serin/
  001_closeup.png
  001_closeup.txt
  002_biker.png
  002_biker.txt
  003_rain_alley.png
  003_rain_alley.txt
```

캡션 원칙:

- 고유 trigger token을 둔다. 예: `serin_mythos`
- 변하지 않아야 할 identity 요소를 반복한다.
- 바뀌어도 되는 요소는 구체적으로 캡션한다. 예: jacket, rain alley, motorcycle, close-up.
- 학습 데이터에 같은 구도만 넣으면 LoRA도 같은 구도에 갇힌다.

예시 캡션:

```text
serin_mythos, adult Korean woman, long black hair with bangs, intense eyes,
black leather rider jacket, cyberpunk rain alley, cinematic neon lighting
```

LoRA 사용 시 프롬프트 구조:

```text
<character trigger>, adult character, scene/action/outfit/mood,
cinematic cyberpunk lighting, Neo-Seoul, rain, neon, high detail
```

LoRA weight는 낮게 시작해 올린다.

```text
0.55-0.75: identity 유지와 장면 변화 균형
0.8 이상: 얼굴은 잘 잡히지만 구도/의상 변화가 둔해질 수 있음
```

### 프로젝트 파일 관리

로컬 실험과 공식 리소스는 분리한다.

```text
resources/neo-seoul/
  characters/       # 공식 캐릭터 기준 이미지
  opening/          # 공식 오프닝 컷
  enemies/          # 공식 bestiary/전투 자산
  concept/          # 공식 배경/컨셉

outputs/experiments/
  adult/
    serin/
    lin-yue/
```

공식 리소스로 승격하는 기준:

- 캐릭터 identity가 canonical image와 맞다.
- 손/얼굴/해부학적 오류가 플레이 중 거슬리지 않는다.
- UI에서 잘리는 구도에서도 핵심 피사체가 보인다.
- `scenario.json`, `character_map`, `bestiary.image`, opening config 등에서 참조할 목적이 명확하다.

### 런타임 연동

사전 제작 캐릭터/적/오프닝 이미지는 `scenario.json`에서 직접 참조한다.

```json
{
  "character_map": {
    "세린": "characters/se-rin.png",
    "정세린": "characters/se-rin.png",
    "린위에": "characters/lin-yue.png"
  }
}
```

전투 enemy는 bestiary의 `image`에 둔다.

```json
{
  "bestiary": {
    "sentinel_drone": {
      "image": "enemies/sentinel-drone.png"
    }
  }
}
```

동적 장면 생성은 계속 `mflux` worker를 쓴다. 이때 prompt에 캐릭터명이 들어가면
`VisualService._request_from_scene`이 `scenario.character_map`을 보고 reference image를 잡는다.

### 주의할 점

- ComfyUI 실험 자산을 곧바로 공식 리소스로 덮어쓰지 않는다. 후보를 먼저 `outputs/experiments/`에 모은다.
- 성인향 실험 결과는 기본 Streamlit Player View에 자동 노출되지 않게 한다.
- 적/bestiary는 가능한 사전 제작 자산으로 확정하고, 전투 중 매번 새로 생성하지 않는다.
- 주요 캐릭터는 “예쁜 한 장”보다 “반복 사용 가능한 기준 이미지”가 중요하다.

## Experiment Log

### 2026-06-02 Se-rin Visual Quality

위치: `outputs/experiments/adult/serin/`

비교:

- imagegen reference-aware prompt: 사전 제작 키아트 품질이 가장 좋음.
- `mflux` 4-bit: 빠르지만 디테일은 낮음. 경량 동적 생성용.
- `mflux` 8-bit: 로컬 동적 생성 기본 후보. 4-bit보다 안정적.
- `mflux` non-quantized: 성공했지만 8-bit 대비 큰 시각 이점은 제한적. 더 무거운 품질 실험용.
- diffusers FLUX img2img: 성공했지만 생성 시간이 길고, 현재 세린 reference img2img에서는 mflux 8-bit 대비 품질 이점이 제한적.

현재 결론:

- 공식 사전 제작 캐릭터/적/오프닝 컷은 imagegen 또는 고품질 FLUX 결과를 선별한다.
- 플레이 중 동적 장면 이미지는 `mflux` 8-bit를 기본 후보로 둔다.
- 더 큰 품질 향상은 단순 backend 교체보다 IP-Adapter/Redux/pose reference/LoRA와 업스케일 pass 쪽이 유망하다.
