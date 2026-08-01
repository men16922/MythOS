# Neo-Seoul Live QA — 소유자 최종 판정

최종 갱신: 2026-07-31. 문서상 마지막 검증 배포본은 **`mythos-api-00081-8lc`**
(2026-07-31, 100% traffic·Gemini 3.1 app-path 이미지 증거)입니다. 이 문서는 자동 검사를 반복하지 않고, 직접 플레이가 필요한
3개 판단과 플레이 중 이상할 때만 남길 8개 관찰만 다룹니다.

## 준비와 완료 조건

- 주소: `https://mythos-api-1004528040791.us-central1.run.app/?invite=<키>` — admin 키 권장.
- 같은 캐릭터로 새 production 루프 2개를 시작합니다. 한쪽은 **사람 돕기·개입**, 다른 쪽은
  **안전·증거 수집** 선택을 일관되게 고릅니다.
- 두 루프 ID를 모두 기록해 주세요. 판정 전에 에이전트가 로그에서 **non-fallback 2개**인지 확인하고
  narrative eval bank에 넣습니다. fallback이면 그 루프는 스타일 판정 표본으로 쓰지 않습니다.
- 두 스타일 중 하나를 엔딩까지 진행하면 됩니다. 별도의 세 번째 완주는 필요 없습니다.
- 아래 직접 확인 3개를 모두 판정하고, 문제가 있으면 `[!]`와 함께 상황·루프 ID·가능하면
  스크린샷을 적으면 완료입니다.

## 직접 확인 (3)

- [x] **두 스타일의 둔함/예민함 — HOLD.** 사람·개입은 소각로 민간인 방어·구출, 안전·증거는
  발자국·삭제 기록·은폐로 초반 방향이 분명하지만, 후반에는 둘 다 배수로·서치라이트·도주·전투
  공식으로 수렴해 대비가 완주까지 유지되지 않습니다(주요 장소 25/47·22/47, 전투 12·7회, 도주 8·7회). 사람·개입은 과잉 추격, 안전·증거는 반복 은폐로
  각각 치우칩니다. 사람·개입 루프와 안전·증거 루프의 장면 시선, 긴장 흐름,
  선택의 결과와 엔딩 분위기가 자연스럽게 달라지는가?
  - 문제: 선택 방향을 바꿔도 거의 같음(둔함) · 몇 번의 선택만으로 과도하게 쏠림(예민함).
- [x] **엔딩 납득 — OBJECTIVE PASS / HUMAN FEEL PENDING.** `00079-d4k`의 신규 EN 루프
  `loop_fde2…fec34`는 IX `player_fled`→Forced Erasure 후 작성된 영문 엔딩 서술과 lost/carried 결과를
  Run History에 보존했고, 종료된 세션을 archive로 옮겼습니다. 단, 엔딩의 느낌과 납득성은 오너의 주관 판정으로 남습니다.
- [x] **완주 총평 — HOLD.** 기억에 남는 장면은 `The Smoldering Threshold`의 소각로 우리,
  `The Sinking Market`의 비 내리는 야시장, `The Collapsing Junction`의 IX 시스템 purge입니다.
  장면 단위 물성과 IX의 정중한 위협은 좋지만, 반복과 전환 누락이 전체 인상을 깎습니다.

## 이상할 때만 기록 (8)

아래 항목을 따로 재현할 필요는 없습니다. 위 두 루프를 플레이하다 눈에 띄게 이상할 때만
기록해 주세요.

- 작전지도를 손가락으로 끌 때 어색함.
- 글이 나오는 중 버벅이거나, 위를 읽는 중 화면이 바닥으로 끌려감.
- 새 app-path 이미지가 실패·공백으로 남거나 세린·동료 얼굴이 연속 턴에서 다른 사람으로 바뀜
  (인물과 몇 번째 턴인지 기록).
- 파티가 3~4명일 때 적이 아무 행동도 못 하고 끝날 정도로 쉬움.
- 루트 진행 15~20분 구간이 늘어지거나 보스 직전 휴식이 정비로 읽히지 않음.
- 전투→보상→이야기 복귀가 어색하거나 다운된 동료의 복귀·성장이 체감되지 않음.
- 아이템·인벤토리·장착이 RPG답게 읽히지 않거나, 새 아이콘·스킬 편성창·조준 배지가 헷갈림.
- 서사 연결 이상: 목표와 장면 불일치 · 만나기 전 인물 이름 노출 · 안전 경로에서 전투 ·
  내면 독백 남발 · 오프닝 flash-then-swap · 카피/반전 톤이 어색함(EN 플레이면 영문 연결도 기록).

