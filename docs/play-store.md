# Google Play submission sheet

Last updated: 2026-11-06

Canonical release sequence, owners, gates and policy sources: [Play Store release plan](plans/2026-11-05-play-store-release-plan.md). The 2026-10-18 launch hold remains; planning does not activate a release. Recommended sequence: free app testing/release first, Signal+ later after billing and revocation verification.

This is a **draft submission worksheet**, not a set of pre-approved Console answers. Reconcile every answer with the final Android candidate and its SDKs. Build instructions: `docs/android.md`. Historical browser fixtures remain under `outputs/play-store/`. Current identified Android debug drafts are in `outputs/play-store-2026-11-06/`; see the [graphics audit](plans/2026-11-06-store-listing-audit.md). They still require final signed-candidate review.

## Owner steps, in order

1. Resume scope: confirm free-first approach, account type/creation date, initial countries, developer identity and support contact. Follow G0–G7 in the release plan; account-dependent testing rules must be checked in Console.
2. Supply upload-key/signing setup and support contact. Production `/privacy` and `/account-deletion` already return 200 (11-05); neither currently exposes a mailto contact. Verify the external deletion path and test in-app deletion with a dedicated account before submission.
3. Build and validate a signed candidate with an unused increasing `VERSION_CODE`, Play signing certificates, device tests and compressed-download measurement. The local checker now uses bundletool compressed-download estimates; final Console acceptance is still required.
4. Create/configure the app and complete policy, review-access and listing forms below, then Internal → Closed testing → production-access application (if required) → review → owner publication.
5. Keep Signal+ product activation out of the free release critical path. Merchant/profile, product, Play service-account permissions and license-tester cases belong to phase B in the release plan.

## App details

| Field | Value |
| --- | --- |
| App name (ko, ≤ 30) | `세계:접속 — MYTHOS 시그널 런` |
| App name (en, ≤ 30) | `MYTHOS: Signal Run` |
| Category | Game → Strategy (tags: Roguelike, Deck-building, Turn-based tactics, Cyberpunk) |
| Price | Free download, no ads; Signal+ is a later, separately verified release |
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
> 245장의 프로토콜 카드와 76종의 임플란트. 같은 계열 임플란트를 모으면 세트 보너스가 열립니다. 저마다 사연과 전투 패시브를 가진 동료 14명과 유대를 쌓으면 전용 카드와 기억 장면이 열립니다.
>
> ■ 기본 3막과 확장 경로
> C-17 블랙아웃, 야시장 하층, ARK 첨탑. 전투, 엘리트, 사건, 암시장, 휴식처를 골라 길을 짜고 보스 해태, 잔향 포식자, 그리고 관리자 IX와 맞서세요. 기본 3막 너머에는 Deep Signal과 The Unwritten Sea의 6막 경로가 이어집니다.
>
> ■ 선택에는 대가가 있다
> 337개의 사건에서 비용과 보상, 성공 확률이 먼저 보입니다. 정해진 선택지 밖의 행동을 직접 입력할 수도 있습니다. 추적도가 오르면 IX의 감시가 조여 옵니다.
>
> ■ 아카이브와 매일의 신호
> 루프가 끝나도 에코는 남습니다. 아키타입, 동료, 카드 팩, 영구 강화를 해금하고 패러독스 난이도 1~10에 도전하세요. 매일 바뀌는 오늘의 시드로 전 세계 플레이어와 같은 판을 겨룹니다.
>
> ■ 막지 않는 AI GM
> Google로 로그인하면 클라우드 저장, 오늘의 시드 순위표와 함께 AI가 쓰는 GM 내레이션, 동료 대화, IX 통신이 켜집니다. 작성된 대사가 항상 먼저 뜨고 AI 대사는 그 위에 얹힐 뿐이라 게임을 기다리게 하지 않습니다. 불쾌한 AI 대사는 게임 안에서 바로 신고할 수 있습니다.
>
> 로그인하지 않아도 처음부터 끝까지 오프라인으로 플레이할 수 있습니다. 광고는 없습니다. 일반 런에서는 구역을 탐색하고 d20 대화 판정을 할 수 있습니다. AI 대사는 로그인과 사용 한도에 따라 제공됩니다. 한국어와 영어를 지원합니다.

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
> 245 protocol cards and 76 implants, with set bonuses for implants of the same family. Fourteen companions, each with a story and a combat passive; build bonds to unlock their personal cards and memory scenes.
>
> ■ Three core acts and expanded routes
> C-17 Blackout, the Undercity Market, the ARK Spire. Plot your route through fights, elites, events, black markets and safehouses, then face the bosses HAETAE, the Echo Eater and Administrator IX. Deep Signal and The Unwritten Sea extend the journey through six acts.
>
> ■ Every choice has a price
> 337 events show their cost, reward and odds up front, and you can type your own action outside the listed options. Raise your trace and IX's surveillance closes in.
>
> ■ The Archive and the Daily Signal
> Echoes outlast every loop. Unlock archetypes, companions, card packs and permanent upgrades, and climb Paradox 1–10. A new Daily Signal seed each day puts every player on the same run.
>
> ■ An AI GM that never makes you wait
> Sign in with Google for cloud saves, the daily leaderboard and AI-written GM narration, companion chat and IX comms. Authored lines always appear first and AI lines only add to them. You can report any AI line from inside the game.
>
> Play the whole game offline without signing in. No ads. Explore districts and resolve d20 dialogue in normal runs. AI-written lines require sign-in and are subject to usage limits. Korean and English.

