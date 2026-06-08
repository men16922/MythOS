# Progress Log

최종 갱신: 2026-06-08

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-08 — live LLM 장기 세션 기술 QA (P0)

- in-process 장기 세션 드라이버 작성(인메모리 스토어 + 실제 Ollama `NarrativeDirector`, Postgres/Docker 불필요)로
  사람-플레이 체크리스트가 못 잡는 **기술적 실패 모드**(멈춤/반복/선택지 없음/예외)를 자동 검증.
  gemma4로 neo-seoul 14턴(내러티브 9 생성 + 전투 4회) 실행.
- **양호**: 9회 LLM 생성 동안 파싱/repair 예외 0건, 내러티브 장면마다 선택지 3개 상존, 전투 종료 후
  내러티브 재개(`choose(action=...)`) 정상, 무한 멈춤 없음, 패배 시 루프 종료 처리 정상.
- **발견 F1(반복, 중)**: 위치가 안 바뀌면(같은 계단참) "오존 냄새/전력선 열기/교전 잔열" 도입부 감각
  묘사를 T4–T8에 걸쳐 반복. 세션 시놉시스에 반복 금지 지침+직전 원문이 주입되는데도 gemma4가 약하게 준수
  → 프롬프트 강화(위치 불변 시 배경 재묘사 금지·바로 새 전개) 후보. 효과는 모델 의존적, live 재검증 필요.
- **발견 F2(전투 빈도, 중)**: 9 내러티브 장면에 전투 4회, 시작부 T2→T3 연속. tension 20→46 누적. 추격
  서사로 프레이밍되나 빈도/연속이 QA §5 "초반 강제 전투 반복" 리스크에 근접. 단 그리디 봇이라 체감은 Live QA.
- 자동 검증 한계: 주관 항목(선택의 맛/캐릭터 존재감/엔딩 잔향)은 `docs/neo_seoul_live_qa.md` 사람 플레이 필요.
- **F1 수정 + live 재검증**: `build_session_synopsis` 반복 억제 지침 강화(도입부 배경 재묘사 금지 + 최근
  비트 location 동일 시 추가 지침). gemma4 14턴 재실행 결과 반복 탐지 0건, 이야기가 정전구역→네온
  끝자락→데이터 포트→시스템 접속→중앙 콘솔로 전진하고 도입부도 매번 달라짐(이전 런의 T4–T8 정체 해소).
  단일 런·LLM 비결정성이라 라우트 진행 차이의 기여 격리는 불가하나 회귀 없이 분명한 개선. 회귀 테스트 2건.
- 잔여: F2 전투 빈도 튜닝(이번 런 14턴 3전투로 양호했으나 변동성 있음), phase가 explore에 머무는지 점검(설계상 주 phase 추정).

## 2026-06-07 — 조우 난이도 튜닝 (P1)

- 조우별 학습 목표에 맞춰 적 수치 재조정. `build_encounter`에 per-spawn `overrides`(bestiary 위 shallow merge) 추가 — 한 bestiary 원형이 조우별 다른 역할(취약 킬-퍼스트 vs 견고 미끼)을 하도록 fork 없이 데이터 주도 조정.
  - `sentinel_checkpoint`(target priority): sentinel_drone hp14→11(취약 원거리 위협, "먼저 처치") + maintenance_drone hp12→16·def13→14(견고한 근접 미끼) override.
  - `enforcer_standoff`(armor_pen/timing): enforcer armor 3→4 — 비-armor_pen 타격이 더 깎여 kai 과부하 일격/방어·회복 타이밍이 중요.
  - `wraith_glitch`(기동/미스터리): def16→17·speed5→6으로 명중/기동 도구(packet_shot·signal_step) 요구, hp18 유지(추격이 의미를 갖게).
  - `patrol_ambush`(튜토리얼): 2 약체 드론 유지.
- 헤드리스 그리디 시뮬(파티 3인, 60회): 승률 patrol97%/sentinel98%/wraith97%/enforcer95%, avg_round 2.5/3.5/2.7/3.8 — 튜토리얼 최단·boss 최장으로 난이도 곡선 정렬. 실제 체감은 Live QA.
- Verified: `make test` 264/2 skip(override merge 회귀 테스트 + start_combat encounter 어서션 포함).

