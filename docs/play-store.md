# Google Play submission sheet

Last updated: 2026-10-14

Everything Play Console asks for on the first release, prepared so the owner only has to paste and upload. The build
side is in `docs/android.md` ("Release"). Graphics come from `scripts/android/store_assets.py` (real game screens,
headless and muted) into `outputs/play-store/`, which is gitignored. Rebuild them after UI changes.

## Owner steps, in order

1. **Developer account** ($25, identity check takes days). A *personal* account created after Nov 2023 must run a
   **closed test with at least 12 opted-in testers for 14 days in a row** before it can apply for production. Check
   the current number in Console. Start recruiting testers now (Firebase App Distribution testers can be reused).
2. **Contact email on the policy pages**: put `MYTHOS_CONTACT_EMAIL=<email>` (and optionally `MYTHOS_DEVELOPER_NAME`)
   in `.env`, then `make deploy-preview` → `make verify-preview` → promote. Until a deploy carries the new code,
   `/privacy` and `/account-deletion` do not exist on production.
3. **Sign-in record deletion**: grant the Cloud Run service account the right to delete Firebase users (else
   in-app deletion erases the game data but leaves the sign-in record for manual removal):
   `gcloud projects add-iam-policy-binding <PROJECT_ID> --member=serviceAccount:mythos-run@<PROJECT_ID>.iam.gserviceaccount.com --role=roles/firebaseauth.admin --condition=None`
4. **Create the app**: name below, default language Korean (ko-KR), Game, Free. Package `com.projectmythos.signalrun`
   (permanent after the first upload).
5. Fill **App content** with the answers below: privacy policy, app access, ads, content rating, target audience,
   data safety, and account deletion.
6. **Store listing**: paste the texts below (ko-KR default + en-US translation) and upload the graphics.
7. **Signal+ subscription** (`docs/online.md` "AI budget and Signal+"): Monetize → Subscriptions → create
   `signal_plus_monthly` (one base plan, monthly auto-renew, ₩3,900 default). Users and permissions → invite the Cloud
   Run service account `mythos-run@<PROJECT_ID>.iam.gserviceaccount.com` with "View financial data" and "Manage orders
   and subscriptions" for this app (the server verifies and acknowledges purchases with it). Add a license tester to
   buy without being charged. A Play merchant (payments) profile is required before the product can be activated.
8. **Internal testing** → upload `VERSION_CODE=1 make android-aab` output, register the upload-key and the Play
   app-signing SHA-1 in Firebase (`make firebase-sha`), then **closed testing** with the testers from step 1.

## App details

| Field | Value |
| --- | --- |
| App name (ko, ≤ 30) | `세계:접속 — MYTHOS 시그널 런` |
| App name (en, ≤ 30) | `MYTHOS: Signal Run` |
| Category | Game → Strategy (tags: Roguelike, Deck-building, Turn-based tactics, Cyberpunk) |
| Price | Free download with an optional subscription (Signal+, in-app purchase); no ads |
| Privacy policy URL | `https://mythos-api-k62nky5rrq-uc.a.run.app/privacy` |
| Account deletion URL | `https://mythos-api-k62nky5rrq-uc.a.run.app/account-deletion` |
| Website | `https://mythos-api-k62nky5rrq-uc.a.run.app/` (the web version) |
| Contact email | the owner's (also set as `MYTHOS_CONTACT_EMAIL`) |

## Store listing text

### ko-KR (default)

**간단한 설명** (≤ 80)

> 적이 칠 칸이 먼저 보인다. 덱과 동료로 판을 뒤집는 사이버펑크 전술 로그라이트.

**자세한 설명** (≤ 4000)

