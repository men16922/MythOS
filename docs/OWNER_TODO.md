# 오너 할 일

마지막 정리: 2026-10-18

에이전트가 대신할 수 없는 일만 모았다(계정, 결제, 권한, 귀와 눈으로 판단하는 일). 끝낸 항목은 체크하고 에이전트에게 "OO 끝났어"라고 말하면 다음 단계를 이어서 한다. 상세 근거는 `docs/NEXT_PLAN.md`, `docs/play-store.md`.

## 1. Play 스토어 출시 — 보류 (2026-10-18 오너 결정: 유료 출시·Signal+ 보류, 공모전 우선)

다시 진행하기로 하면 아래 순서대로 하면 된다. 그전까지는 할 일 없음.

순서대로. 자세한 입력값은 `docs/play-store.md` "Owner steps".

- [ ] **개발자 계정 만들기** — Play Console, $25, 신원 확인에 며칠 걸린다.
  - 신규 개인 계정은 **테스터 12명 × 14일 연속 비공개 테스트**를 마쳐야 정식 출시 신청이 된다. 테스터 모집을 지금 시작.
- [ ] **연락처 이메일** — `.env`에 `MYTHOS_CONTACT_EMAIL=<이메일>` 추가 후 에이전트에게 배포 요청(미리보기 배포 → 검증 → 승격). 개인정보·계정 삭제 페이지에 이 주소가 표시된다.
- [ ] **로그인 기록 삭제 권한** — 아래 명령을 직접 실행(권한 부여는 에이전트가 못 한다). 없으면 계정 삭제 시 게임 데이터만 지워지고 로그인 기록은 Firebase 콘솔에서 손으로 지워야 한다.
  ```
  ! gcloud projects add-iam-policy-binding <PROJECT_ID> --member=serviceAccount:mythos-run@<PROJECT_ID>.iam.gserviceaccount.com --role=roles/firebaseauth.admin --condition=None
  ```
- [ ] **앱 만들기** — 이름 `세계:접속 — MYTHOS 시그널 런`, 기본 언어 한국어, 게임, 무료. 패키지 `com.projectmythos.signalrun`(첫 업로드 후 못 바꿈).
- [ ] **앱 콘텐츠 입력** — 개인정보처리방침, 앱 접근, 광고 없음, 콘텐츠 등급, 대상 연령, 데이터 보안, 계정 삭제. 답은 `docs/play-store.md`에 준비돼 있다.
- [ ] **스토어 등록 정보** — 준비된 한국어/영어 설명 붙여넣기, 그래픽은 `outputs/play-store/` 업로드.
- [ ] **업로드 키 만들기** — `docs/android.md` "Release (AAB + signing): owner steps". 키 파일과 비밀번호는 저장소 밖에 두고 백업. 만든 뒤 에이전트에게 알려 주면 AAB 빌드·SHA-1 등록을 이어서 한다.

## 2. Signal+ 구독 — 보류 (사업자등록이 필요해서 보류 중)

- [ ] **사업자등록 + 통신판매업 신고** — 인앱 구매(구독)를 파는 한국 개발자는 Play Console '업체 문의 연락처'에 사업자등록번호·통신판매 신고번호·신고 기관을 넣어야 한다(무료 배포만이면 불필요). 홈택스에서 사업자등록 → 정부24에서 통신판매업 신고.
- [ ] **판매자(결제) 프로필** 만들기 — 없으면 구독 상품을 활성화할 수 없다.
- [ ] **구독 상품** — 수익 창출 → 구독 → `signal_plus_monthly`, 기본 요금제 1개, 월 자동 갱신, ₩3,900.
- [ ] **서비스 계정 초대** — 사용자 및 권한 → `mythos-run@<PROJECT_ID>.iam.gserviceaccount.com`, 이 앱에 "재무 데이터 보기" + "주문 및 구독 관리". 서버가 이 계정으로 구매를 확인한다.
- [ ] **라이선스 테스터** 추가 후 기기에서 한 번 구매 → 에이전트에게 알려 주면 서버에서 Signal+로 잡히는지 확인한다.

## 공모전 준비 (2026-10-18)

