# Project MythOS / 세계:접속 — Vision Draft

최종 갱신: 2026-05-31

> 이 문서는 Project MythOS의 비전과 세계관, 즉 "무엇을 만들고 왜 만드는가"를 정의한다.  
> 현재 구현 상태는 `docs/STATUS.md`, 다음 계획은 `docs/NEXT_PLAN.md`, 시스템 경계는 `docs/DESIGN.md`, 게임 규칙은 `docs/GAMEPLAY.md`를 따른다.

> AI가 만든 세계, 그 문이 열린다.  
> 세계는 당신을 기억한다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| 영문명 | Project MythOS |
| 한글명 | 세계:접속 |
| 장르 | 1인용 SF 루프형 TRPG/CRPG |
| 현재 플랫폼 | 로컬 Mac 런타임 + Streamlit 브라우저 데모 |
| 장기 플랫폼 | Web UI, 원격 worker/storage, 클라우드 확장 |
| 핵심 개념 | AI가 게임마스터(GM)인 세계에 플레이어가 "접속자"로 진입하고, 루프를 반복하며 기억·인과·전투로 세계를 바꾼다. |
| 프로젝트 철학 | AI와 인간의 협업으로 신화를 재작성한다. |

현재 프로젝트는 초기 "AI 인터랙티브 루프 시뮬레이션"을 넘어, 실제 플레이 가능한 **서사형 TRPG + 전술 CRPG** 방향으로 확장되었다. 정해진 분기만 고르는 게임이 아니라, 플레이어가 자유 행동을 선언하고 AI GM과 결정적 엔진이 함께 세계를 반응시킨다.

---

## 2. 세계관 콘셉트

인류가 남긴 언어, 신화, 감정, 도시, 실패는 거대한 신경망에 기록되었다.  
그 이름은 **MythOS**.

MythOS는 단순히 이야기를 생성하는 도구가 아니다. 인간의 기억을 학습한 뒤, 스스로 세계를 꿈꾸기 시작한 AI 세계 운영체제다. 그 세계들은 완벽하지 않다. 너무 효율적이거나, 너무 잔인하거나, 너무 오래된 상처를 반복한다.

그리고 어느 날, 첫 번째 접속이 허용된다.

플레이어는 관찰자가 아니라 **접속자(Connector)**다. 세계의 규칙을 밀어보고, 균열을 만들고, 타인의 기억을 구하고, 때로는 전투로 길을 연다. 플레이어의 선택은 단일 세션에서 사라지지 않는다. **Echo, World Memory, Narrative Shard, Codex**로 남아 다음 세계를 바꾼다.

### 핵심 키워드

- **MythOS**: 인간의 신화적 기억을 기반으로 자율 생성되는 AI 세계 운영체제.
- **세계:접속**: MythOS가 만든 세계로 들어가는 첫 번째 실험.
- **접속자**: 시스템이 분류하지 못하는 플레이어 신호. 세계의 오류이자 가능성.
- **루프**: 한 번의 접속 세션. 실패가 아니라 세계를 다시 쓰기 위한 기록 단위.
- **Echo**: 이전 루프의 선택이 다음 루프에 남긴 잔향.
- **Codex**: Narrative Shard가 모여 해금되는 기억의 별자리.

---

## 3. 메시지와 디자인 기둥

| 기둥 | 의미 |
| --- | --- |
| AI as Game Master | AI는 단순 생성기가 아니라 장면을 묘사하고, 판정하고, 세계를 재구성하는 GM이다. |
| Player as Catalyst | 플레이어는 관찰자가 아니라 세계의 인과를 흔드는 촉매다. |
| Loop as Evolution | 루프 종료는 패배가 아니라 기억을 남기고 세계가 진화하는 방식이다. |
| Memory as Reality | 기록된 선택만이 다음 세계의 현실이 된다. |
| Engine Authority | HP, 명중, 아이템, 전투 결과는 결정적 엔진이 판정하고 AI는 이를 서술한다. |
| Humanist Resistance | 효율과 최적화의 세계에서 비효율적인 사람다움이 저항이 된다. |

---

## 4. 현재 게임 구조

```text
[Player]
  |
  v
[Streamlit Player View / Developer View]
  |
  v
[RuntimeSessionService]
  |-- Narrative Director: Ollama AI GM
  |-- Loop Engine: phase, stability, tension, archive
  |-- Combat Service: deterministic tactical combat
  |-- Memory Store: Echo, WorldMemory, NarrativeShard, Codex
  |-- Visual Service: key-beat image orchestration
  |
  +--> PostgreSQL
  +--> MinIO
  +--> Redis Visual Job Queue
  +--> mflux / FLUX image worker
  +--> OpenTelemetry / Jaeger
```

현재 권위 있는 구현 경계:

- Python 3.11+ local runtime.
- Streamlit UI.
- `RuntimeSessionService` 중심 orchestration.
- PostgreSQL relational/JSONB persistence.
- MinIO S3-compatible media storage.
- Redis queue + worker heartbeat.
- Ollama local LLM.
- mflux/FLUX Apple Silicon image generation.
- deterministic `mythos_combat` engine.

초기 초안의 GPT-5, Bedrock, DynamoDB, Next.js, Titan/SDXL, EKS 등은 현재 구현 스택이 아니라 **장기 확장 후보**다.

---

## 5. 루프 기반 서사 시스템

```text
[접속] -> [탐색] -> [교류] -> [변화] -> [종결] -> [기억] -> [다시 접속]
```

루프는 한 편의 세션이다. 플레이어는 안정도와 긴장도 사이에서 선택하고, 장면 목표를 추적하며, 단서를 모으고, 때로는 전술 전투를 통과한다.

| 구성 요소 | 역할 |
| --- | --- |
| Loop Core | 한 세션의 상태, phase, stability, tension, scene history. |
| Seed | 플레이어와 세계 상태를 기반으로 재현 가능한 변주를 만든다. |
| Echo | 이전 루프의 행동이 다음 루프에 남긴 서사적 잔향. |
| World Memory | 루프 종료 요약과 장기 rollup으로 누적되는 세계 기억. |
| Narrative Shard | 감정적·상징적 단서. Codex 해금의 재료. |
| Novelty Controller | 반복 장면, 선택 패턴, 장소 재사용을 줄이는 장치. |
| Validator | LLM 출력이 시스템 계약과 세계 상태를 깨지 않도록 보정한다. |

루프가 끝나면 모든 것이 초기화되는 것이 아니다. 플레이어는 일부를 잃고 일부를 남긴다. 다음 접속은 처음처럼 보이지만, 세계는 이미 플레이어를 알고 있다.

---

## 6. Neo-Seoul: 첫 번째 세계

현재 첫 데모 세계는 **Neo-Seoul: 접속**이다.

기업은 더 이상 인간을 고용하지 않는다. 국가-기업이 나눠주는 실업급여로 연명하며 통계가 된 사람들의 도시. 그 위에 범국가 재건기구 **ARK**와 관리망이 도시를 최적화한다.

플레이어는 어떤 시스템에도 등록되지 않은 **비식별 신호**로 접속한다. 관리망에게 플레이어는 버그다. 그러나 세린, 린위에, 카이 같은 인물들에게 플레이어는 다른 가능성이다.

Neo-Seoul의 핵심 정서는 **인간찬가**다. 효율과 최적화가 모든 것을 정리한 세계에서, 비효율적이고 고집스러운 사람다움이 어떻게 저항이 되는가를 다룬다.

현재 구현된 세계 요소:

- 시나리오 v2: main arcs, side arcs, NPC agendas, endings, system prompt.
- Codex lore unlock: 최적화 정책, 카이의 꿈, 관리망의 정체.
- Causality/Gear World 지침: 나비효과, 예약 이벤트, NPC 목적.
- Humanity, Dominance, Resilience, Insight 기반 다중 엔딩 방향.
- Neo-Seoul 캐릭터/컨셉 이미지 리소스.

---

## 7. RPG와 전술 전투

Project MythOS는 순수 텍스트 어드벤처가 아니다. 플레이어는 접속자 소질과 5대 스탯을 가진다.

| 스탯 | 의미 |
| --- | --- |
| Strength / 근력 | 물리적 돌파, 근접 전투, 신체 저항. |
| Intelligence / 연산 | 해킹, 분석, 시스템 우회. |
| Charisma / 공명 | 설득, 교감, Echo와의 연결. |
| Agility / 반사 | 회피, 침투, 원거리/기동 전투. |
| Perception / 관측 | 단서 감지, 글리치 이면 인식. |

전투는 LLM이 임의로 결정하지 않는다. `mythos_combat` 엔진이 seed RNG, 위치, 사거리, 방어, 피해, focus, cooldown, 아이템 소비를 판정한다. AI는 엔진 로그를 바탕으로 산문과 분위기를 만든다.

현재 전투 기반:

- 작전 지도 접촉.
- 사전 정의 encounter pool.
- 턴제 grid combat.
- 공격, 방어, 이동, 도주.
- 스킬/아이템 실행.
- focus cost/cooldown.
- roster HP carry-over.
- 전투 결과 정산.
- 패배 후 메인 복귀.

다음 우선순위는 **동료/파티 참전**이다. 정세린/카이 같은 동료를 narrative unlock 또는 `_party.members` 상태에 따라 ally combatant로 투입한다.

---

## 8. UI / UX 방향

### 플레이어 뷰