> 관리자 AI IX가 다스리는 네오서울. 지워지기 전에, 도시의 끝까지 달려라.
>
> 세계:접속은 예고형 전술 전투와 덱빌딩 로그라이트를 합친 싱글플레이 게임입니다. 적은 다음에 칠 칸을 미리 보여 줍니다. 피하고, 막고, 밀쳐서 적끼리 부딪히게 하고, 붕괴 구역으로 떨어뜨리세요. 모든 클릭은 결과가 보이는 결정입니다.
>
> ■ 7×5 보드 위의 전술 전투
> 근접, 직선탄, 관통 광선, 돌진, 포격, 피할 수 없는 추적 조준까지. 예고를 읽고 카드 한 장으로 판을 뒤집으세요. 불길과 전기 바닥, 엄폐물과 충돌 피해가 모두 무기가 됩니다.
>
> ■ 덱, 임플란트, 동료
> 104장의 프로토콜 카드와 44종의 임플란트. 같은 계열 임플란트를 모으면 세트 보너스가 열립니다. 저마다 사연과 전투 패시브를 가진 동료 6명과 유대를 쌓으면 전용 카드와 기억 장면이 열립니다.
>
> ■ 3막의 작전 지도
> C-17 블랙아웃, 야시장 하층, ARK 첨탑. 전투, 엘리트, 사건, 암시장, 휴식처를 골라 길을 짜고 보스 해태, 잔향 포식자, 그리고 관리자 IX와 맞서세요. 엔딩은 네 가지입니다.
>
> ■ 선택에는 대가가 있다
> 68개의 사건마다 비용과 보상, 성공 확률이 먼저 보입니다. 정해진 선택지 밖의 행동을 직접 입력할 수도 있습니다. 추적도가 오르면 IX의 감시가 조여 옵니다.
>
> ■ 아카이브와 매일의 신호
> 루프가 끝나도 에코는 남습니다. 아키타입, 동료, 카드 팩, 영구 강화를 해금하고 패러독스 난이도 1~5에 도전하세요. 매일 바뀌는 오늘의 시드로 전 세계 플레이어와 같은 판을 겨룹니다.
>
> ■ 막지 않는 AI GM
> Google로 로그인하면 클라우드 저장, 오늘의 시드 순위표와 함께 AI가 쓰는 GM 내레이션, 동료 대화, IX 통신이 켜집니다. 작성된 대사가 항상 먼저 뜨고 AI 대사는 그 위에 얹힐 뿐이라 게임을 기다리게 하지 않습니다. 불쾌한 AI 대사는 게임 안에서 바로 신고할 수 있습니다.
>
> 로그인하지 않아도 처음부터 끝까지 오프라인으로 플레이할 수 있습니다. 광고는 없습니다. 선택 구독 Signal+는 구역 탐색·d20 대화·NPC와의 자유 대화 같은 CRPG 층과 더 많은 AI 대사를 엽니다(오늘의 시드는 모두에게 같습니다). 한국어와 영어를 지원합니다.

### en-US

**Short description** (≤ 80)

> See every enemy strike coming. Turn the board with your deck in cyberpunk Seoul.

**Full description** (≤ 4000)

> Neo-Seoul, run by the administrator AI IX. Run the city end to end before it erases you.
>
> MYTHOS: Signal Run is a single-player tactics deck-builder roguelite. Enemies show you exactly which tiles they will hit next. Dodge, block, shove them into each other and push them into the void. Every click is a decision whose outcome you can see.
>
> ■ Tactics on a 7×5 board
> Melee, line shots, piercing beams, charges, artillery and unavoidable lock-ons. Read the telegraphs and flip the fight with a single card. Fire, live wire, cover and collision damage are all weapons.
>
> ■ Deck, implants, companions
> 104 protocol cards and 44 implants, with set bonuses for implants of the same family. Six companions, each with a story and a combat passive; build bonds to unlock their personal cards and memory scenes.
>
> ■ A three-act map
> C-17 Blackout, the Undercity Market, the ARK Spire. Plot your route through fights, elites, events, black markets and safehouses, then face the bosses HAETAE, the Echo Eater and Administrator IX. Four endings.
>
> ■ Every choice has a price
> 68 events show their cost, reward and odds up front, and you can type your own action outside the listed options. Raise your trace and IX's surveillance closes in.
>
> ■ The Archive and the Daily Signal
> Echoes outlast every loop. Unlock archetypes, companions, card packs and permanent upgrades, and climb Paradox 1–5. A new Daily Signal seed each day puts every player on the same run.
>
> ■ An AI GM that never makes you wait
> Sign in with Google for cloud saves, the daily leaderboard and AI-written GM narration, companion chat and IX comms. Authored lines always appear first and AI lines only add to them. You can report any AI line from inside the game.
>
> Play the whole game offline without signing in. No ads. The optional Signal+ subscription opens a CRPG layer — districts, d20 dialogue, free talk with NPCs — and more AI-written lines (the Daily Signal is the same for everyone). Korean and English.

## Graphics (`outputs/play-store/`)

