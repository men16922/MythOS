# Plan — 동료 호감도 시스템 + 동적 컷씬 언락 (+ 레이어 분리 영향도/완성)

작성: 2026-06-16 · 상태: 계획(승인됨, 우선순위화)

## Context

요청 3종:
1. **레이어 분리(코드↔프롬프트) 영향도 파악 + 소스 전반 리팩토링** — 진행 중 prompt-layer 리팩토링(Phase 0-2 완료)을 끝까지(Phase 3-5) + 노드-주소 지정 확장.
2. **동료 호감도(affection) 시스템** — Se-rin 등 동료 관련 선택 시 호감도 상승.
3. **호감도/동적 선택 기반 동료 추가 컷씬(이미지+대본) 언락·열람 시스템.**
4. 에셋: `outputs/experiments/adult/serin/imagegen/{serin-openai-imagegen-racing-bodysuit-20260606,serin-fashion-test-01}.png` (Se-rin 컷씬용 고품질 2종).

## 핵심 발견 (영향도)

- **호감도 데이터는 이미 저작돼 있으나 런타임이 무시한다(dead data).** `scenario.json`의 route perspective·choice `effect.relationship: {se_rin: 1 / -1, lin_yue: 1, kai: 1}`가 다수 존재하지만 `route_runtime.py:96`은 `effect.flags`만 적용 → **relationship 델타가 상태에 누적 안 됨**. 호감도 시스템 = 주로 이 누적 배선 + 지속화 + 노출.
- **오프닝 이후 주요 장면(route 앵커)**: layer1 `night_market`(거래) · layer2 `data_incinerator`(각성) · layer3 `kai_awakening`+`subway_control_hub` · layer4 `spire_gate`(잠입) · layer5 `ix_confrontation`(엔딩). 각 앵커는 `perspectives`(플래그로 선택되는 변주) + 큐레이트 이미지 보유.
- **동료 6 + 빌런**: 정세린(인도자/밀수꾼)·린위에(브로커)·카이(안드로이드)·태오(집행관)·한(해커)·수아(기억 대장장이)·IX. **side_arcs 6종**(동료별 사이드)은 저작됐으나 route 노드 미배치(프롬프트 힌트만).
- **prompt-layer 인프라(Phase 0-2 완료)**가 컷씬 언락의 토대: 컷씬 = 호감도 임계로 언락되는 **authored directive 노드(이미지+대본)** → `directives/*.md` 노드-주소 지정으로 구현.

## 우선순위 작업

### P0 — 호감도 런타임 토대 (engine·결정론·`[auto]` 검증 가능)

목표: 이미 저작된 relationship 델타를 실제 상태로 누적·지속·노출.
- `route_runtime.py`: perspective `effect.relationship`를 `loop.state["relationships"][companion] += n` 로 누적(flags 처리 옆에 추가).
- choice 단위 relationship(`scenario.json` choice `effect.relationship`)도 `session.py` choose 경로에서 동일 누적.
- 크로스-루프 지속: meta progression(insight처럼)에 `relationships` 적립/이월(`progression.py`).
- API serializer가 `relationships` 노출 → 프론트 "기억의 별자리"에 동료별 호감도 게이지.
- 무결성 테스트(`[auto]`): 모든 `effect.relationship` 키 ∈ `characters[].name`/동료 id 집합(dangling 0). 누적 단조성 유닛테스트.
- 완료 기준: relationship 누적/지속/표시 동작 + `make check` green.

#### P0-게이지 구현 breadcrumb (2026-06-21, LSP 검증 · overnight `[auto:claude]` 시드)

정찰 완료 — 백엔드는 이미 노출, 프론트는 빈 캔버스(grep `relationship`/`affection`/`호감` 0건). overnight 루프가 코드 슬라이스를 구현하고 critic이 그 커밋을 리뷰하도록 시드.

데이터 흐름: `loop.state["relationships"]`(dict[str,int]) → `snapshot_to_dict` `"state": to_json_dict(state)`(`src/mythos_api/serializers.py:316`) → 프론트 `snapshot.state.relationships`. 누적 배선: `route_runtime.advance_route`(perspective 델타) + `session.py` choose(choice `effect.relationship`). 값 범위 비고정(음수=거부 경로 포함).

