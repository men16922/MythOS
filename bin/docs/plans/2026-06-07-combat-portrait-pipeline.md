# Combat Portrait Pipeline

작성일: 2026-06-07
상태: party 3인(Se-rin/player-noise/Kai) + humanoid enemy 2종(enforcer-unit/glitch-wraith) 검증 완료

## 목적

전투 지도 기본 유닛은 기존 섬네일 portrait를 유지한다. 풀바디 캐릭터 아트는 `CombatCinema`의
공격/방어/스킬/피격 연출에서만 사용한다.

개별 pose를 따로 생성하면 얼굴, 의상, 카메라, 체형이 흔들린다. 기준 방식은 **한 캐릭터당 동일
캔버스 action sheet**를 먼저 만들고, 그 시트에서 pose를 분할하는 것이다.

## 이미지 생성 모델 선택 원칙

권위 결정: `docs/DECISIONS.md` (2026-06-07).

전투 에셋은 특정 모델 이름이 아니라 **검수 통과한 action sheet 산출물**을 기준으로 승격한다.
2026-06-07 기준 party 3인(`Se-rin`, `player-noise`, `Kai`)과 humanoid enemy 2종(`enforcer-unit`,
`glitch-wraith`) canonical 세트는 Codex 내장 imagegen으로 만든 action sheet를 chroma-key
제거/분할/정규화한 결과다.

운영 규칙:

- **모델 강제 금지**: Gemini/Imagen 3, FLUX, Codex imagegen 등은 후보가 될 수 있지만, repo에 재현 명령과
  검수 시트가 없으면 운영 기준으로 삼지 않는다.
- **캐릭터 단위 일관성**: `idle/attack/guard/skill/hit`의 얼굴, 체형, 의상은 같은 기준 이미지/같은 모델
  계열/같은 프롬프트 컨셉에서 나와야 한다. 얼굴·체형을 바꾸지 않는 VFX 오버레이는 후보정으로 허용한다.
- **action sheet 우선**: `attack/guard/skill/hit`은 한 캔버스에서 같이 생성한다. 독립 pose 생성은 fallback
  실험으로만 두고, 실사용 승격 전에 전체 preview sheet로 비교한다.
- **외부 모델 도입 조건**: GCP/API 등 외부 모델을 쓰려면 먼저 `scratch/` 또는 문서에 실행 경로, 비용/자격증명
  요구, 생성 프롬프트, 검수 시트를 남긴다.
- **게임 키 우선**: `dash/dodge/victory`처럼 현재 런타임에 매핑되지 않은 포즈는 만들지 않는다. 필요한 경우
  먼저 `combat_images` 키와 `CombatCinema`/애니메이션 매핑을 추가한다.

## 확정 포즈 키

`combat_images`는 아래 키를 표준으로 사용한다.

- `idle`: 시네마 시작 기본 전신 포즈.
- `attack`: 일반 공격. 사격/타격 등 실제 행동이 읽혀야 한다.
- `guard`: 방어/실드/엄호. 없으면 UI는 `skill`로 폴백한다.
- `skill`: 능동 스킬 시전.
- `hit`: 피격/충격 반응.

## Party 기준 결과

실사용:

- `resources/neo-seoul/characters/combat/se-rin-idle.png`
- `resources/neo-seoul/characters/combat/se-rin-attack.png`
- `resources/neo-seoul/characters/combat/se-rin-guard.png`
- `resources/neo-seoul/characters/combat/se-rin-skill.png`
- `resources/neo-seoul/characters/combat/se-rin-hit.png`
- `resources/neo-seoul/characters/combat/player-noise-idle.png`
- `resources/neo-seoul/characters/combat/player-noise-attack.png`
- `resources/neo-seoul/characters/combat/player-noise-guard.png`
- `resources/neo-seoul/characters/combat/player-noise-skill.png`
- `resources/neo-seoul/characters/combat/player-noise-hit.png`
- `resources/neo-seoul/characters/combat/kai-idle.png`
- `resources/neo-seoul/characters/combat/kai-attack.png`
- `resources/neo-seoul/characters/combat/kai-guard.png`
- `resources/neo-seoul/characters/combat/kai-skill.png`
- `resources/neo-seoul/characters/combat/kai-hit.png`

Humanoid enemy 실사용:

- `resources/neo-seoul/enemies/combat/enforcer-unit-idle.png`
- `resources/neo-seoul/enemies/combat/enforcer-unit-attack.png`
- `resources/neo-seoul/enemies/combat/enforcer-unit-guard.png`
- `resources/neo-seoul/enemies/combat/enforcer-unit-skill.png`
- `resources/neo-seoul/enemies/combat/enforcer-unit-hit.png`
- `resources/neo-seoul/enemies/combat/glitch-wraith-idle.png`
- `resources/neo-seoul/enemies/combat/glitch-wraith-attack.png`
- `resources/neo-seoul/enemies/combat/glitch-wraith-guard.png`
- `resources/neo-seoul/enemies/combat/glitch-wraith-skill.png`
- `resources/neo-seoul/enemies/combat/glitch-wraith-hit.png`