## 2026-06-07 — Tactical Board 타일 인스펙터 + 학습 목표 배너 (P1)

- 라이브 피드백 "보드 의미 파악" 후속 2차. 두 가지 추가:
  - **타일 인스펙터**: 보드 위 포인터가 가리키는 셀의 좌표/점유 유닛(HP·진영)/엄호/고지/위험/적 의도/이동 가능 여부를 좌측 열에 표시(`TileInspector`). 기존 `combatCellFromPoint`/드래그 핸들러 재사용 — 비드래그 hover 시에만 `combatInspectCell` 갱신(셀 변경 시에만 setState로 리렌더 churn 방지), pointerleave에서 해제. in-bounds 클램프.
  - **학습 목표 배너**: 전투 시작 시 `encounter.learning_goal`(+이름)을 보드 상단에 1줄 노출, encounter별 dismiss(`key`로 리셋). 백엔드: `_encounter_meta`(id/name/learning_goal)를 두 combat snapshot 경로(`_commit_combat_scene`/`_combat_snapshot`)에 주입 → API serializer가 dict 그대로 통과.
- Verified: `make test` 263/2 skip(신규 어서션 포함), `make frontend-lint`/`frontend-build` green.
- Next(Tactical Board 잔여): 보드 확대/반응형(zoom/pan). 타일 인스펙터는 hover 기반 — 터치 환경 click 핀 고정은 후속 검토.

## 2026-06-07 — Tactical Board 범례 (P1)

- 라이브 피드백 "보드의 cover/hazard/elevation/intent 의미를 모름" 해소 1차. `StoryPanel`에 `TacticalLegend` 추가 — 보드에 실제 존재하는 요소만 동적 표시(적 의도 ⚔️/🏃/👣, 엄호 강/약, 산성/전자 지대, 고지). `index.css` `.tactical-legend*`. 캔버스는 이미 해당 요소를 렌더 중이라 설명만 보강.
- Verified: `make frontend-lint`/`frontend-build`, `make test-e2e` green.
- Next(Tactical Board 잔여): 타일 hover/click 인스펙터(좌표/지형/효과/점유/위험), 전투 시작 시 학습 목표 배너(`encounter.learning_goal` plumbing 필요), 보드 확대/반응형.

## 2026-06-07 — 절차 생성 작전 지도(route-node) + 세션 메모리 + 자산/버그픽스

P1 "작전 지도 노드 루트화"를 Slay-the-Spire식 **결정적 절차 생성 + 다중 관점 anchor** 하이브리드로
구현(Step 1~2b-4). 설계: `docs/plans/2026-06-07-route-node-procedural-map.md`. 단계별 상세는 archive.