구현 슬라이스(`[auto:claude]`, 빌드 게이트):
- 타입: `GameStateRaw`(`src/mythos_ui/src/types.ts:278`, LSP 확인)에 `relationships?: Record<string, number>` 추가(현재 `[key:string]:unknown`으로 떨어짐).
- 정규화 헬퍼: `gauges.ts`에 int→0–100 percent + 색(양수=따뜻한색/음수·저호감=차가운색) + hint("관계도. 높을수록 특별한 장면·엔딩이 열림"). 기존 `clockColor`(`gauges.ts:17`) 패턴 참고.
- 렌더: 기존 `GaugeBar()`(`src/mythos_ui/src/GameAside.tsx:408`, LSP 확인) **재사용**(신규 게이지 컴포넌트 금지).
- 마운트: (a) `CharacterPanel.tsx`(인게임 NPC, ~L81-100, 맥락형) 그리고/또는 (b) `CharacterTabPanel.tsx`(Codex 로스터, 크로스-런 지속 = 플랜의 "기억의 별자리" 의도에 부합). 우선 (b).
- CSS: 기존 `.gauge*`(`index.css:308-340`) 재사용.

완료 기준: `make check` green(eslint+tsc+vite-build), 게이지가 `state.relationships`를 읽어 동료별 표시, 신규 `any` 0.
게이트 한계(정직성): **FE 유닛테스트 러너 부재**(vitest/jest 없음) → 게이트는 컴파일/타입/린트만 보증, **시각적 정확성은 미검증**. critic은 코드 회귀/스코프크립은 잡아도 "게이지가 맞게 보이는지"는 못 잡음 → `[manual]` 시각 feel QA(올바른 동료/값·색·스케일·빈 상태)는 사람 플레이 후속 필수.

### P1 — 컷씬 언락 시스템 (prompt-layer 노드-주소 지정 활용)

목표: 호감도 임계 + 플래그 충족 시 **authored 컷씬(이미지+대본)** 언락·열람.
- `scenario_directives.py` 확장: `directives/companions/<name>.md` 로더 — 컷씬 블록(`## SERIN_CUT1 (unlock_affection=3, flags=met_se_rin, image=...)` → 대본 본문). `CutsceneDirective` dataclass(unlock 조건·image_ref·body).
- 언락 판정(결정론): `loop.state.relationships[name] >= threshold` + flags → 언락 플래그 set, meta progression에 영구 기록(크로스-루프 갤러리).
- 주입: 컷씬 언락 시 (a) 인게임 동적 노드로 등장(director에 컷씬 대본 주입 + 큐레이트 이미지 표시) 또는 (b) 갤러리 열람. 우선 (b) 갤러리(저위험) → (a) 인게임 등장(WS-B 노드 승격).
- 뷰어: "기억의 별자리"/Codex에 **동료 컷씬 갤러리**(언락된 컷씬 이미지+대본 열람, 미언락은 잠김 표시).
- 완료 기준: 임계 도달 시 언락 플래그·갤러리 표시 + `make check` green.

#### P1-갤러리 뷰 구현 breadcrumb (2026-06-21, LSP 검증 · overnight `[auto:claude]` 시드)

백엔드 완료(갤러리 payload 노출), 프론트 미구현. overnight `[auto:claude]` code-wiring 슬라이스 + `[manual]` 시각 feel 분리.

데이터 흐름: `cutscene_gallery()`(`src/mythos_runtime/cutscenes.py:63`) → `memory_overview_to_dict` 가 `payload["cutscene_gallery"]` 주입(`src/mythos_api/serializers.py:34`) → `GET /api/v1` `get_memory_overview`(`app.py:566`) → 프론트 `memoryOverview`(`App.tsx:103`) → `CodexPanel`("기억의 별자리" 탭).
엔트리 shape(`cutscenes.py:78-88`): `{id, companion, title, affection_required, flags_required[], unlocked, image|null, body|null}` — 잠김=image/body null(요건만 노출), 해제=큐레이트 image + 대본 body. 순서=저작 순(결정론).

