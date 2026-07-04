# CBT 피드백 로그 & 트리아지

최종 갱신: 2026-07-05

클로즈베타 테스터 피드백의 **수집 → 진단(당시 빌드 기준 원인) → 조치 상태**를 누적하는 단일 로그.
새 피드백은 맨 위에 추가. 전략/설문 틀은 `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`,
설문 템플릿은 `CBT_FEEDBACK_FORM_TEMPLATE.md`. 조치 백로그의 authority는 `docs/NEXT_PLAN.md`.

표기: 🔴 미해결(조치 필요) · 🟡 부분 수정(재검 필요) · 🟢 해소(근거 링크) · ⚪ 정보/칭찬.

---

## #1 — Audrey (EN, r/playtesters 라운드 1) — 2026-07-05 수신

- **플레이 빌드**: Cloud Run rev `00008-7sx`~`00015` 추정 (**gemini-2.5-flash**, `MAX_PROMPT_NOTES=8`
  규칙-잘림 버그 존재 시기, EN). 현재 스택(3.5-flash + 규칙 복원 + 프롬프트 다이어트)과 서사 엔진이 다름.
- **프로필**: 프로그래밍 입문자, 게이머 경력 김. 도움 제안 + 다음 테스트 참여 의사 — 리텐션 가치 높음.

### 원문 (요지 보존 발췌)

> This looks incredibly polished. I can tell you put a ton of work into the visuals and the art
> direction. The theming is consistent throughout, including in the text and I love that I got an
> achievement for reloading my game.
>
> I didn't really understand the story. It seemed very disjointed, with overexplained details that
> appeared irrelevant. I enjoyed the intro but don't feel like the AI is currently doing justice to
> whatever documentation you have. The combat was a bit of a jump scare lol. I clicked on the prompt
> to continue the story and it flashed to the combat, which confused me for a moment. The combat
> itself isn't very intuitive right now. Wherever the design goes, you should definitely add a
> tutorial explaining the basics of the buttons and the layout. Overall, the confusing layout was
> the first thing that caught my attention. I think you have too much information on the screen at
> once. It might be better to hide some elements in menus or even sub menus honestly.

### 총평

칭찬(비주얼·아트 디렉션·테마 일관성·리로드 업적 ⚪)과 별개로, 비판 4건이 전부 한 주제로 수렴:
**시스템 깊이가 아니라 "첫 세션 이해가능성"이 병목**. 테스터 본인이 "your systems work looks
complex"라고 깊이는 감지했으나 파싱하지 못함. → CBT 우선순위는 콘텐츠 추가보다 온보딩/전달.

### 항목별 진단

| # | 지적 | 상태 | 진단 · 조치 |
|---|------|------|-------------|
| 1 | 스토리 disjointed, 무관한 디테일 과설명 ("AI not doing justice to your documentation") | 🟡 | 원인 유력: 당시 빌드의 `MAX_PROMPT_NOTES=8` 잘림 버그 — 시네마틱 레지스터·인과율·언어 규칙이 프롬프트에서 문자 그대로 탈락하던 시기(2026-07-04 수정, PROGRESS_LOG). "무관한 과설명·단절"은 정확히 그 규칙들이 막는 실패 모드. 이후 3.5 전환 + 장면 길이 타깃 + 다이어트 적용. **남은 일: 현재 스택에서 EN 새 루프 재검** (사인오프 플레이와 겸행) — 그 전까지 닫힌 것 아님. |
| 2 | 전투 = jump scare (스토리 선택 클릭 → 즉시 전투 화면) | 🔴 | 보스전만 빌드업 비트(`_pending_boss_combat`) 보유; 일반/ambient 전투는 전환 신호 없음. 전투 *후* 콜백은 있으나 *전* 텔레그래프 부재. 조치 후보: ① 전투 유발 선택지에 위험 배지(기존 "Predicted change" 줄 활용) ② 전투 진입 1비트 전환 연출(조우 서사 → 전투) ③ 보스 빌드업의 경량 일반화. |
| 3 | 전투 튜토리얼 부재 (버튼·레이아웃 기본 설명) | 🔴 | 보드 legend/타일 인스펙터/학습목표 배너는 "참조"지 "가르침"이 아님. 조치 후보: 첫 전투 1회성 인터랙티브 오버레이(이동→공격→스킬→방어 4스텝, localStorage 1회 표시). |
| 4 | 화면 정보 과다 — 메뉴/서브메뉴로 숨겨라 | 🔴 | 첫 턴부터 스토리+캐릭터 패널+작전지도+게이지 5종+세이브/로드+DEV LOG 동시 노출(QA 스크린샷 확증). 전면 메뉴화는 StS식 계획-가시성 원칙과 충돌 → **첫 루프 점진 공개**가 방향: 턴 0-2는 스토리·선택지·게이지만, 지도는 첫 route 선택 시, 캐릭터 패널은 첫 아이템/스탯 이벤트 시 공개, DEV LOG 기본 접힘. |
| 5 | 인트로 재미있었음 · 비주얼/테마/업적 칭찬 | ⚪ | 오프닝 5컷 + 아트 디렉션 검증. 유지. |

### 파생 조치

- **재검 (선행)**: 현재 3.5+다이어트 스택 EN 새 루프 — #1의 잔존량 확정 후 프롬프트 추가 작업 판단.
- **CBT 온보딩 P1 후보 (코드 트랙, objective UI → `[auto]`+AGY 스크리닝 가능)**: #2 전투 텔레그래프 ·
  #3 첫 전투 튜토리얼 오버레이 · #4 점진 공개. → `docs/NEXT_PLAN.md` 시드 참조.
- **회신 (사람 몫)**: 감사 + "스토리 엔진은 모델 교체(2.5→3.5)+버그 수정으로 크게 바뀜, 다음 빌드
  재테스트 요청". 도움 제안은 다음 라운드 테스터 유지로 수용.
