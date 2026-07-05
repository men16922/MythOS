# MythOS 보이스 프로덕션 가이드 (ElevenLabs eleven_v3)

작성: 2026-07-05 · 대상: 오프닝/컷신/엔딩 큐레이션 보이스 (G6 1단계, `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`)
소스: ElevenLabs 공식 Best Practices/v3 Audio Tags 문서 (하단 참조).

## 0. 파이프라인 한눈에

1. **오디션**: `scripts/voice-gen/audition.py` → `outputs/voice-auditions/{ko,en}/<role>/<Voice>.mp3`
2. **핀 고정**: 듣고 `resources/<scenario>/audio/voice/voices.json`의 `voice_id` 채움 (역할당 1개, KO/EN 공용)
3. **배치 생성**: (다음 단계 도구) voices.json + 대사 스크립트 → 정적 mp3 에셋
4. **QA**: 사람 귀 검수 후 커밋 — 음성은 생성물이지만 채택본은 git 추적 (아이콘 아트와 동일 정책)

## 1. 모델/설정 규칙

- **모델**: `eleven_v3` 고정 (74개 언어, KO 포함).
- **언어별 캐스팅 분리 (2026-07-05 확정)**: KO는 **한국어 네이티브 보이스만** (공유 라이브러리 language=ko
  검색 → 계정에 `KO-*`로 추가), EN은 영어 네이티브 프리메이드 — 역할당 ko/en 각 1개 voice_id를 핀.
  영어 보이스에 한국어를 시키는 캐스팅 금지 (억양 리스크; IX 같은 '합성 존재' 컨셉도 KO 네이티브의
  cold 톤으로 해결).
- **Stability**: 오디션·비교는 **Natural(0.5)** (목소리 자체를 공정 비교). 최종 연출 컷은 감정 폭이 필요하면
  **Creative(0.0)** 시도하되 환각(어색한 발화) 위험 → 반드시 재생성 여지. Robust(1.0)는 태그 반응이 죽으므로 금지.
- **프롬프트 길이**: 250자 이상 권장 (짧으면 출력 불안정). 오디션 라인도 이 기준으로 작성.
- **SSML break 미지원** — 포즈는 태그·문장부호(… 말줄임)·문단 구조로.

## 2. 오디오 태그 규칙 (v3 감정 지시)

- 대괄호 태그가 **그 지점 이후의 전달**을 지시: `[whispers]`, `[sighs]`, `[excited]`, `[nervous]`,
  `[sarcastic]`, `[curious]`, `[laughs]`, `[crying]`, `[flatly]`, `[playfully]`, `[pauses]` 등.
- **과태깅 금지**: 감정이 실제로 바뀌는 지점에만. 문장마다 붙이면 오히려 불안정.
- **보이스 베이스라인과 태그를 맞출 것**: 속삭이는 톤의 보이스에 `[shout]`는 안 먹힘 — 역할과 반대 성향의
  보이스를 태그로 교정하려 하지 말고 보이스를 바꿀 것.
- 강조는 대문자(EN)/문장부호, 무게는 말줄임(…). 예: `"It was a VERY long day [sighs] … nobody listens."`
- 실험 태그(`[strong korean accent]`, `[sings]` 등)는 보이스별 편차 큼 — 채택 전 개별 테스트 필수.

## 3. 보이스 선정 기준 (역할 프로필)

원칙: **성별·연령·에너지 베이스라인이 역할과 일치**하는 보이스를 고르고, 감정 변주는 태그로.
중립적(neutral) 베이스라인 보이스가 언어 간(KO/EN) 가장 안정적 — 한국어 발음 억양은 반드시 KO 샘플로 귀 검증.

| 역할 | 성별/연령 | 베이스라인 | 대표 감정 태그 |
|---|---|---|---|
| 세린 (se_rin) | 여/20대 | 단단함+온기, 낮은 긴박 | [urgent] [whispers] [determined] |
| 카이 (kai) | 남/10대말-20대초 | 밝음, 빠름, 취약 | [excited] [nervous] [laughs] |
| 린위에 (lin_yue) | 여/20-30대 | 서늘, 허스키, 여유 | [sarcastic] [mischievously] [flatly] |
| 한 (han) | 남/20대 | 잽싸고 건들거림 | [playfully] [curious] |
| 수아 (su_ah) | 여/10대말-20대초 | 톡톡 튐, 예리 | [playfully] [excited] [deadpan] |
| 태오 (tae_o) | 남/40대+ | 낮고 거침, 절제 | [sighs] [resigned tone] [pauses] |
| IX (ix) | 중성/합성 | 무감정, 권위 | [flatly] — 태그 최소가 오히려 섬뜩함 |
| 나레이터 | 남 or 중성/중년 | 차분, 시네마틱 | [pauses] … 위주, 감정 태그 절제 |

- KO 후보 풀 (공유 라이브러리에서 추가, 2026-07-05): 세린=Yooni/KeleeK/MonoBeige · 카이=Sanggyu/Minjoon/
  KimChiNam · 린위에=MonoBeige/YuHaon/Esther · 한=Junsung(경상 사투리 러너 톤)/Juan/YongGyu ·
  수아=JY(트렌디)/Totoring/Yooni · 태오=Ethan(40대 중저음)/Dae/Elias · IX=Junjin(cold)/Elias/Dae ·
  나레이터=Jihu/Jaeil/Nara. 부족하면 같은 검색으로 재보강.
- IVC(보이스 클론) 쓸 경우 훈련 샘플에 감정 범위를 넓게 — 단일 톤 클론은 태그 반응이 죽는다.

## 4. 대사 스크립트 작성 규칙 (배치 생성용)

- 라인은 **스토리 바이블 레지스터** 준수 (KO 원문 → EN은 authored 번역, 기계 직역 금지).
- 파일 키: `<scenario>/audio/voice/<lang>/<beat_id>__<role>.mp3` — beat id는 디렉티브의 stable id와 일치
  (오프닝 변주 콘텐츠 셋과 1:1).
- 태그는 스크립트에 인라인로 저장 (재생성 재현성) — 단 자막/화면 텍스트에는 태그 제거본 사용.
- 루프당 음성은 **키비트 한정** (오프닝 컷·컷신·엔딩·보스 텔레그래프) — 전체 서사 음성화는 2단계(동적 TTS) 결정 후.

## 참고 소스

- Best practices: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- v3 Audio Tags: https://elevenlabs.io/blog/eleven-v3-audio-tags-expressing-emotional-context-in-speech
- Audio tags FAQ: https://help.elevenlabs.io/hc/en-us/articles/35869142561297