구현 슬라이스(`[auto:claude]`, 빌드 게이트):
- 타입: `MemoryOverview`(`src/mythos_ui/src/types.ts:429`, LSP 확인)에 `CutsceneGalleryEntry`(위 shape) + `cutscene_gallery?: CutsceneGalleryEntry[]` 추가(현재 미타입).
- 컴포넌트: 신규 `CutsceneGallery.tsx` — 카드 그리드. 잠김=요건 힌트("호감도 N + flags") 잠금 카드, 해제=image 썸네일 + title(클릭 시 body 대본 열람).
- 마운트: `CodexPanel.tsx`(기억의 별자리 탭, ~L27-96, `ProgressDashboard`/`RunHistoryPanel` 옆). 플랜의 "Codex 갤러리" 의도와 일치.
- CSS: 기존 카드/패널 클래스 재사용(신규 디자인 토큰 금지).

완료 기준: `make check` green(eslint+tsc+vite-build), 갤러리가 `memoryOverview.cutscene_gallery`를 읽어 잠김/해제 분기 렌더, 신규 `any` 0.
게이트 한계: FE 유닛테스트 러너 부재 → 컴파일/타입/린트만 보증, **시각·열람 동작 미검증** → `[manual]` 시각 feel QA(잠금/해제 표시·이미지·대본 모달)는 사람 패스 필수.

### P2 — Se-rin 컷씬 콘텐츠 (에셋 매핑, `[manual]` 저작)

- `resources/neo-seoul/scenes/`(또는 `cutscenes/`)로 2 이미지 채택·정규화(`outputs/experiments/.../*.png` → resources, IMAGE_POLICY 준수).
- `directives/companions/se_rin.md`: 호감도 임계별 컷씬 2-3종 대본 저작(예: affinity≥2 일상 컷, ≥4 신뢰 컷). 이미지 매핑.
- 라이브 플레이로 Se-rin 호감 경로 → 컷씬 언락 체감 QA.

### P3 — 동료 확장 + side_arc 승격 (`[manual]`/WS-B)

- 카이·린위에·태오·한·수아 호감도 컷씬 저작(`directives/companions/<name>.md`) + 이미지.
- `side_arcs` 6종을 route 사이드-앵커로 승격(동료 플래그/호감 충족 시 pool 출현) — WS-B 트랙 2.

### Foundation — prompt-layer 리팩토링 완성 (병행 prereq)

P1의 컷씬 노드는 directives 확장에 의존하므로 함께 진행. 잔여:
- **Phase 3** — fallback 장면 → `directives/fallback.md` + `NarrativeContext.fallback_scene` 배선(director는 Phase 1서 이미 읽음).
- **Phase 4** — naming/stat-voice/encounter prose → md(generic 기본값 코드 유지, glass-library 회귀 0).
- **Phase 5** — system_prompt few-shot 예시 추출(캐시 prefix 민감, 최저 우선).
- **노드-주소 지정**(WS-B 핵심): directives 블록 키를 `turn=`뿐 아니라 `node=`/`beat=`로 → 앵커·컷씬 잠금 봉투 균일 적용. P1의 직접 prereq.

## 권장 실행 순서

1. **P0 호감도 런타임**(독립·결정론, 즉시 가치 — dead data 활성화).
2. **Foundation: 노드-주소 지정 + Phase 3**(컷씬 노드 prereq).
3. **P1 컷씬 언락(갤러리 먼저)** + **P2 Se-rin 컷씬 2종**(에셋 활용).
4. **P3 동료 확장 / Phase 4-5**(후속).

## 검증

- 각 단계 `make check` green. P0/P1은 결정론 invariant + 유닛테스트(`[auto]`).
- 라이브: `scratch/narrative_multiturn_check.py` + `make dev-up` 사람 플레이로 호감→컷씬 언락 체감.
- 콘텐츠 무결성: relationship 키·컷씬 unlock 조건·이미지 경로 dangling 0 invariant.

## 미해결/주의

- 컷씬 인게임 등장(P1-a)은 8B 비결정성 영향권 → 큐레이트 이미지 + authored 대본(directive 잠금)으로 신뢰성 확보. 갤러리(P1-b)는 결정론이라 우선.
- `outputs/experiments/adult/` = 성인/로맨스 톤 — IMAGE_POLICY 준수, resources 채택 시 정책 확인.
- 호감도 음수(거부 경로) 처리: 컷씬 언락 외에 관계 악화 분기도 relationship 음수로 표현 가능(P0 누적이 양/음 모두 지원).