검수 시트:

- `outputs/combat-sprite-compare/imagen/se-rin-final-combat-poses.png`
- `outputs/combat-sprite-compare/imagen/party-final-combat-poses.png`
- `outputs/combat-sprite-compare/imagen/enforcer-unit-final-combat-poses.png`
- `outputs/combat-sprite-compare/imagen/glitch-wraith-final-combat-poses.png`

## 생성 절차

1. **기준 idle 생성**
   - 스토리/인물 포트레이트는 건드리지 않는다.
   - 전투 시네마 전용 `idle`은 배경, 차량, 장면 소품이 없는 전신 스프라이트여야 한다.
   - action sheet와 높이/화각이 맞도록 head-to-boots 전신, 넉넉한 padding, 단순한 idle stance를 요구한다.
   - chroma-key 배경으로 생성 후 투명 PNG로 제거한다. 키 색상은 아래 **chroma-key 선택 규칙**을 따른다.

2. **action sheet 생성**
   - 한 캐릭터의 `attack/guard/skill/hit`을 한 캔버스 안에 4열로 생성한다.
   - 프롬프트에서 얼굴, 머리, 의상, 체형, 조명, 재질을 고정한다.
   - 각 pose 사이에 넓은 빈 간격(gutter)을 요구한다. pose가 열 경계를 넘으면 분할 후 잔여 조각이 생긴다.
   - pose별 독립 생성은 기본 금지한다. 일관성보다 포즈가 더 중요한 실험 때만 후보로 둔다.

3. **chroma-key 제거**
   - built-in imagegen 출력 원본은 `$CODEX_HOME/generated_images/...`에 보존한다.
   - 프로젝트에는 `outputs/combat-sprite-compare/imagen/*-source.png`로 복사한다.
   - 투명화는 시스템 helper를 사용한다.

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input outputs/combat-sprite-compare/imagen/<slug>-action-sheet-source.png \
  --out outputs/combat-sprite-compare/imagen/<slug>-action-sheet-alpha.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

4. **pose 분할/정규화**

```bash
.venv/bin/python scratch/normalize_combat_pose_sheet.py \
  --sheet outputs/combat-sprite-compare/imagen/<slug>-action-sheet-alpha.png \
  --slug <slug> \
  --poses attack guard skill hit \
  --out-dir resources/neo-seoul/<characters-or-enemies>/combat-candidates \
  --preview outputs/combat-sprite-compare/imagen/<slug>-poses-preview.png
```

5. **검수 후 실사용 경로로 승격**
   - preview에서 얼굴/의상/스케일/포즈 설득력을 확인한다.
   - 열 경계 잔여 조각, 잘린 손/발/무기, 키 색상 fringe, VFX 소실이 있으면 실사용으로 복사하지 않는다.
   - 승인된 파일만 `resources/neo-seoul/characters/combat/` 또는 `resources/neo-seoul/enemies/combat/`로 복사한다.
   - `scenario.json`의 `combat_images`에 `guard` 포함 여부를 반영한다.

## Chroma-Key 선택 규칙

키 색상은 캐릭터/이펙트에 없는 색을 고른다.

- 기본값: `#00ff00`.
- 녹색/시안/블루 해킹 VFX가 많은 캐릭터(`player-noise`, Kai 일부 skill)는 `#ff00ff`를 우선 사용한다.
- 마젠타/보라 계열 캐릭터나 VFX(`glitch-wraith`)는 `#00ff00` 또는 노란 계열 후보를 쓴다.
- 프롬프트에 "Do not use `<key>` anywhere in the character or effects."를 반드시 넣는다.
- 생성 후 네 귀퉁이 색을 확인한다. 배경이 균일하지 않아도 `--auto-key border`가 작동하지만, 키 색상이
  이펙트와 겹치면 필요한 VFX가 같이 지워진다.

## 프롬프트 기준

중요 규칙:

- "same face", "same hair", "same outfit", "same proportions", "same lighting"을 명시한다.
- "four full-body poses arranged left to right on one sheet"를 명시한다.
- "wide empty gutter between poses"를 명시한다.
- "no labels, no text"를 명시한다. 열 이름은 후처리 preview에서 붙인다.
- 배경은 flat chroma-key로 고정하고, 키 색상은 캐릭터/VFX와 겹치지 않게 고른다.
- action pose에는 실제 행동을 넣는다. 단순 틴트, 기울이기, glow만 있는 이미지는 폐기한다.

Se-rin action sheet pose 기준:

- `attack`: compact carbine rifle, muzzle flash, recoil, planted stance.
- `guard`: cyan noise-shield barrier, rifle held low, protective posture.
- `skill`: cyan signal-noise ribbons/glitch particles, active casting hand.
- `hit`: red impact blast, torso twist, arm guarding face, sparks on jacket.

## 검수 기준 / 폐기 기준

승격 조건:

- `idle`과 action poses가 같은 인물/기체로 보인다.
- 모든 pose가 전신이고, 머리/발/주요 무기가 잘리지 않는다.
- `attack`, `guard`, `skill`, `hit`이 0.5~1초 노출에서도 구분된다.
- 시네마 카드 안에서 silhouette가 읽힌다. 너무 어둡거나 배경과 섞이면 폐기한다.
- 투명 가장자리와 VFX가 과하게 깎이지 않는다.

폐기 조건:

- 얼굴/체형/의상이 pose마다 다른 캐릭터처럼 바뀐다.
- action sheet 열 경계의 다른 pose 일부가 남아 있다.
- `guard`와 `skill`이 사실상 같은 그림이다.
- `hit`이 단순 red tint 수준이고 실제 충격/후퇴가 읽히지 않는다.
- key 색상이 VFX를 같이 제거했다.

## 다음 적용 순서

1. 전투 시네마에서 action art 표시 위치/스케일/지속시간/가독성을 polish한다.
2. 이후 drones는 action sheet보다 단일 기체 변형/이펙트 중심으로 별도 기준을 둘 수 있다.
3. 모든 캐릭터에 `guard`가 필요하지는 않다. 방어형 스킬이 있는 캐릭터부터 우선 생성한다.

## 검증

- `python -m json.tool resources/neo-seoul/scenario.json`
- `make frontend-build`
- `make frontend-lint`
- `.venv/bin/python -m unittest tests.test_combat_service`

---

## 이미지 지침 피드백 (2026-06-07)

Se-rin party 세트와 별도 Gemini 후보 비교를 통해 얻은 피드백이다. 아래 내용은 기존 절차를 대체하기보다
다음 에셋 제작 때의 판단 기준으로 쓴다.

### 1. Action Sheet는 기본 경로, 참조 기반 개별 포즈는 예외 경로

- Action sheet 방식은 한 캔버스 안에서 얼굴/의상/조명을 고정하기 쉬워 현재 party 3인 canonical에 적합했다.
- 단점은 포즈별 유효 해상도가 낮고, 열 경계를 넘는 VFX/무기가 분할 조각으로 남을 수 있다는 점이다.
- 참조 기반 개별 포즈 생성은 고해상도 장점이 있지만, 현재 repo에는 Gemini/GCP 실행 경로가 없고 런타임 키와
  맞지 않는 pose가 섞일 위험이 있다.
- 결론: **실사용 기본은 action sheet**, 개별 포즈는 `idle/attack/guard/skill/hit` 키를 정확히 맞추고
  동일 reference/동일 모델/동일 검수 시트가 있을 때만 후보로 둔다.

### 2. 배경 제거는 단일 규칙이 아니라 subject/VFX별 선택

- `#00ff00`은 기본값일 뿐이다. player-noise처럼 green hacking VFX가 핵심인 경우 VFX가 같이 지워지므로
  `#ff00ff`가 더 안전했다.
- 흰색 배경은 어두운 의상 경계에는 유리할 수 있지만, 흰/금속 armor(Kai)나 밝은 하이라이트가 있는 대상에는
  subject까지 같이 깎일 수 있다.
- 결론: **키 색상은 캐릭터 색이 아니라 VFX 색까지 포함해 고른다.** 생성 후 alpha preview에서 머리카락,
  무기 끝, shield/ribbon VFX가 살아 있는지 확인한다.

### 3. 무매핑 포즈는 보관 가능하지만 canonical 승격 금지

- `dash/dodge/victory`는 컷신, 승리 UI, 후속 스킬 확장 후보로 보관할 수 있다.
- 현재 `CombatCinema`와 `combat_images` 표준 키는 `idle/attack/guard/skill/hit`이다.
- 결론: 무매핑 포즈는 `outputs/combat-sprite-compare/<experiment>/`에만 둔다. 실사용 `resources/.../combat/`로
  승격하려면 먼저 런타임 키와 UI/애니메이션 매핑을 추가한다.

### 4. 모델 비교 문서는 "채택 결정"이 아니라 "후보 평가"로 쓴다

- `outputs/combat-sprite-compare/gemini/`의 Se-rin 후보는 비교 자료다.
- 현재 실사용 Se-rin/player-noise/Kai 세트는 `outputs/combat-sprite-compare/imagen/party-final-combat-poses.png`
  기준의 Codex imagegen action sheet 결과다.
- 외부 모델 후보가 더 낫다고 판단되면, 기존 canonical 파일을 바로 덮지 말고 비교 시트와 재현 명령을 먼저
  남긴 뒤 한 캐릭터 단위로 교체한다.