## 결과 기록

- 사람·개입 루프 ID: `loop_c6610a5b29cd451ebb2e06e0bd1e25bb` — Forced Erasure 완주
- 안전·증거 루프 ID: `loop_84dfb8b5398645fe9475795292c733ef` — Forced Erasure 완주 (`loop_f148…2350`은 3/15 fallback으로 제외)
- 2026-07-30 신규 EN 엔딩 QA: `loop_fde284633a654c00852d5c55838fec34` — Forced Erasure, 63 turns, 작성된 EN 엔딩·lost/carried·archive 객관 통과
- 신규 루프 생성 감사: 45/47 success + 2 fallback (`provider_error` 1, `parse_error` 1; Cloud Trace 재구성) — promotion/eval bank에 넣지 않음
- non-fallback 확인: 사람·개입 47/47 PASS · 안전·증거 47/47 PASS
- 루브릭 지원 증거: `outputs/evals/20260728-030707/` — 사람·개입 3/5 · 안전·증거 3/5
- 오너 검토 패킷: `outputs/evals/20260728-030707/owner-review.md` — 장면 탐색용이며 판정을 대신하지 않음
- 반복 수정 판정: `docs/reports/2026-07-31-late-loop-repetition-scope.md` — 새 유료 런 전 수정 필요
- 직접 판정 범위: 위임된 agent review — banked 전체 transcript·47/47 운영 로그·Cloud Run 요청 로그·
  production Run History API를 대조했습니다. 종료 루프는 설계상 재개 불가해 마지막 ending render 자체는 재생하지 못했습니다.
- 스타일 판정: **HOLD** — 초반 분기는 읽히지만 후반 수렴이 큼
- 엔딩 판정: **OBJECTIVE PASS / HUMAN FEEL PENDING** — `player_fled`→Forced Erasure 연결과 작성된 EN 엔딩·lost/carried·archive는 보존됨
- 기억나는 장면 3개: `The Smoldering Threshold` · `The Sinking Market` · `The Collapsing Junction`
- 이상 기록·스크린샷: `c661…`은 후반 선택→전투→도주→유사 골목 반복, `84df…`는 배수관/서치라이트 공식·도주 후 격파 전제·KO 템플릿 혼입이 관찰됐습니다. `84df…`는 생성 중 재연결 실패 3회를 같은 선택으로 재시도했지만 최종 서사 outcome은 47/47 success였습니다.
- 2026-07-30 추가 이상: 신규 루프도 배수로/통풍구/서치라이트/도주/전투 공식을 반복했고, 종료 auto-save가 Load modal에서 `In combat` 슬롯으로 보였지만 서버 Run History는 ended/archive였습니다. 새 app-path 이미지는 GCS 1024×1024로 정상 렌더링되었습니다.
- 2026-08-01 신규 아암 시도: `loop_8b7a32b28b5145b497be2c3a70b60dc2` (EN·Ghost·사람 돕기) — 13/14 success + 1 fallback(`parse_error`)로 **제외**, 장면 ~13에서 중단. 관찰: 패배 직후 3 서사 커밋 내 ambient 전투 재진입 없음(수정 유효), `Changed …` 제목 없음, 초반 장소 다양화 정상. 문제: novelty 수정 템플릿 `New Vector at …` 제목이 4개 장면에서 반복, 동일한 `Patrol Ambush` 인카운터(같은 드론 2기·같은 문구)가 3회, 도주 시도가 Defeat/CAPTURED로 처리, AMP 샤드 모달이 선택 후 닫히지 않음(재클릭 409, 전투 중 오버레이 포함), EN 화면에 한국어(루트 노드 설명·`획득` 토큰·장면 이미지 내 한글) 혼입. 새 이미지는 정상 생성·렌더링.

이미지 도착, 동료 합류·컷신·복귀, 선택지 도착, 첫 용어 주석, 가치축 칩은 release calibration의
fail-closed 자동 항목이므로 이 문서에서 능동 테스트하지 않습니다.
