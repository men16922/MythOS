# 오너 할 일

마지막 정리: 2026-10-18

에이전트가 대신할 수 없는 일만 모았다(계정, 결제, 권한, 귀와 눈으로 판단하는 일). 끝낸 항목은 체크하고 에이전트에게 "OO 끝났어"라고 말하면 다음 단계를 이어서 한다. 상세 근거는 `docs/NEXT_PLAN.md`, `docs/play-store.md`.

## 1. Play 스토어 출시 (가장 오래 걸림 — 먼저 시작)

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

## 2. Signal+ 구독 (계정 생긴 뒤)

- [ ] **사업자등록 + 통신판매업 신고** — 인앱 구매(구독)를 파는 한국 개발자는 Play Console '업체 문의 연락처'에 사업자등록번호·통신판매 신고번호·신고 기관을 넣어야 한다(무료 배포만이면 불필요). 홈택스에서 사업자등록 → 정부24에서 통신판매업 신고.
- [ ] **판매자(결제) 프로필** 만들기 — 없으면 구독 상품을 활성화할 수 없다.
- [ ] **구독 상품** — 수익 창출 → 구독 → `signal_plus_monthly`, 기본 요금제 1개, 월 자동 갱신, ₩3,900.
- [ ] **서비스 계정 초대** — 사용자 및 권한 → `mythos-run@<PROJECT_ID>.iam.gserviceaccount.com`, 이 앱에 "재무 데이터 보기" + "주문 및 구독 관리". 서버가 이 계정으로 구매를 확인한다.
- [ ] **라이선스 테스터** 추가 후 기기에서 한 번 구매 → 에이전트에게 알려 주면 서버에서 Signal+로 잡히는지 확인한다.

## 3. 귀와 눈으로 판단하기 (각 10분 내외)

- [ ] **효과음 4묶음 듣기** — `outputs/sfx-review/index.html`. 무엇을 들을지는 `docs/test/sfx_trailer_prereview.md` "효과음". 묶음별로 정상/문제만 말해 주면 된다.
- [ ] **트레일러 3곳 보기** — `outputs/trailer/cinematic/` 두 영상. 볼 곳은 같은 문서 "트레일러". 문제라고 하면 재편집(무료)한다. 다시 녹음하는 한 줄만 유료.
- [ ] **보이스 배역 고르기** — `outputs/voice-auditions/index.html`에서 배역마다 하나씩 고르면 명령이 만들어진다. 그 명령(`scripts/voice-gen/pin.py ...`)을 실행하거나 결과를 에이전트에게 붙여 주면 보이스를 일괄 생성한다.

## 4. 기타

- [x] **`git push`** — 2026-10-18 `mythos-2.0`을 `origin/main`에 fast-forward로 push.
- [ ] (선택) **AI 단가** — Google 정가를 알게 되면 `.env`의 `MYTHOS_GM_PRICE_*`로 맞춘다. 지금은 보수적인 기본값.
- [ ] (선택) **다른 프로젝트 비용** — `claude-study-501117`의 `agent-chief`가 최소 인스턴스 1로 상시 켜져 월 약 ₩4,300. 0으로 낮출지 결정.

## 참고: 이미 걸려 있는 안전장치

- Vertex 월 ₩30,000(크레딧 차감 후) 넘으면 AI API 자동 차단, 다음 달 자동 해제 — 11월부터 적용.
- 플레이어별 월 AI 한도(무료 $0.30, Signal+ $1.50)와 전체 하루 $20 상한. 오너 계정은 개인 한도 없음.
- Veo(영상)는 큰 비용이라 에이전트가 쓰기 전에 항상 먼저 묻는다.