## Graphics (`outputs/play-store-2026-11-06/`)

| Asset | File | Validated export |
| --- | --- | --- |
| App icon | `icon-512.png` | 512×512, 32-bit RGBA PNG, 105,053 bytes |
| Feature graphic | `feature-ko.png`, `feature-en.png` | 1024×500 RGB PNG; existing candidate art/fonts |
| Phone screenshot drafts | `shots/ko/*.png`, `shots/en/*.png` (5 captured, 4 selected each) | 1920×1080 RGB PNG, actual identified Android debug app |

Order: combat → map/directive → event choices → character setup (held for recapture) → title. Lead with the first three gameplay frames. The title contains a daily date; refresh it before upload. `manifest.json` records hashes and localized alt text. Review bundle: `outputs/play-store-review-2026-11-06.zip` (11 selected images plus manifest/README). Preserve raw captures and candidate identity separately from upload files. The [audit](plans/2026-11-06-store-listing-audit.md) records provenance, visual limits and final-candidate checks.

[Google's current specification](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) distinguishes the RGBA icon from RGB feature/screenshots. Dimensions alone do not qualify a game for promotion. `scripts/android/store_assets.py --only shots` produces browser fixtures, not native candidate evidence. Do not use historical browser images as final Android screenshots.

Optional video remains historical: `outputs/trailer/cinematic/mythos2_cinematic_store.mp4`. Review against the release before any YouTube publication or listing use.

## App content answers

**App access — draft requiring verification**: offline play is unrestricted, but cloud saves, leaderboard posting and AI require Google sign-in. Supply English reviewer access instructions and reusable access resources for every restricted feature; validate them on the actual Play-installed Android app. A web demo link alone is insufficient. The [data and review audit](plans/2026-11-05-play-data-and-review-audit.md) contains English instructions, required private account resources and an acceptance record; none is yet device-accepted.

**Ads**: no ads.

**Target audience**: 13–15, 16–17, 18+ (not under 13; the policy page says so). It does not appeal to children, so
it is not in the Families program.

**Content rating (IARC questionnaire)**, category Game. The table below is a historical draft from before the expansion; re-audit all current text/images and let the questionnaire determine the rating. Do not submit these answers unchanged.

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
| Shares location, digital purchases | No location sharing; digital purchases only in the later Signal+ release |
| AI-generated content | Yes: GM narration, companion replies and IX lines. Output is constrained by system prompts, has authored fallbacks, and can be reported in-app (Settings → AI 대사 신고, plus inline flags) |

**Data safety — code-audited draft, still blocked for submission.** Use the [data inventory and evidence](plans/2026-11-05-play-data-and-review-audit.md), which supersedes the old answer table. The audit identifies actual SDK versions, per-data purposes/optional status, D1–D8 gaps and reviewer acceptance checks.

- Firebase Auth collects account attributes; the game hash ID is pseudonymous. SDK collection counts even when the game DB never receives the value.
- Crashlytics is default-on with a Settings opt-out. Native automatic-upload disabling applies on the next app run; unsent device reports can remain and may send after re-enable. [Offline diagnostics evidence](plans/2026-11-05-crash-offline-acceptance.md); connected delivery/deletion is not proven. The notification switch controls registration and topic cleanup; connected deletion/renewal is locally verified, but cleanup itself can temporarily create/transmit identifiers. Do not mark every SDK identifier optional based on that switch; see the D1 connected acceptance record.
- AI inputs include companion/NPC messages, improvised actions and selected past context. Full comms logs stay local, but selected text can be sent again and generated game/chronicle content can be saved. Provider retention remains unverified; do not declare everything ephemeral.
- Reports are pruned after 90 days **on the next report insertion**, not by a scheduled expiry. Cloud Logging global `_Default=30 days` and `_Required=400 days` were verified on 11-05; other retention scopes remain open.
- Sharing exceptions, SDK-derived location, transport and account deletion require final candidate/provider checks. No advertising/location permissions does not prove that SDKs collect no derived data. Do not submit a blanket “nothing shared” or “all data optional.”

**Account deletion**: in-app deletion removes saves, history, daily rows, AI spend and entitlements, then separately attempts Firebase account deletion. A successful game-data deletion can still return `sign_in_record_deleted=false`; it does not cancel a Play subscription or remove local progress. The current public policy's unconditional immediate deletion wording must be corrected and the dedicated-account/end-to-end result verified. Developer contact and external deletion handling are still missing acceptance evidence.

**Other declarations**: not a news app, no health or COVID features, not a government app, no financial features
(Signal+ purchases apply only to the later billing-enabled release). The
app requests the notification permission (daily reminder) and the internet.
