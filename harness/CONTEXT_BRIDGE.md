# Agent Context Bridge

이 파일은 에이전트 간 작업 맥락을 전달하는 '하네스'의 핵심 연결고리입니다. 다음 작업자가 현재 빌드된 상태를 기반으로 이어서 개발을 가동할 수 있도록 최신화되었습니다.

## 🟢 현재 활성 작업 (Active Context)

*   **주제**: RPG 로그라이크 전술 전투 시스템 및 Streamlit UI 통합.
*   **상태**: **전술 보드(Tactical Board)의 드래그 앤 드롭 캐릭터 조작 완료 및 칩튠 효과음/BGM 분기 시스템 구축 완료.**
    *   **Independent iframe Sandbox**: `st.components.v1.html` 기반으로 전술 보드를 iframe 내부에 완전 렌더링하여 JS 이벤트와 드래그 앤 드롭 완벽 처리.
    *   **Drag & Drop Glow UX**: 캐릭터 썸네일을 직접 끌어다 이동 가능 타일에 놓으면 실시간 이동 연출 및 네온 맥박 글로잉 효과(`@keyframes neon-glow-pulse`) 적용.
    *   **Offline Audio Synthesis**: `scripts/generate_sfx_resources.py`를 구현해 transformers 없이 numpy/scipy만을 사용해 6종의 고품질 칩튠 효과음(WAV) 및 8비트 사이버 루프 테크노 전투 BGM 3종을 1초 만에 완전 로컬 빌드 성공.
    *   **Dynamic Combat BGM Scoping**: `audio_service.py` 내부에서 전투 활성화를 감지하고, 보스급 조우 시 `bgm_combat_boss.wav` 재생, 아군 HP 위독 위기 상태(최대 HP의 35% 이하) 시 `bgm_combat_crisis.wav` 재생, 일반 전투 시 `bgm_combat_normal.wav`로 동적 BGM 스위칭 완비.
    *   **One-shot SFX Injection**: 이동(드롭/클릭), 공격(공격 버튼), 방어(방어 버튼), 도주(도주 버튼), 전투 종료 승리/패배(최초 1회) 시점에 `play_sfx` 상태를 지정하고 Rerun 시 중복 재생 차단용 플래그 락을 UI에 완벽히 적용.
*   **검증(exit code)**: `make lint` 0 · `make typecheck` 0 · `make test` 0 (110 tests, 2 skipped) PASS. 로컬 BGM/SFX 사운드 출력 완벽 검증.

---

## 🟡 다음 에이전트 가이드 (Handover)

다음 단계로 아래 로그라이크 CRPG 시스템의 심화 구현을 제안합니다.

1.  **전투 스킬 및 소비 아이템의 엔진 실배선**:
    *   `PlayerAction(type="skill" | "item")` 액션 타입을 실제 전투 루프 로직에 연결.
    *   `scenario.json`에 정의된 액티브 스킬 풀(신호 도약, 과부하 일격, 패키지 패치 등)의 Cooldown/Cost 및 `nanopatch`, `stim_shard` 아이템 효과 연동.
2.  **동료/파티 참전**:
    *   `scenario.json["combat"]["allies"]`에 명시된 아군 NPC(정세린, 카이 등)를 아군 전투원(Ally Combatant)으로 전술 보드에 소환하고 참전시키는 구조 배선.
3.  **인과율/NPC 아젠다 Codex 가시화**:
    *   예약된 미래 이벤트, NPC들의 숨겨진 목적과 나비효과 경로를 Codex나 Developer 뷰에 노출.

---

## 🔴 위험 요소 및 미결 사항 (Open Issues)

*   **mflux 추론 온디맨드 딜레이**:
    *   Apple Silicon MPS(mflux) 8bit 백엔드가 도입되어 diffusers 대비 20배 빠르지만(512x512, 4steps 기준 약 8초), 첫 장면 생성 시의 가중치 로드 캐싱 오버헤드가 있으므로 비동기 Redis visual queue의 worker 기동 로그 관측이 필요합니다.
*   **IP-Adapter 실배선**:
    *   정세린, 카이 등 주역 캐릭터들의 Portrait 얼굴-ID를 FLUX 장면 전체에 지속 고정하기 위한 IP-Adapter 도입 검토 및 가중치 다운로드 병목 체크 필요.