- [x] **운영 반영(승격)** — 2026-10-20 완료, 운영 주소에서 검증 끝. 되돌리기: `gcloud run services update-traffic mythos-api --to-revisions mythos-api-00138-mez=100 --region us-central1` (2026-10-20 두 번째 승격 `00140-paw` 기준).
- [ ] **재미 판정** — `docs/test/mythos2_fun_check.md`대로 30~40분 플레이하고 정상/문제를 알려 주기.
- [ ] **심사위원 링크 만들기** — `.env`의 `MYTHOS_DEMO_CODES` 값을 `<서비스 주소>/?demo=` 뒤에 붙인 링크를 제출서에 넣는다(지금 바로 동작).

- [x] **심사위원 데모 코드** (2026-10-19 에이전트가 생성해 `.env`에 넣음) — 로그인 없이도 AI 대사가 켜지는 링크(`<서비스 주소>/?demo=<코드>`). `.env`에 `MYTHOS_DEMO_CODES=<6자 이상 코드>`를 넣고 에이전트에게 "미리보기 배포"를 요청하면 배포 → 검증 → 승격까지 한다. 기기당 무료 한도만 쓰고, 세이브·순위표는 여전히 로그인이 필요하다. 코드를 바꾸면 옛 링크는 작가 대사로 돌아간다.
- [ ] **제출 영문 소개서** — `docs/contest/pitch-en.md`(초안 완료). 대회 양식에 맞게 붙여 넣기.

## 3. 귀와 눈으로 판단하기 (에이전트가 추천안으로 선반영 완료 — 선택 확인)

- [x] **효과음 4묶음 개선 완료** — 겹치거나 작았던 효과음(`hit_light`/`bump`/`explosion`, `kill`/`void`, `swing`, `alarm`)을 분리·보강 완료(`sfx.ts`). 원할 때 `outputs/sfx-review/index.html`에서 들어보고 어색한 것만 알려 주면 된다.
- [x] **트레일러 자막·보이스 타이밍 재편집 완료** — `veo/haetae` 보스 자막 추가 및 `06_ix_win` 타이밍(`59.8s`) 보정 후 로컬 무료 `ffmpeg` 재편집 완료(`outputs/trailer/cinematic/mythos2_cinematic_photo.mp4`). 추가 영상 클립이 필요할 때는 Veo API 대신 `docs/test/veo_gemini_owner_guide.md`를 따라 Gemini 웹에서 직접 생성.
- [x] **보이스 배역 추천안 고정 완료** — `resources/neo-seoul/v2/voice/voices.json`에 한/영 8배역 추천 보이스를 고정 완료(`pin.py`). 변경하고 싶으면 `outputs/voice-auditions/index.html`에서 고른 뒤 알려 주면 된다(실제 일괄 TTS 생성은 ElevenLabs 유료 호출이므로 오너 지시 후 실행).

## 4. 기타

- [x] **`git push`** — 2026-10-18 `mythos-2.0`을 `origin/main`에 fast-forward로 push.
- [ ] (선택) **AI 단가** — Google 정가를 알게 되면 `.env`의 `MYTHOS_GM_PRICE_*`로 맞춘다. 지금은 보수적인 기본값.
- [ ] (선택) **다른 프로젝트 비용** — `claude-study-501117`의 `agent-chief`가 최소 인스턴스 1로 상시 켜져 월 약 ₩4,300. 0으로 낮출지 결정.

## 참고: 이미 걸려 있는 안전장치

- Vertex 월 ₩30,000(크레딧 차감 후) 넘으면 AI API 자동 차단, 다음 달 자동 해제 — 11월부터 적용.
- 플레이어별 월 AI 한도(무료 $0.30, Signal+ $1.50)와 전체 하루 $20 상한(타임아웃된 백그라운드 호출 토큰까지 정밀 차감). 오너 계정은 개인 한도 없음.
- **Veo(영상) API 호출은 코드·Makefile에서 전면 차단됨**(`scripts/trailer/gen_veo.py`). 추가 영상은 오너가 Gemini 웹에서 프롬프트로 직접 생성(`docs/test/veo_gemini_owner_guide.md`).