| Asset | File | Play spec |
| --- | --- | --- |
| App icon | `icon-512.png` | 512×512 PNG, no alpha |
| Feature graphic | `feature-ko.png` (ko), `feature-en.png` (en) | 1024×500, no alpha |
| Phone screenshots | `shots/ko/*.png`, `shots/en/*.png` (7 each) | 2–8 per language, 16:9 1920×1080 qualifies for promotion |

Screenshot order: 01 HAETAE boss fight, 02 the Incinerator elite (burning ground), 03 map, 04 event with odds,
05 companion bond scene, 06 IX's offer, 07 title. Promo video (optional, a YouTube link):
`outputs/trailer/cinematic/mythos2_cinematic_store.mp4`, uploaded to YouTube first.

## App content answers

**App access**: all functionality is available without special access. Sign-in is optional and works with any Google
account; nothing needs a test login.

**Ads**: no ads.

**Target audience**: 13–15, 16–17, 18+ (not under 13; the policy page says so). It does not appeal to children, so
it is not in the Families program.

**Content rating (IARC questionnaire)**, category Game. The expected outcome is a mid-teen rating (Teen / PEGI 12 /
GRAC 12), but the questionnaire decides.

| Question area | Answer |
| --- | --- |
| Violence | Yes: fantasy/sci-fi combat against drones, machines and armed enforcers on a tactical board. Not realistic, no gore or dismemberment. A few text lines mention blood (a wound, a knife-game wager) |
| Fear | Mild: a dark cyberpunk setting and an AI antagonist. No horror imagery |
| Sexuality, nudity | No |
| Language | No profanity in authored text |
| Controlled substances | Tobacco: one text reference (a character stubs out a cigarette). "Stims" are sci-fi combat items, not drugs. No alcohol or drug use |
| Gambling | No real-money or simulated casino gambling. One narrative event is a wager paid in in-game credits |
| Crude humour, discrimination | No |
| User interaction | Users do not chat with each other. A display name the player chooses is shown on the public daily leaderboard (names are cleaned and capped at 16 characters) |
| Shares location, digital purchases | No; yes — an optional monthly subscription (Signal+) |
| AI-generated content | Yes: GM narration, companion replies and IX lines. Output is constrained by system prompts, has authored fallbacks, and can be reported in-app (Settings → AI 대사 신고, plus inline flags) |

**Data safety** (all "collected" items: encrypted in transit, not shared with third parties, deletion on request).

| Data type | Collected | Optional | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Personal info → Email address | Yes | Yes (sign-in is optional) | Account management | Firebase Authentication; the game server never stores it |
| Personal info → Name | Yes | Yes | Account management, App functionality | Google display name (Firebase Auth); the player-chosen display name on the leaderboard |
| Personal info → User IDs | Yes | Yes | Account management, App functionality | Firebase uid; the server keys data by a one-way hash of it |
| Personal info → Other info | Yes | Yes | Account management | Google profile photo URL (Firebase Auth) |
| App activity → Other user-generated content | Yes | Yes | App functionality | Companion chat messages: sent to Vertex AI to write the reply, processed ephemerally, not stored. Reported AI lines: stored 90 days without a user id |
| App activity → Other actions | Yes | Yes | App functionality | Game progress, run history, daily leaderboard results (cloud saves) |
| App info and performance → Crash logs, Diagnostics | Yes | Yes (Settings toggle) | Analytics | Firebase Crashlytics: stack, device model, OS/app version |
| Device or other IDs | Yes | Yes | Analytics, App functionality | Crashlytics installation id; the FCM push token, held by Firebase |
| Financial info → Purchase history | Yes | Yes (only with Signal+) | App functionality | Play purchase token, product, subscription state and expiry, to grant Signal+; payment details stay with Google Play |

- Is all user data encrypted in transit? **Yes** (HTTPS).
- Can users request deletion? **Yes**: in-app (Settings → 계정 삭제) and the account-deletion URL.
- Location, contacts, photos, files, audio, health, messages, web history, installed apps: **not collected**.
- Server access logs (IP, user agent) live in Cloud Logging for 30 days for security. Play does not require
  declaring IP addresses unless they are used for location; state it if Console asks.

**Account deletion**: the URL above. In the app: Settings → 계정 삭제 → 영구 삭제. This deletes saves, run history,
leaderboard rows and the Firebase sign-in record. Kept: access logs (30 days), crash reports (90 days), anonymous
AI-call counts and reported lines.

**Other declarations**: not a news app, no health or COVID features, not a government app, no financial features
(the only purchase is the Signal+ subscription through Google Play Billing). The
app requests the notification permission (daily reminder) and the internet.
