# Image Generation Policy & Pipeline

Project MythOS의 이미지 생성/관리 규칙과 로컬 파이프라인을 정리한다. 핵심은
**공식 플레이 리소스 / 사전 제작 키아트 / 런타임 동적 생성**을 분리해서 관리하고,
캐릭터 identity 일관성을 reference로 확보하는 것이다.

## 콘텐츠 기준

- 공식 리소스(`resources/`, 문서 대표 이미지, 플레이 노출 이미지)는 노골적·선정적 이미지를 넣지 않는다.
- 캐릭터 키아트는 서사적 역할, 실루엣, 표정, 의상, 분위기를 우선한다(예쁜 한 장보다 반복 사용 가능한 기준 이미지).
- 동적 생성 프롬프트는 "cinematic portrait / mature atmosphere" 수준의 비노골적 연출까지만 사용한다.
- 실존 인물 닮은꼴, 미성년/나이 모호 캐릭터는 만들지 않는다.
- `scenario.json`/문서에서 참조되는 이미지는 플레이어에게 노출된다고 간주한다.

## 세 갈래 이미지 관리

| 종류 | 도구 | 비고 |
| --- | --- | --- |
| 사전 제작 키아트(캐릭터/적/오프닝) | 고품질 FLUX 또는 imagegen | 얼굴/의상/조명 품질 우선. 기준 이미지를 먼저 확정 |
| 같은 캐릭터의 여러 장면 | ComfyUI + FLUX + IP-Adapter/Redux | 얼굴 reference와 장면 prompt를 분리 |
| 강한 포즈/구도 변화 | + pose/depth ControlNet | 얼굴 고정과 구도 고정을 동시에 관리 |
| 장기 캐릭터 고정 | 캐릭터별 LoRA | 반복 생성 시 identity drift 감소(기준 컷 확보 후) |
| 게임 중 동적 장면 | `mflux` visual worker | 속도·로컬 실행성 우선 |

## 캐릭터 일관성 전략

1. **기준 이미지 확정** — `resources/neo-seoul/characters/se-rin.png` 등 canonical image를 먼저 고정한다.
2. **identity reference 사용** — 같은 캐릭터를 다른 장면에 넣을 때 prompt만 반복하지 말고, 얼굴/의상 기준 이미지를 IP-Adapter/Redux로 주입한다.
3. **포즈 reference 분리** — 구도가 중요한 컷은 pose/depth/canny reference를 따로 쓴다(얼굴 reference만으로는 구도 변화가 약하거나 얼굴이 흔들린다).
4. **LoRA는 기준 컷 확보 후** — canonical portrait + 선별 5-10장이 모인 뒤 학습한다. 학습 데이터에 같은 구도만 넣으면 LoRA도 그 구도에 갇힌다.

### LoRA 메모

- 고유 trigger token(예: `serin_mythos`)을 두고, 불변 identity 요소는 반복 캡션하고 가변 요소(jacket/rain alley/close-up 등)는 구체적으로 캡션한다.
- weight는 낮게 시작: `0.55–0.75` identity·장면 균형, `0.8+`는 얼굴은 잡히나 구도/의상 변화가 둔해질 수 있음.

## 파일 관리

로컬 실험과 공식 리소스를 분리한다.

```text
resources/neo-seoul/
  characters/   # 공식 캐릭터 기준 이미지
  opening/      # 공식 오프닝 컷
  enemies/      # 공식 bestiary/전투 자산
  concept/      # 배경/컨셉
outputs/experiments/   # 후보(공식 리소스로 바로 덮어쓰지 않음)
```

공식 리소스로 승격 기준: ① identity가 canonical과 맞음 ② 손/얼굴/해부학 오류가 플레이 중 거슬리지 않음
③ UI에서 잘리는 구도에서도 핵심 피사체가 보임 ④ `scenario.json`/`character_map`/`bestiary.image`/opening에서 참조 목적이 명확함.

## 런타임 연동

사전 제작 캐릭터/적/오프닝은 `scenario.json`에서 직접 참조한다.

```json
{
  "character_map": { "세린": "characters/se-rin.png", "정세린": "characters/se-rin.png" },
  "bestiary": { "sentinel_drone": { "image": "enemies/sentinel-drone.png" } }
}
```

동적 장면은 `mflux` worker를 쓴다. prompt에 캐릭터명이 들어가면 `VisualService._request_from_scene`이
`scenario.character_map`을 보고 reference image를 잡는다. 적/bestiary는 가능하면 사전 제작 자산으로 확정하고
전투 중 매번 새로 생성하지 않는다.

## 백엔드 선택 (실험 결론, 2026-06-02)

- 공식 사전 제작 컷: imagegen 또는 고품질 FLUX 결과를 선별.
- 플레이 중 동적 장면: `mflux` 8-bit를 기본 후보로(4-bit는 빠르나 디테일 낮음, non-quantized는 8-bit 대비 이점 제한적).
- 더 큰 품질 향상은 backend 교체보다 IP-Adapter/Redux/pose reference/LoRA + 업스케일 pass가 유망하다.