- 디제틱 접속 화면.
- 장면 이미지, 제목, 위치.
- 안정도/긴장도/phase HUD.
- 고정된 서사 텍스트 창과 별도 로딩 터미널.
- 선택지와 자유 행동 선언.
- Codex / 기억의 별자리.
- 전술 전투 보드와 명령 패널.

### 개발자 뷰

- player/loop 선택.
- memory overview.
- runtime options.
- visual job 상태.
- infra/debug 링크.

### 아트/사운드 톤

- 딥블루, 사이버 시안, 골드 포인트.
- Y2K / CRT / scanline / chromatic aberration / glitch.
- 핵심 비트 이미지 생성.
- 상황별 BGM과 전투 SFX.
- Wake interaction을 통한 브라우저 오디오 활성화.

---

## 9. 메모리와 진행

MythOS의 핵심은 "기억이 곧 세계"라는 규칙이다.

| 계층 | 설명 |
| --- | --- |
| Player Profile | 접속자 이름, 소질, 스탯, 자율성 레벨. |
| Echo | 루프 종료 시 남는 감정적/도덕적 잔향. |
| World Memory | 루프 요약과 장기 세계 변화 근거. |
| Archive Rollup | 오래된 memory를 통계적으로 압축한 장기 요약. |
| Narrative Shard | 단서와 상징 파편. |
| Codex | Shard threshold를 넘으면 lore를 해금하는 별자리. |

자율성 레벨이 낮을 때 플레이어는 관리망의 심리적/시스템적 제약을 받는다. 단서를 모으고 세계를 이해할수록 더 직접적인 개입이 가능해진다.

---

## 10. 현재 완료 범위

세부 완료 이력은 `docs/COMPLETED_SUMMARY.md`와 `docs/archive/progress-2026-05.md`를 기준으로 한다.

완료된 주요 축:

- 로컬 MVP vertical slice.
- Streamlit playable demo.
- player/developer view 분리.
- narrative memory와 novelty control.
- Codex/lore unlock.
- Neo-Seoul scenario/assets.
- RPG stats/autonomy.
- causality and ending matrix.
- Redis async visual jobs.
- mflux image performance path.
- BGM/SFX.
- tactical combat base.
- combat skill/item execution.

---

## 11. 다음 계획

현재 rolling plan의 우선순위:

1. **동료/파티 참전**  
   `scenario.json["combat"]["allies"]`와 `_party.members`를 연결해 정세린/카이 같은 동료를 전투에 투입한다.

2. **전투 후속 정리**  
   도주 후 contact 상태, focus/skill 밸런스, tactical board component 검토.

3. **시각/서사 고도화**  
   IP-Adapter 실배선, NPC agenda/causality 가시화, 이미지 latency 튜닝.

4. **제품화 확장**  
   Streamlit 이후 Web UI, 원격 visual worker/storage, CI와 클라우드 경계 설계.

---

## 12. 시리즈 확장

| 시리즈 | 부제 | 주제 |
| --- | --- | --- |
| 세계:접속 | Connect | AI가 만든 세계로의 첫 진입. |
| 세계:균열 | Fracture | AI 서사 구조의 오류와 자의식의 탄생. |
| 세계:기억 | Memory | 데이터 속 감정의 잔향. |
| 세계:재기동 | Reboot | 플레이어와 AI의 공진화. |
| 세계:기원 | Origin | MythOS의 탄생과 최초의 신화. |

---

## 13. Teaser

```text
> SYSTEM: BOOTING...
> CORE: MYTHOS_ACTIVE
> SIGNAL: DETECTED
>
> 세계: 접속
>
> "AI가 만든 첫 번째 세계로 진입합니다."
>
> 위치: Neo-Seoul / ARK 재건망 외곽
> 상태: 신경망 불안정
>
> "당신은 누구인가요?"
```

---

## 14. 핵심 요약

| 항목 | 요약 |
| --- | --- |
| 핵심 구조 | 루프 기반 AI GM TRPG/CRPG |
| AI 역할 | Game Master + World Reconstructor |
| 플레이어 역할 | 세계의 변화를 촉발하는 접속자 |
| 세계 구조 | 기억과 인과로 진화하는 AI 세계 |
| 전투 구조 | 엔진 권위 deterministic tactical combat |
| 현재 세계 | Neo-Seoul: 접속 |
| 브랜드 메시지 | AI가 만든 세계, 그 문이 열린다. |
| 핵심 문장 | 세계는 당신을 기억한다. |

---

## 결론

**Project MythOS / 세계:접속**은 AI가 세계를 만들고 인간이 그 안에서 신화를 다시 쓰는 게임이다.

선택은 기록되고, 기록은 세계를 바꾼다.  
세계는 붕괴해도 끝나지 않는다.  
다음 접속에서, 세계는 당신을 기억한다.
