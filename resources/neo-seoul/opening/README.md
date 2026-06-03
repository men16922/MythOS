# Neo-Seoul Opening Cinematic Assets

작성일: 2026-06-02

이 폴더는 Neo-Seoul 01의 첫 세션 진입 때 즉시 보여주는 사전 렌더 오프닝 스틸을 보관한다.

## 컷 구성

| File | Role | Generation |
| --- | --- | --- |
| `opening-01-serin-arrival.png` | C-17 정전 속 세린 도착/발견 컷 | 고품질 imagegen, reference: 사용자 제공 세린 얼굴 기준 |
| `opening-02-first-contact.png` | 세린이 플레이어 손목을 잡아 끌어올리는 첫 접촉 컷 | 고품질 imagegen, reference: 사용자 제공 세린 얼굴 기준 |
| `opening-03-drone-chase.png` | 드론 추적 속 도주 컷 | 고품질 imagegen, reference: 사용자 제공 세린 얼굴 기준 |

이전 `mflux` 초안 컷은 삭제했고, 현재 파일들이 정식 v1 오프닝 컷이다.

## Visual Identity Policy

- 사전 제작 고품질 키아트, 캐릭터, 적 이미지는 FLUX 또는 imagegen 중 결과 품질이 좋은 쪽을 선택한다.
- 게임 중 장면에 따라 동적으로 생성되는 이미지는 속도와 로컬 실행성을 위해 `mflux`를 사용한다.
- 기준 이미지는 `resources/neo-seoul/characters/`에 둔다.
- 세린처럼 첫 인상이 중요한 캐릭터는 한 컷마다 새 얼굴을 만들지 않는다.
- 세린 기준 이미지는 사용자 제공 얼굴 기준으로 재생성한 `characters/se-rin-biker.png`다.
- 적/bestiary 이미지는 가능한 한 `resources/neo-seoul/enemies/`의 사전 제작 자산으로 관리한다.
- 일회성 배경 소품, 단발성 컨셉 이미지는 imagegen 생성도 허용한다.
- imagegen 결과를 프로젝트에 쓰려면 반드시 `resources/` 아래로 복사하고, `scenario.json` 또는 문서에서 참조한다.

## Runtime Wiring

`resources/neo-seoul/scenario.json`의 `ui_copy.session_intro.cinematic_shots`가 이 파일들을 참조한다.
Streamlit Player View는 첫 루프의 `turn_index == 0`에서 이 컷들을 시네마틱 패널로 렌더한 뒤,
플레이어가 계속 버튼을 누르면 첫 장면 선택지로 들어간다.