- **생성/구조**: `route_map.py` — 루프 시드 결정적 layered DAG(golden_path 6막). anchor=사전 저작 임팩트 비트(큐레이트 이미지/이벤트 + 다중 관점), 그 사이는 동적 pool 노드. 전투 회피/감수 경로 불변식. `scenario.json.route_map`(node_types 8 + layers + `combat_encounters`), `state["_route_map"]` 직렬화, 작전 지도 노드 그래프 뷰(`GameAside`).
- **다중 관점 anchor**: 같은 임팩트 장면을 사람/증거/안전/통제 축의 여러 시점(lens)으로 — `when`(루트 flag)으로 분기, `crosses`(교차 스토리), `effect`(세션 영향), `ending_influence`(엔딩 도출). boss 4관점=4엔딩 커버.
- **라이브 진행**: `route_runtime.py` — 턴 전진 + 누적 flag로 관점 선택 + 효과 flag 적용 + ending_leaderboard 누계(게이지는 엔진/보상 소유 유지). UI에 활성 시점·예상 결말 표시.
- **director 통합**: `_route_director_notes`(현재 노드·관점·crosses·향하는 결말을 GM에 주입), `_route_junction_notes`(갈림길 유도). **edge=선택지 바인딩** — 레이어 경계 junction에서 다음 노드 선택지(`junction_options`/`route:` choice/`preferred_next`). **combat 노드 전투 트리거**(`node_encounter_id`→`next_combat`).
- **세션 메모리(RAG 아님)**: `session_memory.py` — `loops.state` JSONB에 `_beats` 압축 원장 + `_recent_narration` 직전 장면 창, 매 턴 결정적 롤링 시놉시스("지금까지의 이야기")를 컨텍스트 주입 → 장면 연속성/반복 방지. cross-loop/희소 연상이 필요해질 때만 키 기반 SQL→FTS→pgvector 검토(현재 불필요).
- **자산**: anchor 장면 5종 = 사용자 Imagen 고품질본을 `scenes/<beat>.png`로 채택(+`opening_escape_alt`). 캐릭터 포트레이트 3종 교체(`player-noise`/`kai`/`administrator-ix`) — 기존 참조 경로 그대로(코드 변경 불필요), 전투 시트와 화풍 일관 확인. 이미지 프롬프트/경로: `docs/scenarios/neo-seoul-anchor-image-prompts.md`.
- **버그픽스**: `generator.py` — IP-Adapter 미사용 txt2img 경로가 `hasattr`만 보고 `set_ip_adapter_scale(0.0)` 호출 → `encoder_hid_proj` 부재로 크래시(참조 이미지 없는 모든 생성 실패). 어댑터 실제 로드 시에만 호출하도록 가드.
- **노드 보상/effect 통합 + 회복 루프**(2b): 노드 신규 진입 시 1회(`_route_map.applied_rewards` 추적) — 비전투 노드 reward + 활성 anchor 관점 `effect`의 stability/tension/insight를 루프에 적용(`_apply_route_node_reward`, 게이지 클램프·insight는 meta progression, combat 노드는 encounter가 자체 보상하므로 제외). rest/market 노드는 `reward.heal_frac`로 `_party` HP 회복(`_heal_party`, rest=full/market=0.4) → "매 전투 풀피 시작" 해소. "선택→flag/엔딩"에 더해 "선택→게이지/HP"까지 닫힘.
- Verified: `make test` 263 / 2 skipped, `make frontend-lint`/`frontend-build`. fallback 통합: rest 노드 진입 시 HP 2→full·stability +8 1회 적용 확인. (e2e는 Docker/Postgres 기동 필요 — 미기동 환경에선 DB 500; 코드 무관.)
- 동적 노드 title 다양화: `node_types[].titles` 풀에서 비-anchor 노드 title을 시드 결정적 선택(`route_map.py`) → junction 선택지가 "정비 거점·정비"처럼 구체화(anchor는 저작 title 유지). e2e green(Postgres 기동 후 재확인).
- `_map` 제거는 보류: engine이 매 장면 기록 + encounter_map(좌표)·story_bible(위치)·glass-library 폴백 미니맵 의존 → route-node 트랙 사실상 완료, 전 시나리오 route_map 전환 후 별도 정리. **회복 후속: 소모품/전리품 인벤토리 가시화.**

## 2026-06-07 — Neo-Seoul Live Feedback Triage + 즉시 UX 수정

- 라이브 피드백을 P0/P1/P2 분류(`docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`). 오프닝 수락 시 BGM 재시도, Story 탭 복귀 시 combat canvas 재렌더, 작전 지도/상태 HUD 설명 보강, Neo-Seoul 고유명사 표기 규칙(`scenario_context`). BGM/세린 표기는 이후 사용자 확인 완료.

## 2026-06-07 — Neo-Seoul P0: Insight Reward + Forced Ambient Combat 완화

- `encounter_reward.insight`를 meta progression 통찰로 즉시 반영, 전투 결과 패널에 보상(통찰/안정/추적/전리품) 표시. 명시 요청 없는 초반 ambient 강제 전투 off(high tension/low stability에서만). 조우별 보상 기준값 갱신.

## 2026-06-07 — Planning Pivot: Neo-Seoul Playability 우선

- Neo-Seoul을 30-60분 만족 플레이 시나리오로 끌어올리는 5단계 계획(`docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`). Golden Path/QA rubric(`docs/scenarios/01-neo-seoul-connect.md` §5.5), Story Bible 24 entries, playability 메타(choice axes/route branches/ending echo), 조우 learning_goal/reward_intent 추가.
