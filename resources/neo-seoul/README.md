# Neo-Seoul — 시나리오 01 비주얼 리소스

시나리오 `docs/scenarios/01-neo-seoul-connect.md`의 컨셉아트 및 캐릭터 이미지.
FLUX.1-schnell(MPS)로 생성. 아트 디렉션: 세기말/Y2K 디지털 + 한·중·일 사이버펑크
(딥네이비 + 사이버 시안 + 골드 네온, CRT 스캔라인/글리치).

## 재생성

```bash
.venv/bin/python scripts/gen_neo_seoul_art.py            # 전체
.venv/bin/python scripts/gen_neo_seoul_art.py --steps 4 --width 1024 --height 1024
```

공통 스타일 접미사와 프롬프트/시드는 `scripts/gen_neo_seoul_art.py`의 `ASSETS`에 정의.

## 에셋 목록

### concept/

| 파일 | 시드 | 내용 |
| --- | --- | --- |
| `01-night-market.png` | 42 | 한강 부유 야시장 — 빗속 한글 네온, 감시 드론, 배경 스파이어 (설정 샷) |
| `02-control-spire.png` | 77 | ARK 재건 메가타워 — 무균 백색, 감시의 눈, 차가운 권력 |
| `03-underground-echo.png` | 108 | 지하 ‘잔향 구역’ — 낡은 CRT와 한글 그래피티, 사람들의 온기/연대 |
| `04-reconstruction.png` | 91 | 전쟁 폐허 위 재건 — ARK 재건 메가구조물·크레인, 상흔과 새 도시 |

### characters/

| 파일 | 시드 | 인물 |
| --- | --- | --- |
| `se-rin.png` | 341→img2img | 정세린 «물거미» — 한국, 긴 흑발의 반항적·신비로운 사이버펑크 인도자(final-a를 img2img refuge로 다듬은 정식 포트레이트; 원본 final-a는 `variants/`에 보존) |
| `se-rin-biker.png` | 332 | 정세린 — 네온 바이크 장면 샷(인트로 비트용) |
| `lin-yue.png` | 412 | 린위에 «환전상» — 중국계, 옥좌의 암흑가 거물(v2-a, 임팩트 리파인) |
| `kai.png` | 423 | 카이 RX-09 — 일본계 폐기 **남성형** 안드로이드, 푸른 발광 눈(v2-b) |
| `administrator-ix.png` | 432 | 관리자 IX — ARK 관리망의 거대 구조물(v2-a) |

`characters/variants/`는 Se-rin 반복 후보(close-up/bike/helmet, fusion, biker, final)를 보관한다.
정식 채택본은 위 표의 `se-rin.png`(final-a 기반 img2img refuge 버전)와 `se-rin-biker.png`(biker-b, seed 332)이며,
생성 스크립트는 `scripts/gen_se_rin_final.py`·`gen_se_rin_v2.py`·`gen_se_rin_variants.py`.

배경: 동북아 전쟁으로 폐허가 된 도시를 범국가 재건기구 **「방주(ARK)」**가 Neo-Seoul/Neo-Tokyo 등으로
재건. 간판은 한글 중심. 시나리오 §2.0 참조.

## 캐릭터 일관성 (img2img)

같은 인물을 다른 포즈/장면으로 다시 그릴 때는 `scripts/img2img.py`(FLUX img2img)를 쓴다.
레퍼런스 이미지의 구도·look을 유지하며 프롬프트대로 변형한다.

```bash
.venv/bin/python scripts/img2img.py \
  --reference resources/neo-seoul/characters/se-rin.png \
  --prompt "the same woman in a warm underground refuge, gentle smile" \
  --out resources/neo-seoul/characters/variants/se-rin-refuge.png \
  --strength 0.55
```

- `--strength` 낮을수록 레퍼런스(정체성) 보존, 높을수록 변화 폭 증가.
- 데모: `variants/se-rin-img2img-refuge.png`(se-rin.png 기반, strength 0.55) — 동일 인물 유지 확인.
- 한계: img2img는 구도/look 보존이다. **큰 장면 변화 + 강한 얼굴-ID 고정**은 FLUX IP-Adapter
  (`FluxPipeline.load_ip_adapter`, 추가 가중치 필요)가 적합하며 후속 옵션으로 남겨둠.

## 주의

- 출력 PNG는 용량이 커서 저장소 관리 정책에 따라 git 추적 여부를 결정한다(필요 시 `.gitignore`).
- 생성에는 MPS + Hugging Face FLUX.1-schnell 접근이 필요하다(`make doctor`).
